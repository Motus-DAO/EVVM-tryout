// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../storage/WalrusStorage.sol";

/**
 * @title HL7FHIRAdapter
 * @notice Adapter for HL7 FHIR (Fast Healthcare Interoperability Resources) standards
 * @dev Ensures healthcare data is stored in interoperable formats
 *      Supports FHIR R4 standard for healthcare data exchange
 */
contract HL7FHIRAdapter is AccessControl {
    // FHIR Resource types
    enum FHIRResourceType {
        Patient,
        Observation,
        Condition,
        Medication,
        Procedure,
        Encounter,
        DiagnosticReport,
        DocumentReference
    }

    // FHIR Resource structure
    struct FHIRResource {
        FHIRResourceType resourceType;
        string resourceId; // FHIR resource ID
        uint256 storageRecordId; // Reference to WalrusStorage
        bytes32 resourceHash; // Hash of the FHIR JSON
        address createdBy;
        uint256 createdAt;
        string version; // FHIR version (e.g., "4.0.1")
        bool active;
    }

    // Mapping from FHIR resource ID to resource
    mapping(string => FHIRResource) public fhirResources;
    
    // Mapping from patient address to their FHIR resources
    mapping(address => string[]) public patientResources;
    
    // Mapping from resource type to resources
    mapping(FHIRResourceType => string[]) public resourcesByType;

    WalrusStorage public walrusStorage;

    // Events
    event FHIRResourceCreated(
        string indexed resourceId,
        FHIRResourceType resourceType,
        uint256 storageRecordId,
        address indexed createdBy
    );
    
    event FHIRResourceUpdated(
        string indexed resourceId,
        uint256 newStorageRecordId,
        bytes32 newResourceHash
    );
    
    event FHIRResourceLinked(
        string indexed resourceId,
        address indexed patient
    );

    constructor(address _walrusStorage) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        walrusStorage = WalrusStorage(_walrusStorage);
    }

    /**
     * @notice Create a FHIR resource stored in Walrus
     * @param resourceType The FHIR resource type
     * @param resourceId The FHIR resource ID
     * @param walrusObjectId The Walrus object ID containing the FHIR JSON
     * @param resourceHash SHA-256 hash of the FHIR JSON
     * @param version FHIR version (e.g., "4.0.1")
     * @return The created FHIR resource
     */
    function createFHIRResource(
        FHIRResourceType resourceType,
        string memory resourceId,
        string memory walrusObjectId,
        bytes32 resourceHash,
        string memory version
    ) external returns (FHIRResource memory) {
        require(bytes(fhirResources[resourceId].resourceId).length == 0, "Resource ID already exists");
        
        // Create storage reference in Walrus
        string memory metadata = string(abi.encodePacked(
            '{"fhirVersion":"', version,
            '","resourceType":"', _resourceTypeToString(resourceType),
            '","format":"application/fhir+json"}'
        ));
        
        uint256 storageRecordId = walrusStorage.createWalrusReference(
            walrusObjectId,
            resourceHash,
            metadata
        );
        
        FHIRResource memory resource = FHIRResource({
            resourceType: resourceType,
            resourceId: resourceId,
            storageRecordId: storageRecordId,
            resourceHash: resourceHash,
            createdBy: msg.sender,
            createdAt: block.timestamp,
            version: version,
            active: true
        });
        
        fhirResources[resourceId] = resource;
        resourcesByType[resourceType].push(resourceId);
        
        emit FHIRResourceCreated(resourceId, resourceType, storageRecordId, msg.sender);
        
        return resource;
    }

    /**
     * @notice Link a FHIR resource to a patient address
     * @param resourceId The FHIR resource ID
     * @param patientAddress The patient's address
     */
    function linkResourceToPatient(
        string memory resourceId,
        address patientAddress
    ) external {
        FHIRResource memory resource = fhirResources[resourceId];
        require(bytes(resource.resourceId).length > 0, "Resource not found");
        require(resource.active, "Resource not active");
        
        // Check authorization (patient or authorized provider)
        require(
            patientAddress == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        patientResources[patientAddress].push(resourceId);
        
        emit FHIRResourceLinked(resourceId, patientAddress);
    }

    /**
     * @notice Get FHIR resource
     * @param resourceId The FHIR resource ID
     * @return The FHIR resource structure
     */
    function getFHIRResource(string memory resourceId) external view returns (FHIRResource memory) {
        return fhirResources[resourceId];
    }

    /**
     * @notice Get all FHIR resources for a patient
     * @param patientAddress The patient's address
     * @return An array of FHIR resource IDs
     */
    function getPatientResources(address patientAddress) external view returns (string[] memory) {
        require(
            patientAddress == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        return patientResources[patientAddress];
    }

    /**
     * @notice Get resources by type
     * @param resourceType The FHIR resource type
     * @return An array of FHIR resource IDs
     */
    function getResourcesByType(FHIRResourceType resourceType) external view returns (string[] memory) {
        return resourcesByType[resourceType];
    }

    /**
     * @notice Get storage reference for a FHIR resource
     * @param resourceId The FHIR resource ID
     * @return The storage reference from WalrusStorage
     */
    function getStorageReference(string memory resourceId) external view returns (WalrusStorage.StorageReference memory) {
        FHIRResource memory resource = fhirResources[resourceId];
        require(bytes(resource.resourceId).length > 0, "Resource not found");
        
        return walrusStorage.getStorageReference(resource.storageRecordId);
    }

    /**
     * @notice Update FHIR resource (create new version)
     * @param resourceId The FHIR resource ID
     * @param newWalrusObjectId New Walrus object ID
     * @param newResourceHash New resource hash
     */
    function updateFHIRResource(
        string memory resourceId,
        string memory newWalrusObjectId,
        bytes32 newResourceHash
    ) external {
        FHIRResource storage resource = fhirResources[resourceId];
        require(bytes(resource.resourceId).length > 0, "Resource not found");
        require(
            resource.createdBy == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        // Create new storage reference
        string memory metadata = string(abi.encodePacked(
            '{"fhirVersion":"', resource.version,
            '","resourceType":"', _resourceTypeToString(resource.resourceType),
            '","format":"application/fhir+json","previousVersion":"', 
            resource.resourceId, '"}'
        ));
        
        uint256 newStorageRecordId = walrusStorage.createWalrusReference(
            newWalrusObjectId,
            newResourceHash,
            metadata
        );
        
        resource.storageRecordId = newStorageRecordId;
        resource.resourceHash = newResourceHash;
        
        emit FHIRResourceUpdated(resourceId, newStorageRecordId, newResourceHash);
    }

    /**
     * @notice Deactivate a FHIR resource
     * @param resourceId The FHIR resource ID
     */
    function deactivateResource(string memory resourceId) external {
        FHIRResource storage resource = fhirResources[resourceId];
        require(bytes(resource.resourceId).length > 0, "Resource not found");
        require(
            resource.createdBy == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        
        resource.active = false;
    }

    // Internal helper functions

    function _resourceTypeToString(FHIRResourceType resourceType) private pure returns (string memory) {
        if (resourceType == FHIRResourceType.Patient) return "Patient";
        if (resourceType == FHIRResourceType.Observation) return "Observation";
        if (resourceType == FHIRResourceType.Condition) return "Condition";
        if (resourceType == FHIRResourceType.Medication) return "Medication";
        if (resourceType == FHIRResourceType.Procedure) return "Procedure";
        if (resourceType == FHIRResourceType.Encounter) return "Encounter";
        if (resourceType == FHIRResourceType.DiagnosticReport) return "DiagnosticReport";
        if (resourceType == FHIRResourceType.DocumentReference) return "DocumentReference";
        return "Unknown";
    }
}

