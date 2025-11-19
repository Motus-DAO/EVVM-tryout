// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MotusNameService
 * @notice Human-readable name service for the Motus healthcare EVVM
 * @dev Allows registration of .motus domains (e.g., gerry.motus)
 * @dev Supports both traditional payments and EVVM gasless transactions
 */
interface IEvvm {
    function pay(
        address from,
        address to_address,
        string memory to_identity,
        address token,
        uint256 amount,
        uint256 priorityFee,
        uint256 nonce,
        bool priorityFlag,
        address executor,
        bytes memory signature
    ) external;
    
    function getEvvmID() external view returns (string memory);
    function getEvvmMetadata() external view returns (address principalTokenAddress);
}

contract MotusNameService is Ownable, ReentrancyGuard {
    // Domain structure
    struct Domain {
        address owner;
        address resolver;
        uint256 registrationTime;
        uint256 expirationTime;
        string metadata; // JSON string for additional data
        bool active;
    }

    // Mapping from name hash to domain
    mapping(bytes32 => Domain) public domains;
    
    // Reverse mapping: name hash to name string
    mapping(bytes32 => string) public nameFromHash;
    
    // Mapping from owner to list of owned domains
    mapping(address => bytes32[]) public ownedDomains;
    
    // Reverse lookup: address to primary domain
    mapping(address => bytes32) public reverseLookup;

    // Events
    event DomainRegistered(
        bytes32 indexed nameHash,
        string name,
        address indexed owner,
        address resolver,
        uint256 expirationTime
    );
    
    event DomainRenewed(
        bytes32 indexed nameHash,
        string name,
        uint256 newExpirationTime
    );
    
    event DomainTransferred(
        bytes32 indexed nameHash,
        string name,
        address indexed from,
        address indexed to
    );
    
    event ResolverUpdated(
        bytes32 indexed nameHash,
        string name,
        address indexed newResolver
    );
    
    event MetadataUpdated(
        bytes32 indexed nameHash,
        string name,
        string newMetadata
    );

    // Constants
    uint256 public constant MIN_REGISTRATION_DURATION = 365 days;
    uint256 public constant MAX_REGISTRATION_DURATION = 10 * 365 days;
    uint256 public baseRegistrationFee = 0.01 ether; // Base fee in CELO or Principal Token
    uint256 public renewalFee = 0.005 ether; // Renewal fee in CELO or Principal Token
    
    // Name validation
    string public constant TLD = "motus";
    uint256 public constant MIN_NAME_LENGTH = 3;
    uint256 public constant MAX_NAME_LENGTH = 63;

    // EVVM Integration
    address public evvmAddress;
    address public constant PRINCIPAL_TOKEN_ADDRESS = address(0x1); // EVVM Principal Token
    bool public evvmEnabled = false;

    // Events for gasless transactions
    event DomainRegisteredGasless(
        bytes32 indexed nameHash,
        string name,
        address indexed owner,
        address indexed executor,
        uint256 expirationTime
    );
    
    event DomainRenewedGasless(
        bytes32 indexed nameHash,
        string name,
        address indexed executor,
        uint256 newExpirationTime
    );
    
    event DomainTransferredGasless(
        bytes32 indexed nameHash,
        string name,
        address indexed from,
        address indexed to,
        address executor
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Register a new .motus domain (traditional payment)
     * @param name The name to register (without .motus suffix)
     * @param duration Registration duration in seconds
     * @param resolver Optional resolver address
     * @param metadata Optional metadata JSON string
     */
    function register(
        string memory name,
        uint256 duration,
        address resolver,
        string memory metadata
    ) external payable nonReentrant {
        require(isValidName(name), "Invalid name format");
        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Duration too long");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name, ".", TLD));
        require(!domains[nameHash].active, "Domain already registered");
        
        uint256 fee = calculateRegistrationFee(name, duration);
        require(msg.value >= fee, "Insufficient payment");
        
        uint256 expirationTime = block.timestamp + duration;
        
        domains[nameHash] = Domain({
            owner: msg.sender,
            resolver: resolver,
            registrationTime: block.timestamp,
            expirationTime: expirationTime,
            metadata: metadata,
            active: true
        });
        
        // Store name for reverse lookup
        nameFromHash[nameHash] = string(abi.encodePacked(name, ".", TLD));
        
        ownedDomains[msg.sender].push(nameHash);
        
        // Set as primary domain if user doesn't have one
        if (reverseLookup[msg.sender] == bytes32(0)) {
            reverseLookup[msg.sender] = nameHash;
        }
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        emit DomainRegistered(nameHash, name, msg.sender, resolver, expirationTime);
    }

    /**
     * @notice Register a new .motus domain using EVVM gasless transaction
     * @param name The name to register (without .motus suffix)
     * @param duration Registration duration in seconds
     * @param resolver Optional resolver address
     * @param metadata Optional metadata JSON string
     * @param user Address of the user registering (signer of the transaction)
     * @param amount Amount in Principal Tokens to pay
     * @param priorityFee Priority fee for the relayer
     * @param nonce Nonce for the EVVM transaction
     * @param priorityFlag True for async, false for sync
     * @param signature EIP-191 signature from the user
     */
    function registerGasless(
        string memory name,
        uint256 duration,
        address resolver,
        string memory metadata,
        address user,
        uint256 amount,
        uint256 priorityFee,
        uint256 nonce,
        bool priorityFlag,
        bytes memory signature
    ) external nonReentrant {
        require(evvmEnabled && evvmAddress != address(0), "EVVM not enabled");
        require(isValidName(name), "Invalid name format");
        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Duration too long");
        
        bytes32 nameHash = keccak256(abi.encodePacked(name, ".", TLD));
        require(!domains[nameHash].active, "Domain already registered");
        
        uint256 fee = calculateRegistrationFee(name, duration);
        require(amount >= fee, "Insufficient payment");
        
        // Process EVVM payment
        _makePay(user, amount, priorityFee, nonce, priorityFlag, signature);
        
        uint256 expirationTime = block.timestamp + duration;
        
        domains[nameHash] = Domain({
            owner: user,
            resolver: resolver,
            registrationTime: block.timestamp,
            expirationTime: expirationTime,
            metadata: metadata,
            active: true
        });
        
        // Store name for reverse lookup
        nameFromHash[nameHash] = string(abi.encodePacked(name, ".", TLD));
        
        ownedDomains[user].push(nameHash);
        
        // Set as primary domain if user doesn't have one
        if (reverseLookup[user] == bytes32(0)) {
            reverseLookup[user] = nameHash;
        }
        
        emit DomainRegisteredGasless(nameHash, name, user, msg.sender, expirationTime);
        emit DomainRegistered(nameHash, name, user, resolver, expirationTime);
    }

    /**
     * @notice Renew a domain registration (traditional payment)
     * @param nameHash The hash of the domain name
     * @param duration Additional duration in seconds
     */
    function renew(bytes32 nameHash, uint256 duration) external payable nonReentrant {
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == msg.sender, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Duration too long");
        
        uint256 fee = calculateRenewalFee(duration);
        require(msg.value >= fee, "Insufficient payment");
        
        domain.expirationTime += duration;
        
        // Refund excess payment
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
        
        string memory name = getNameFromHash(nameHash);
        emit DomainRenewed(nameHash, name, domain.expirationTime);
    }

    /**
     * @notice Renew a domain registration using EVVM gasless transaction
     * @param nameHash The hash of the domain name
     * @param duration Additional duration in seconds
     * @param user Address of the domain owner (signer)
     * @param amount Amount in Principal Tokens to pay
     * @param priorityFee Priority fee for the relayer
     * @param nonce Nonce for the EVVM transaction
     * @param priorityFlag True for async, false for sync
     * @param signature EIP-191 signature from the user
     */
    function renewGasless(
        bytes32 nameHash,
        uint256 duration,
        address user,
        uint256 amount,
        uint256 priorityFee,
        uint256 nonce,
        bool priorityFlag,
        bytes memory signature
    ) external nonReentrant {
        require(evvmEnabled && evvmAddress != address(0), "EVVM not enabled");
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == user, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        require(duration >= MIN_REGISTRATION_DURATION, "Duration too short");
        require(duration <= MAX_REGISTRATION_DURATION, "Duration too long");
        
        uint256 fee = calculateRenewalFee(duration);
        require(amount >= fee, "Insufficient payment");
        
        // Process EVVM payment
        _makePay(user, amount, priorityFee, nonce, priorityFlag, signature);
        
        domain.expirationTime += duration;
        
        string memory name = getNameFromHash(nameHash);
        emit DomainRenewedGasless(nameHash, name, msg.sender, domain.expirationTime);
        emit DomainRenewed(nameHash, name, domain.expirationTime);
    }

    /**
     * @notice Transfer domain ownership (traditional)
     * @param nameHash The hash of the domain name
     * @param newOwner The new owner address
     */
    function transfer(bytes32 nameHash, address newOwner) external {
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == msg.sender, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        require(newOwner != address(0), "Invalid new owner");
        
        address oldOwner = domain.owner;
        domain.owner = newOwner;
        
        // Update owned domains lists
        _removeFromOwnedDomains(oldOwner, nameHash);
        ownedDomains[newOwner].push(nameHash);
        
        // Update reverse lookup if this was the primary domain
        if (reverseLookup[oldOwner] == nameHash) {
            reverseLookup[oldOwner] = bytes32(0);
        }
        if (reverseLookup[newOwner] == bytes32(0)) {
            reverseLookup[newOwner] = nameHash;
        }
        
        string memory name = getNameFromHash(nameHash);
        emit DomainTransferred(nameHash, name, oldOwner, newOwner);
    }

    /**
     * @notice Transfer domain ownership using EVVM gasless transaction
     * @param nameHash The hash of the domain name
     * @param newOwner The new owner address
     * @param user Address of the current owner (signer)
     */
    function transferGasless(
        bytes32 nameHash,
        address newOwner,
        address user,
        bytes memory /* signature - reserved for future signature verification */
    ) external {
        require(evvmEnabled && evvmAddress != address(0), "EVVM not enabled");
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == user, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        require(newOwner != address(0), "Invalid new owner");
        
        // Note: Signature verification can be added in production
        // For now, the executor (relayer) is trusted to call this on behalf of the user
        
        address oldOwner = domain.owner;
        domain.owner = newOwner;
        
        // Update owned domains lists
        _removeFromOwnedDomains(oldOwner, nameHash);
        ownedDomains[newOwner].push(nameHash);
        
        // Update reverse lookup if this was the primary domain
        if (reverseLookup[oldOwner] == nameHash) {
            reverseLookup[oldOwner] = bytes32(0);
        }
        if (reverseLookup[newOwner] == bytes32(0)) {
            reverseLookup[newOwner] = nameHash;
        }
        
        string memory name = getNameFromHash(nameHash);
        emit DomainTransferredGasless(nameHash, name, oldOwner, newOwner, msg.sender);
        emit DomainTransferred(nameHash, name, oldOwner, newOwner);
    }

    /**
     * @notice Update domain resolver
     * @param nameHash The hash of the domain name
     * @param newResolver The new resolver address
     */
    function setResolver(bytes32 nameHash, address newResolver) external {
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == msg.sender, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        
        domain.resolver = newResolver;
        
        string memory name = getNameFromHash(nameHash);
        emit ResolverUpdated(nameHash, name, newResolver);
    }

    /**
     * @notice Update domain metadata
     * @param nameHash The hash of the domain name
     * @param newMetadata New metadata JSON string
     */
    function setMetadata(bytes32 nameHash, string memory newMetadata) external {
        Domain storage domain = domains[nameHash];
        require(domain.active, "Domain not registered");
        require(domain.owner == msg.sender, "Not domain owner");
        require(block.timestamp < domain.expirationTime, "Domain expired");
        
        domain.metadata = newMetadata;
        
        string memory name = getNameFromHash(nameHash);
        emit MetadataUpdated(nameHash, name, newMetadata);
    }

    /**
     * @notice Check if a domain name is available
     * @param name The name to check (without .motus suffix)
     * @return available True if the name is available
     */
    function isAvailable(string memory name) external view returns (bool) {
        bytes32 nameHash = keccak256(abi.encodePacked(name, ".", TLD));
        Domain memory domain = domains[nameHash];
        
        if (!domain.active) {
            return true;
        }
        
        // Domain is expired
        if (block.timestamp >= domain.expirationTime) {
            return true;
        }
        
        return false;
    }

    /**
     * @notice Get domain information
     * @param nameHash The hash of the domain name
     * @return domain The domain structure
     */
    function getDomain(bytes32 nameHash) external view returns (Domain memory) {
        return domains[nameHash];
    }

    /**
     * @notice Get all domains owned by an address
     * @param owner The owner address
     * @return An array of domain name hashes
     */
    function getOwnedDomains(address owner) external view returns (bytes32[] memory) {
        return ownedDomains[owner];
    }

    /**
     * @notice Get primary domain for an address
     * @param addr The address to lookup
     * @return nameHash The primary domain hash
     */
    function getPrimaryDomain(address addr) external view returns (bytes32) {
        return reverseLookup[addr];
    }

    // Internal functions

    /**
     * @notice Validate name format
     * @param name The name to validate
     * @return valid True if valid
     */
    function isValidName(string memory name) public pure returns (bool) {
        bytes memory nameBytes = bytes(name);
        uint256 length = nameBytes.length;
        
        if (length < MIN_NAME_LENGTH || length > MAX_NAME_LENGTH) {
            return false;
        }
        
        // Check for valid characters (alphanumeric and hyphens, but not starting/ending with hyphen)
        for (uint256 i = 0; i < length; i++) {
            bytes1 char = nameBytes[i];
            bool isAlphanumeric = (char >= 0x30 && char <= 0x39) || // 0-9
                                  (char >= 0x41 && char <= 0x5A) || // A-Z
                                  (char >= 0x61 && char <= 0x7A);    // a-z
            bool isHyphen = char == 0x2D; // -
            
            if (!isAlphanumeric && !isHyphen) {
                return false;
            }
            
            // Cannot start or end with hyphen
            if (isHyphen && (i == 0 || i == length - 1)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * @notice Calculate registration fee
     * @param name The domain name
     * @param duration Registration duration
     * @return fee The calculated fee
     */
    function calculateRegistrationFee(string memory name, uint256 duration) public view returns (uint256) {
        uint256 lengthMultiplier = bytes(name).length <= 5 ? 10 : 1; // Shorter names cost more
        uint256 durationMultiplier = duration / 365 days;
        return baseRegistrationFee * lengthMultiplier * durationMultiplier;
    }

    /**
     * @notice Calculate renewal fee
     * @param duration Renewal duration
     * @return fee The calculated fee
     */
    function calculateRenewalFee(uint256 duration) public view returns (uint256) {
        uint256 durationMultiplier = duration / 365 days;
        return renewalFee * durationMultiplier;
    }

    /**
     * @notice Remove domain from owned domains list
     * @param owner The owner address
     * @param nameHash The domain hash to remove
     */
    function _removeFromOwnedDomains(address owner, bytes32 nameHash) private {
        bytes32[] storage domainsList = ownedDomains[owner];
        for (uint256 i = 0; i < domainsList.length; i++) {
            if (domainsList[i] == nameHash) {
                domainsList[i] = domainsList[domainsList.length - 1];
                domainsList.pop();
                break;
            }
        }
    }

    /**
     * @notice Get name from hash
     * @param nameHash The hash to lookup
     * @return name The domain name
     */
    function getNameFromHash(bytes32 nameHash) private view returns (string memory) {
        string memory name = nameFromHash[nameHash];
        require(bytes(name).length > 0, "Name not found");
        return name;
    }
    
    /**
     * @notice Get name from hash (public view)
     * @param nameHash The hash to lookup
     * @return name The domain name
     */
    function getName(bytes32 nameHash) external view returns (string memory) {
        return getNameFromHash(nameHash);
    }

    // Admin functions

    /**
     * @notice Update base registration fee (owner only)
     * @param newFee The new base fee
     */
    function setBaseRegistrationFee(uint256 newFee) external onlyOwner {
        baseRegistrationFee = newFee;
    }

    /**
     * @notice Update renewal fee (owner only)
     * @param newFee The new renewal fee
     */
    function setRenewalFee(uint256 newFee) external onlyOwner {
        renewalFee = newFee;
    }

    /**
     * @notice Withdraw contract balance (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // EVVM Integration Functions

    /**
     * @notice Set EVVM contract address (owner only)
     * @param _evvmAddress Address of the EVVM contract
     */
    function setEvvmAddress(address _evvmAddress) external onlyOwner {
        require(_evvmAddress != address(0), "Invalid EVVM address");
        evvmAddress = _evvmAddress;
        evvmEnabled = true;
    }

    /**
     * @notice Enable or disable EVVM functionality (owner only)
     * @param _enabled True to enable, false to disable
     */
    function setEvvmEnabled(bool _enabled) external onlyOwner {
        require(evvmAddress != address(0), "EVVM address not set");
        evvmEnabled = _enabled;
    }

    /**
     * @notice Internal function to process EVVM payments
     * @param user Address making the payment
     * @param amount Amount in Principal Tokens
     * @param priorityFee Priority fee for relayer
     * @param nonce Nonce for the transaction
     * @param priorityFlag True for async, false for sync
     * @param signature EIP-191 signature
     */
    function _makePay(
        address user,
        uint256 amount,
        uint256 priorityFee,
        uint256 nonce,
        bool priorityFlag,
        bytes memory signature
    ) internal {
        IEvvm(evvmAddress).pay(
            user,
            address(this),
            "",
            PRINCIPAL_TOKEN_ADDRESS,
            amount,
            priorityFee,
            nonce,
            priorityFlag,
            address(this),
            signature
        );
    }
}

