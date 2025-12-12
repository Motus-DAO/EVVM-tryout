// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Telemedicine
 * @notice Telemedicine consultation and prescription management
 * @dev Handles virtual consultations, prescriptions, and billing
 */
contract Telemedicine is AccessControl, ReentrancyGuard {
    bytes32 public constant DOCTOR_ROLE = keccak256("DOCTOR_ROLE");
    bytes32 public constant PHARMACIST_ROLE = keccak256("PHARMACIST_ROLE");

    // Consultation structure
    struct Consultation {
        uint256 consultationId;
        address patient;
        address doctor;
        uint256 scheduledTime;
        uint256 startTime;
        uint256 endTime;
        string consultationHash; // Encrypted consultation data
        ConsultationStatus status;
        uint256 fee;
        bool paid;
    }

    enum ConsultationStatus {
        Scheduled,
        InProgress,
        Completed,
        Cancelled
    }

    // Prescription structure
    struct Prescription {
        uint256 prescriptionId;
        uint256 consultationId;
        address patient;
        address doctor;
        string medicationHash; // Encrypted prescription data
        uint256 issuedAt;
        bool fulfilled;
        address fulfilledBy; // Pharmacist who fulfilled
    }

    mapping(uint256 => Consultation) public consultations;
    mapping(uint256 => Prescription) public prescriptions;
    mapping(address => uint256[]) public patientConsultations;
    mapping(address => uint256[]) public doctorConsultations;

    uint256 private consultationCounter;
    uint256 private prescriptionCounter;

    // Payment token (CELO or cUSD)
    IERC20 public paymentToken;
    address public treasury;

    // Events
    event ConsultationScheduled(
        uint256 indexed consultationId,
        address indexed patient,
        address indexed doctor,
        uint256 scheduledTime,
        uint256 fee
    );
    
    event ConsultationStarted(
        uint256 indexed consultationId,
        address indexed patient,
        address indexed doctor
    );
    
    event ConsultationCompleted(
        uint256 indexed consultationId,
        address indexed patient,
        address indexed doctor,
        string consultationHash
    );
    
    event PrescriptionIssued(
        uint256 indexed prescriptionId,
        uint256 indexed consultationId,
        address indexed patient,
        address doctor
    );
    
    event PrescriptionFulfilled(
        uint256 indexed prescriptionId,
        address indexed pharmacist
    );
    
    event PaymentReceived(
        uint256 indexed consultationId,
        address indexed patient,
        uint256 amount
    );

    constructor(address _paymentToken, address _treasury) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        paymentToken = IERC20(_paymentToken);
        treasury = _treasury;
    }

    /**
     * @notice Schedule a telemedicine consultation
     * @param doctor The doctor's address
     * @param scheduledTime Unix timestamp for scheduled time
     * @param fee Consultation fee
     */
    function scheduleConsultation(
        address doctor,
        uint256 scheduledTime,
        uint256 fee
    ) external nonReentrant {
        require(hasRole(DOCTOR_ROLE, doctor), "Not a registered doctor");
        require(scheduledTime > block.timestamp, "Invalid scheduled time");
        require(fee > 0, "Fee must be greater than 0");

        uint256 consultationId = consultationCounter++;
        
        consultations[consultationId] = Consultation({
            consultationId: consultationId,
            patient: msg.sender,
            doctor: doctor,
            scheduledTime: scheduledTime,
            startTime: 0,
            endTime: 0,
            consultationHash: "",
            status: ConsultationStatus.Scheduled,
            fee: fee,
            paid: false
        });

        patientConsultations[msg.sender].push(consultationId);
        doctorConsultations[doctor].push(consultationId);

        emit ConsultationScheduled(consultationId, msg.sender, doctor, scheduledTime, fee);
    }

    /**
     * @notice Pay for a consultation
     * @param consultationId The consultation ID
     */
    function payForConsultation(uint256 consultationId) external nonReentrant {
        Consultation storage consultation = consultations[consultationId];
        require(consultation.patient == msg.sender, "Not the patient");
        require(consultation.status == ConsultationStatus.Scheduled, "Invalid status");
        require(!consultation.paid, "Already paid");
        require(block.timestamp >= consultation.scheduledTime - 1 hours, "Too early to pay");

        require(
            paymentToken.transferFrom(msg.sender, treasury, consultation.fee),
            "Payment failed"
        );

        consultation.paid = true;
        emit PaymentReceived(consultationId, msg.sender, consultation.fee);
    }

    /**
     * @notice Start a consultation
     * @param consultationId The consultation ID
     */
    function startConsultation(uint256 consultationId) external {
        Consultation storage consultation = consultations[consultationId];
        require(consultation.doctor == msg.sender, "Not the doctor");
        require(consultation.status == ConsultationStatus.Scheduled, "Invalid status");
        require(consultation.paid, "Consultation not paid");
        require(
            block.timestamp >= consultation.scheduledTime - 15 minutes,
            "Too early to start"
        );

        consultation.status = ConsultationStatus.InProgress;
        consultation.startTime = block.timestamp;

        emit ConsultationStarted(consultationId, consultation.patient, msg.sender);
    }

    /**
     * @notice Complete a consultation and optionally issue prescription
     * @param consultationId The consultation ID
     * @param consultationHash Encrypted consultation data hash
     * @param issuePrescription Whether to issue a prescription
     * @param medicationHash Encrypted prescription data (if issuing)
     */
    function completeConsultation(
        uint256 consultationId,
        string memory consultationHash,
        bool issuePrescription,
        string memory medicationHash
    ) external {
        Consultation storage consultation = consultations[consultationId];
        require(consultation.doctor == msg.sender, "Not the doctor");
        require(consultation.status == ConsultationStatus.InProgress, "Invalid status");

        consultation.status = ConsultationStatus.Completed;
        consultation.endTime = block.timestamp;
        consultation.consultationHash = consultationHash;

        emit ConsultationCompleted(
            consultationId,
            consultation.patient,
            msg.sender,
            consultationHash
        );

        if (issuePrescription) {
            uint256 prescriptionId = prescriptionCounter++;
            
            prescriptions[prescriptionId] = Prescription({
                prescriptionId: prescriptionId,
                consultationId: consultationId,
                patient: consultation.patient,
                doctor: msg.sender,
                medicationHash: medicationHash,
                issuedAt: block.timestamp,
                fulfilled: false,
                fulfilledBy: address(0)
            });

            emit PrescriptionIssued(
                prescriptionId,
                consultationId,
                consultation.patient,
                msg.sender
            );
        }
    }

    /**
     * @notice Fulfill a prescription (pharmacist)
     * @param prescriptionId The prescription ID
     */
    function fulfillPrescription(uint256 prescriptionId) external {
        Prescription storage prescription = prescriptions[prescriptionId];
        require(!prescription.fulfilled, "Already fulfilled");
        require(hasRole(PHARMACIST_ROLE, msg.sender), "Not a pharmacist");

        prescription.fulfilled = true;
        prescription.fulfilledBy = msg.sender;

        emit PrescriptionFulfilled(prescriptionId, msg.sender);
    }

    /**
     * @notice Cancel a consultation
     * @param consultationId The consultation ID
     */
    function cancelConsultation(uint256 consultationId) external {
        Consultation storage consultation = consultations[consultationId];
        require(
            consultation.patient == msg.sender || consultation.doctor == msg.sender,
            "Not authorized"
        );
        require(
            consultation.status == ConsultationStatus.Scheduled ||
            consultation.status == ConsultationStatus.InProgress,
            "Cannot cancel"
        );

        consultation.status = ConsultationStatus.Cancelled;

        // Refund if paid
        if (consultation.paid && consultation.patient == msg.sender) {
            require(
                paymentToken.transfer(msg.sender, consultation.fee),
                "Refund failed"
            );
            consultation.paid = false;
        }
    }

    /**
     * @notice Get patient's consultations
     * @param patient The patient address
     * @return An array of consultation IDs
     */
    function getPatientConsultations(address patient) external view returns (uint256[] memory) {
        require(
            patient == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        return patientConsultations[patient];
    }

    /**
     * @notice Get doctor's consultations
     * @param doctor The doctor address
     * @return An array of consultation IDs
     */
    function getDoctorConsultations(address doctor) external view returns (uint256[] memory) {
        require(
            doctor == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        return doctorConsultations[doctor];
    }

    /**
     * @notice Get prescription details
     * @param prescriptionId The prescription ID
     * @return The prescription structure
     */
    function getPrescription(uint256 prescriptionId) external view returns (Prescription memory) {
        Prescription memory prescription = prescriptions[prescriptionId];
        require(
            prescription.patient == msg.sender ||
            prescription.doctor == msg.sender ||
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized"
        );
        return prescription;
    }
}





