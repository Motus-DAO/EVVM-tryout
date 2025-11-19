// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title WalrusStorage
 * @notice Interface and registry for Walrus storage references
 * @dev Manages storage references to Walrus (Sui's decentralized storage)
 *      Supports interoperability with multiple storage backends
 */
contract WalrusStorage is AccessControl {
    // Storage reference structure
    struct StorageReference {
        StorageBackend backend; // Which storage backend
        string storageRef; // Walrus object ID or IPFS hash
        bytes32 contentHash; // SHA-256 hash for verification
        address uploadedBy;
        uint256 uploadedAt;
        string metadata; // JSON metadata (encryption info, format, etc.)
        bool verified; // Whether content hash has been verified
    }

    enum StorageBackend {
        WALRUS, // Sui Walrus storage
        IPFS,   // IPFS storage
        ARWEAVE, // Arweave storage
        HYBRID  // Multiple backends (redundancy)
    }

    // Mapping from record ID to storage reference
    mapping(uint256 => StorageReference) public storageReferences;
    
    // Mapping from content hash to record IDs (for deduplication)
    mapping(bytes32 => uint256[]) public contentHashToRecords;
    
    // Cross-chain bridge address (for Sui <-> Celo communication)
    address public bridgeAddress;
    
    // Events
    event StorageReferenceCreated(
        uint256 indexed recordId,
        StorageBackend backend,
        string storageRef,
        bytes32 contentHash,
        address indexed uploadedBy
    );
    
    event StorageReferenceVerified(
        uint256 indexed recordId,
        bytes32 contentHash,
        bool verified
    );
    
    event StorageBackendUpdated(
        uint256 indexed recordId,
        StorageBackend newBackend,
        string newStorageRef
    );

    uint256 private recordCounter;

    constructor(address _bridgeAddress) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        bridgeAddress = _bridgeAddress;
    }

    /**
     * @notice Create a storage reference for Walrus
     * @param walrusObjectId The Walrus object ID from Sui
     * @param contentHash SHA-256 hash of the content
     * @param metadata JSON metadata (encryption, format, etc.)
     * @return recordId The storage record ID
     */
    function createWalrusReference(
        string memory walrusObjectId,
        bytes32 contentHash,
        string memory metadata
    ) external returns (uint256) {
        uint256 recordId = recordCounter++;
        
        storageReferences[recordId] = StorageReference({
            backend: StorageBackend.WALRUS,
            storageRef: walrusObjectId,
            contentHash: contentHash,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp,
            metadata: metadata,
            verified: false
        });
        
        contentHashToRecords[contentHash].push(recordId);
        
        emit StorageReferenceCreated(
            recordId,
            StorageBackend.WALRUS,
            walrusObjectId,
            contentHash,
            msg.sender
        );
        
        return recordId;
    }

    /**
     * @notice Create a storage reference for IPFS (for interoperability)
     * @param ipfsHash The IPFS CID
     * @param contentHash SHA-256 hash of the content
     * @param metadata JSON metadata
     * @return recordId The storage record ID
     */
    function createIPFSReference(
        string memory ipfsHash,
        bytes32 contentHash,
        string memory metadata
    ) external returns (uint256) {
        uint256 recordId = recordCounter++;
        
        storageReferences[recordId] = StorageReference({
            backend: StorageBackend.IPFS,
            storageRef: ipfsHash,
            contentHash: contentHash,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp,
            metadata: metadata,
            verified: false
        });
        
        contentHashToRecords[contentHash].push(recordId);
        
        emit StorageReferenceCreated(
            recordId,
            StorageBackend.IPFS,
            ipfsHash,
            contentHash,
            msg.sender
        );
        
        return recordId;
    }

    /**
     * @notice Create a hybrid reference (multiple backends for redundancy)
     * @param walrusObjectId Walrus object ID
     * @param ipfsHash IPFS CID
     * @param contentHash SHA-256 hash
     * @param metadata JSON metadata
     * @return recordId The storage record ID
     */
    function createHybridReference(
        string memory walrusObjectId,
        string memory ipfsHash,
        bytes32 contentHash,
        string memory metadata
    ) external returns (uint256) {
        uint256 recordId = recordCounter++;
        
        // Store as JSON with both references
        string memory hybridRef = string(abi.encodePacked(
            '{"walrus":"', walrusObjectId,
            '","ipfs":"', ipfsHash,
            '"}'
        ));
        
        storageReferences[recordId] = StorageReference({
            backend: StorageBackend.HYBRID,
            storageRef: hybridRef,
            contentHash: contentHash,
            uploadedBy: msg.sender,
            uploadedAt: block.timestamp,
            metadata: metadata,
            verified: false
        });
        
        contentHashToRecords[contentHash].push(recordId);
        
        emit StorageReferenceCreated(
            recordId,
            StorageBackend.HYBRID,
            hybridRef,
            contentHash,
            msg.sender
        );
        
        return recordId;
    }

    /**
     * @notice Verify storage reference by checking content hash
     * @param recordId The storage record ID
     * @param contentHash The expected content hash
     */
    function verifyReference(uint256 recordId, bytes32 contentHash) external {
        StorageReference storage ref = storageReferences[recordId];
        require(ref.uploadedBy != address(0), "Reference not found");
        
        if (ref.contentHash == contentHash) {
            ref.verified = true;
            emit StorageReferenceVerified(recordId, contentHash, true);
        } else {
            emit StorageReferenceVerified(recordId, contentHash, false);
        }
    }

    /**
     * @notice Get storage reference
     * @param recordId The storage record ID
     * @return The storage reference structure
     */
    function getStorageReference(uint256 recordId) external view returns (StorageReference memory) {
        return storageReferences[recordId];
    }

    /**
     * @notice Find records by content hash (for deduplication)
     * @param contentHash The content hash
     * @return An array of record IDs
     */
    function findRecordsByHash(bytes32 contentHash) external view returns (uint256[] memory) {
        return contentHashToRecords[contentHash];
    }

    /**
     * @notice Update storage backend (e.g., migrate from IPFS to Walrus)
     * @param recordId The storage record ID
     * @param newBackend The new storage backend
     * @param newStorageRef The new storage reference
     */
    function updateStorageBackend(
        uint256 recordId,
        StorageBackend newBackend,
        string memory newStorageRef
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        StorageReference storage ref = storageReferences[recordId];
        require(ref.uploadedBy != address(0), "Reference not found");
        
        ref.backend = newBackend;
        ref.storageRef = newStorageRef;
        
        emit StorageBackendUpdated(recordId, newBackend, newStorageRef);
    }

    /**
     * @notice Set bridge address for cross-chain communication
     * @param _bridgeAddress The bridge contract address
     */
    function setBridgeAddress(address _bridgeAddress) external onlyRole(DEFAULT_ADMIN_ROLE) {
        bridgeAddress = _bridgeAddress;
    }
}

