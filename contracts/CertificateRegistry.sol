// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract CertificateRegistry is Ownable {
    
    struct CertificateRecord {
        string certificateId;
        bytes32 pdfHash;
        string ipfsCID;
        uint256 issueDate;
        address issuer;
        uint256 versionNumber;
        bool valid;
        // Metadata fields for compatibility
        string studentName;
        string studentId;
        string institutionName;
        string certificateTitle;
        string course;
        string grade;
    }

    // Mappings
    mapping(string => CertificateRecord[]) private certificateHistory;
    mapping(bytes32 => string) public hashToId;
    mapping(bytes32 => uint256) public hashToVersionIndex;
    mapping(address => bool) public admins;

    // Events
    event CertificateIssued(
        bytes32 indexed certificateHash,
        string certificateId,
        string studentName,
        string studentId,
        string institutionName
    );
    event CertificateReissued(
        string indexed certificateId,
        uint256 indexed versionNumber,
        bytes32 indexed newHash
    );
    event CertificateRevoked(bytes32 indexed certificateHash);
    event CertificateVerified(bytes32 indexed certificateHash, bool isValid);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    // Modifiers
    modifier onlyAdmin() {
        require(admins[msg.sender] || msg.sender == owner(), "Not authorized: Admin role required");
        _;
    }

    constructor() Ownable(msg.sender) {
        admins[msg.sender] = true;
        emit AdminAdded(msg.sender);
    }

    /**
     * @dev Add a new institution administrator.
     * @param _admin Address of the new administrator.
     */
    function addAdmin(address _admin) external onlyOwner {
        require(_admin != address(0), "Invalid admin address");
        require(!admins[_admin], "Address is already admin");
        admins[_admin] = true;
        emit AdminAdded(_admin);
    }

    /**
     * @dev Remove an institution administrator.
     * @param _admin Address of the administrator to remove.
     */
    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin], "Address is not an admin");
        admins[_admin] = false;
        emit AdminRemoved(_admin);
    }

    /**
     * @dev Issue a new certificate (Version 1).
     */
    function issueCertificate(
        bytes32 _hash,
        string memory _certificateId,
        string memory _studentName,
        string memory _studentId,
        string memory _institutionName,
        string memory _certificateTitle,
        string memory _course,
        string memory _grade,
        string memory _ipfsCID
    ) external onlyAdmin {
        require(_hash != bytes32(0), "Invalid certificate hash");
        require(bytes(_certificateId).length > 0, "Invalid certificate ID");
        require(bytes(hashToId[_hash]).length == 0, "Certificate hash already registered");
        require(certificateHistory[_certificateId].length == 0, "Certificate ID already registered");

        CertificateRecord memory newCert = CertificateRecord({
            certificateId: _certificateId,
            pdfHash: _hash,
            ipfsCID: _ipfsCID,
            issueDate: block.timestamp,
            issuer: msg.sender,
            versionNumber: 1,
            valid: true,
            studentName: _studentName,
            studentId: _studentId,
            institutionName: _institutionName,
            certificateTitle: _certificateTitle,
            course: _course,
            grade: _grade
        });

        certificateHistory[_certificateId].push(newCert);
        hashToId[_hash] = _certificateId;
        hashToVersionIndex[_hash] = 0;

        emit CertificateIssued(
            _hash,
            _certificateId,
            _studentName,
            _studentId,
            _institutionName
        );
    }

    /**
     * @dev Reissue a certificate with updated details (creating a new Version).
     */
    function reissueCertificate(
        bytes32 _hash,
        string memory _certificateId,
        string memory _studentName,
        string memory _studentId,
        string memory _institutionName,
        string memory _certificateTitle,
        string memory _course,
        string memory _grade,
        string memory _ipfsCID
    ) external onlyAdmin {
        require(_hash != bytes32(0), "Invalid certificate hash");
        require(bytes(_certificateId).length > 0, "Invalid certificate ID");
        require(bytes(hashToId[_hash]).length == 0, "New certificate hash already registered");

        uint256 historyLength = certificateHistory[_certificateId].length;
        require(historyLength > 0, "Certificate ID does not exist");

        // Revoke/supersede the previous version
        uint256 lastIdx = historyLength - 1;
        certificateHistory[_certificateId][lastIdx].valid = false;
        bytes32 oldHash = certificateHistory[_certificateId][lastIdx].pdfHash;
        emit CertificateRevoked(oldHash);

        // Add the new version
        uint256 nextVersion = historyLength + 1;
        CertificateRecord memory newCert = CertificateRecord({
            certificateId: _certificateId,
            pdfHash: _hash,
            ipfsCID: _ipfsCID,
            issueDate: block.timestamp,
            issuer: msg.sender,
            versionNumber: nextVersion,
            valid: true,
            studentName: _studentName,
            studentId: _studentId,
            institutionName: _institutionName,
            certificateTitle: _certificateTitle,
            course: _course,
            grade: _grade
        });

        certificateHistory[_certificateId].push(newCert);
        hashToId[_hash] = _certificateId;
        hashToVersionIndex[_hash] = historyLength;

        emit CertificateIssued(
            _hash,
            _certificateId,
            _studentName,
            _studentId,
            _institutionName
        );
        emit CertificateReissued(_certificateId, nextVersion, _hash);
    }

    /**
     * @dev Revoke an existing certificate version.
     * @param _hash SHA-256 hash of the certificate version to revoke.
     */
    function revokeCertificate(bytes32 _hash) external onlyAdmin {
        string memory certId = hashToId[_hash];
        require(bytes(certId).length > 0, "Certificate does not exist");

        uint256 idx = hashToVersionIndex[_hash];
        require(certificateHistory[certId][idx].valid, "Certificate is already revoked");

        certificateHistory[certId][idx].valid = false;
        emit CertificateRevoked(_hash);
    }

    /**
     * @dev Check if a certificate is valid.
     * @param _hash SHA-256 hash of the certificate.
     * @return True if the certificate exists and is valid, false otherwise.
     */
    function verifyCertificate(bytes32 _hash) external view returns (bool) {
        string memory certId = hashToId[_hash];
        if (bytes(certId).length == 0) return false;
        uint256 idx = hashToVersionIndex[_hash];
        return certificateHistory[certId][idx].valid;
    }

    /**
     * @dev Get certificate details by SHA-256 hash.
     */
    function getCertificateByHash(bytes32 _hash)
        external
        view
        returns (
            string memory certificateId,
            string memory studentName,
            string memory studentId,
            string memory institutionName,
            string memory certificateTitle,
            string memory course,
            string memory grade,
            string memory ipfsCID,
            uint256 issueDate,
            bool valid,
            uint256 versionNumber,
            address issuer
        )
    {
        string memory certId = hashToId[_hash];
        require(bytes(certId).length > 0, "Certificate does not exist");

        uint256 idx = hashToVersionIndex[_hash];
        CertificateRecord memory cert = certificateHistory[certId][idx];
        return (
            cert.certificateId,
            cert.studentName,
            cert.studentId,
            cert.institutionName,
            cert.certificateTitle,
            cert.course,
            cert.grade,
            cert.ipfsCID,
            cert.issueDate,
            cert.valid,
            cert.versionNumber,
            cert.issuer
        );
    }

    /**
     * @dev Get latest certificate details by Certificate ID.
     */
    function getCertificateById(string memory _id)
        external
        view
        returns (
            string memory certificateId,
            string memory studentName,
            string memory studentId,
            string memory institutionName,
            string memory certificateTitle,
            string memory course,
            string memory grade,
            string memory ipfsCID,
            uint256 issueDate,
            bool valid,
            uint256 versionNumber,
            address issuer
        )
    {
        uint256 len = certificateHistory[_id].length;
        require(len > 0, "Certificate ID not found");

        CertificateRecord memory cert = certificateHistory[_id][len - 1];
        return (
            cert.certificateId,
            cert.studentName,
            cert.studentId,
            cert.institutionName,
            cert.certificateTitle,
            cert.course,
            cert.grade,
            cert.ipfsCID,
            cert.issueDate,
            cert.valid,
            cert.versionNumber,
            cert.issuer
        );
    }

    /**
     * @dev Get the full version history for a Certificate ID.
     */
    function getCertificateHistory(string memory _id)
        external
        view
        returns (CertificateRecord[] memory)
    {
        require(certificateHistory[_id].length > 0, "Certificate ID not found");
        return certificateHistory[_id];
    }
}

