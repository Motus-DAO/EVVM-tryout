// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../core/MotusNameService.sol";

/**
 * @title PatientRecords
 * @notice Secure patient health records management on EVVM
 * @dev Implements access control and audit trails for healthcare data
 */
contract PatientRecords is AccessControl, ReentrancyGuard {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant NURSE_ROLE = keccak256("NURSE_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    // Patient record structure
    struct PatientRecord {
        address patient;
        string recordHash; // IPFS hash or encrypted data reference
        string recordType; // e.g., "diagnosis", "prescription", "lab_result"
        address createdBy; // Healthcare provider who created the record
        uint256 timestamp;
        string metadata; // JSON string for additional info
        bool active;
    }

    // Mapping from patient address to records
    mapping(address => PatientRecord[]) public patientRecords;
    
    // Mapping from record ID to record
    mapping(uint256 => PatientRecord) public records;
    
    // Record access log for audit trail
    struct AccessLog {
        address accessedBy;
        uint256 timestamp;
        string reason;
    }
    
    mapping(uint256 => AccessLog[]) public accessLogs;
    
    // Patient consent management
    struct Consent {
        address provider;
        bool granted;
        uint256 grantedAt;
        uint256 expiresAt;
        string scope; // e.g., "read", "write", "full"
    }
    
    mapping(address => mapping(address => Consent)) public consents; // patient => provider => consent

    // Events
    event RecordCreated(
        uint256 indexed recordId,
        address indexed patient,
        address indexed createdBy,
        string recordType,
        string recordHash
    );
    
    event RecordAccessed(
        uint256 indexed recordId,
        address indexed accessedBy,
        string reason
    );
    
    event ConsentGranted(
        address indexed patient,
        address indexed provider,
        string scope,
        uint256 expiresAt
    );
    
    event ConsentRevoked(
        address indexed patient,
        address indexed provider
    );

    uint256 private recordCounter;
    MotusNameService public nameService;

    constructor(address _nameService) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        nameService = MotusNameService(_nameService);
    }

    /**
     * @notice Create a new patient record
     * @param patient The patient's address
     * @param recordHash IPFS hash or encrypted data reference
     * @param recordType Type of record (e.g., "diagnosis", "prescription")
     * @param metadata Additional metadata as JSON string
     */
    function createRecord(
        address patient,
        string memory recordHash,
        string memory recordType,
        string memory metadata
    ) external nonReentrant {
        require(
            hasRole(DOCTOR_ROLE, msg.sender) || 
            hasRole(NURSE_ROLE, msg.sender) || 
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to create records"
        );
        
        // Check consent if not admin
        if (!hasRole(ADMIN_ROLE, msg.sender)) {
            require(
                hasConsent(patient, msg.sender, "write") || 
                hasConsent(patient, msg.sender, "full"),
                "No consent to create records"
            );
        }
        
        uint256 recordId = recordCounter++;
        
        PatientRecord memory newRecord = PatientRecord({
            patient: patient,
            recordHash: recordHash,
            recordType: recordType,
            createdBy: msg.sender,
            timestamp: block.timestamp,
            metadata: metadata,
            active: true
        });
        
        records[recordId] = newRecord;
        patientRecords[patient].push(newRecord);
        
        emit RecordCreated(recordId, patient, msg.sender, recordType, recordHash);
    }

    /**
     * @notice Access a patient record (logs access for audit)
     * @param recordId The record ID to access
     * @param reason Reason for access
     * @return record The patient record
     */
    function accessRecord(
        uint256 recordId,
        string memory reason
    ) external nonReentrant returns (PatientRecord memory) {
        PatientRecord memory record = records[recordId];
        require(record.active, "Record not found or inactive");
        
        // Check authorization
        bool isAuthorized = 
            record.patient == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            (hasRole(DOCTOR_ROLE, msg.sender) && hasConsent(record.patient, msg.sender, "read")) ||
            (hasRole(NURSE_ROLE, msg.sender) && hasConsent(record.patient, msg.sender, "read"));
        
        require(isAuthorized, "Not authorized to access this record");
        
        // Log access
        accessLogs[recordId].push(AccessLog({
            accessedBy: msg.sender,
            timestamp: block.timestamp,
            reason: reason
        }));
        
        emit RecordAccessed(recordId, msg.sender, reason);
        
        return record;
    }

    /**
     * @notice Grant consent to a healthcare provider
     * @param provider The provider address
     * @param scope Consent scope ("read", "write", "full")
     * @param duration Duration in seconds (0 for permanent)
     */
    function grantConsent(
        address provider,
        string memory scope,
        uint256 duration
    ) external {
        uint256 expiresAt = duration > 0 ? block.timestamp + duration : type(uint256).max;
        
        consents[msg.sender][provider] = Consent({
            provider: provider,
            granted: true,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            scope: scope
        });
        
        emit ConsentGranted(msg.sender, provider, scope, expiresAt);
    }

    /**
     * @notice Revoke consent from a healthcare provider
     * @param provider The provider address
     */
    function revokeConsent(address provider) external {
        consents[msg.sender][provider].granted = false;
        emit ConsentRevoked(msg.sender, provider);
    }

    /**
     * @notice Check if consent exists and is valid
     * @param patient The patient address
     * @param provider The provider address
     * @param requiredScope Required scope
     * @return hasPermission True if consent is valid
     */
    function hasConsent(
        address patient,
        address provider,
        string memory requiredScope
    ) public view returns (bool) {
        Consent memory consent = consents[patient][provider];
        
        if (!consent.granted) {
            return false;
        }
        
        if (block.timestamp >= consent.expiresAt) {
            return false;
        }
        
        // Check scope
        if (keccak256(bytes(consent.scope)) == keccak256(bytes("full"))) {
            return true;
        }
        
        return keccak256(bytes(consent.scope)) == keccak256(bytes(requiredScope));
    }

    /**
     * @notice Get all records for a patient
     * @param patient The patient address
     * @return An array of patient records
     */
    function getPatientRecords(address patient) external view returns (PatientRecord[] memory) {
        require(
            patient == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            hasConsent(patient, msg.sender, "read"),
            "Not authorized"
        );
        
        return patientRecords[patient];
    }

    /**
     * @notice Get access logs for a record (audit trail)
     * @param recordId The record ID
     * @return An array of access logs
     */
    function getAccessLogs(uint256 recordId) external view returns (AccessLog[] memory) {
        PatientRecord memory record = records[recordId];
        require(
            record.patient == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender),
            "Not authorized to view access logs"
        );
        
        return accessLogs[recordId];
    }

    /**
     * @notice Deactivate a record (soft delete for compliance)
     * @param recordId The record ID
     */
    function deactivateRecord(uint256 recordId) external {
        PatientRecord storage record = records[recordId];
        require(record.active, "Record already inactive");
        require(
            record.patient == msg.sender ||
            hasRole(ADMIN_ROLE, msg.sender) ||
            record.createdBy == msg.sender,
            "Not authorized to deactivate"
        );
        
        record.active = false;
    }

    /**
     * @notice Register healthcare provider using Motus name
     * @param nameHash The Motus name hash
     */
    function registerProvider(bytes32 nameHash) external {
        MotusNameService.Domain memory domain = nameService.getDomain(nameHash);
        require(domain.active, "Invalid Motus domain");
        require(domain.owner == msg.sender, "Not domain owner");
        
        // Grant doctor role to domain owner
        _grantRole(DOCTOR_ROLE, msg.sender);
    }
}

