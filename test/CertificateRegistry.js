const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CertificateRegistry", function () {
  let registry;
  let owner;
  let admin;
  let user;

  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("Sample Certificate PDF Content"));
  const sampleId = "CERT-2026-0001";
  const studentName = "Alice Smith";
  const studentId = "STU-992";
  const institutionName = "Blockchain University";
  const certificateTitle = "Bachelor of Science";
  const course = "Computer Science";
  const grade = "A+";
  const ipfsCID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco";

  beforeEach(async function () {
    [owner, admin, user] = await ethers.getSigners();
    
    // Deploy contract
    registry = await ethers.deployContract("CertificateRegistry");
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should set the deployer as an admin", async function () {
      expect(await registry.admins(owner.address)).to.be.true;
    });
  });

  describe("Admin Management", function () {
    it("Should allow owner to add an admin", async function () {
      await expect(registry.connect(owner).addAdmin(admin.address))
        .to.emit(registry, "AdminAdded")
        .withArgs(admin.address);

      expect(await registry.admins(admin.address)).to.be.true;
    });

    it("Should fail if non-owner tries to add an admin", async function () {
      await expect(
        registry.connect(user).addAdmin(admin.address)
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to remove an admin", async function () {
      await registry.connect(owner).addAdmin(admin.address);
      
      await expect(registry.connect(owner).removeAdmin(admin.address))
        .to.emit(registry, "AdminRemoved")
        .withArgs(admin.address);

      expect(await registry.admins(admin.address)).to.be.false;
    });
  });

  describe("Certificate Issuance", function () {
    beforeEach(async function () {
      await registry.connect(owner).addAdmin(admin.address);
    });

    it("Should allow admin to issue a certificate", async function () {
      await expect(
        registry.connect(admin).issueCertificate(
          sampleHash,
          sampleId,
          studentName,
          studentId,
          institutionName,
          certificateTitle,
          course,
          grade,
          ipfsCID
        )
      )
        .to.emit(registry, "CertificateIssued")
        .withArgs(sampleHash, sampleId, studentName, studentId, institutionName);

      // Verify state mapping
      const cert = await registry.certificates(sampleHash);
      expect(cert.certificateId).to.equal(sampleId);
      expect(cert.studentName).to.equal(studentName);
      expect(cert.valid).to.be.true;
      expect(cert.exists).to.be.true;

      // Verify ID lookup
      expect(await registry.idToHash(sampleId)).to.equal(sampleHash);
    });

    it("Should fail if a non-admin tries to issue a certificate", async function () {
      await expect(
        registry.connect(user).issueCertificate(
          sampleHash,
          sampleId,
          studentName,
          studentId,
          institutionName,
          certificateTitle,
          course,
          grade,
          ipfsCID
        )
      ).to.be.revertedWith("Not authorized: Admin role required");
    });

    it("Should fail to issue a certificate with duplicate hash", async function () {
      await registry.connect(admin).issueCertificate(
        sampleHash,
        sampleId,
        studentName,
        studentId,
        institutionName,
        certificateTitle,
        course,
        grade,
        ipfsCID
      );

      // Try issuing another cert with the same hash but different ID
      await expect(
        registry.connect(admin).issueCertificate(
          sampleHash,
          "CERT-2026-0002",
          studentName,
          studentId,
          institutionName,
          certificateTitle,
          course,
          grade,
          ipfsCID
        )
      ).to.be.revertedWith("Certificate hash already registered");
    });

    it("Should fail to issue a certificate with duplicate ID", async function () {
      await registry.connect(admin).issueCertificate(
        sampleHash,
        sampleId,
        studentName,
        studentId,
        institutionName,
        certificateTitle,
        course,
        grade,
        ipfsCID
      );

      // Try issuing another cert with a different hash but same ID
      const differentHash = ethers.keccak256(ethers.toUtf8Bytes("Different Content"));
      await expect(
        registry.connect(admin).issueCertificate(
          differentHash,
          sampleId,
          studentName,
          studentId,
          institutionName,
          certificateTitle,
          course,
          grade,
          ipfsCID
        )
      ).to.be.revertedWith("Certificate ID already registered");
    });
  });

  describe("Certificate Verification & Retrieval", function () {
    beforeEach(async function () {
      await registry.connect(owner).issueCertificate(
        sampleHash,
        sampleId,
        studentName,
        studentId,
        institutionName,
        certificateTitle,
        course,
        grade,
        ipfsCID
      );
    });

    it("Should verify valid certificate hash", async function () {
      expect(await registry.verifyCertificate(sampleHash)).to.be.true;
    });

    it("Should return false for unregistered certificate hash", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("Doesn't exist"));
      expect(await registry.verifyCertificate(nonExistentHash)).to.be.false;
    });

    it("Should retrieve certificate details by hash", async function () {
      const cert = await registry.getCertificateByHash(sampleHash);
      expect(cert.certificateId).to.equal(sampleId);
      expect(cert.studentName).to.equal(studentName);
      expect(cert.course).to.equal(course);
      expect(cert.grade).to.equal(grade);
      expect(cert.ipfsCID).to.equal(ipfsCID);
      expect(cert.valid).to.be.true;
    });

    it("Should retrieve certificate details by ID", async function () {
      const cert = await registry.getCertificateById(sampleId);
      expect(cert.certificateId).to.equal(sampleId);
      expect(cert.studentName).to.equal(studentName);
      expect(cert.course).to.equal(course);
      expect(cert.grade).to.equal(grade);
      expect(cert.ipfsCID).to.equal(ipfsCID);
      expect(cert.valid).to.be.true;
    });
  });

  describe("Certificate Revocation", function () {
    beforeEach(async function () {
      await registry.connect(owner).addAdmin(admin.address);
      await registry.connect(admin).issueCertificate(
        sampleHash,
        sampleId,
        studentName,
        studentId,
        institutionName,
        certificateTitle,
        course,
        grade,
        ipfsCID
      );
    });

    it("Should allow admin to revoke a certificate", async function () {
      await expect(registry.connect(admin).revokeCertificate(sampleHash))
        .to.emit(registry, "CertificateRevoked")
        .withArgs(sampleHash);

      expect(await registry.verifyCertificate(sampleHash)).to.be.false;

      const cert = await registry.getCertificateByHash(sampleHash);
      expect(cert.valid).to.be.false;
    });

    it("Should fail if non-admin tries to revoke a certificate", async function () {
      await expect(
        registry.connect(user).revokeCertificate(sampleHash)
      ).to.be.revertedWith("Not authorized: Admin role required");
    });

    it("Should fail if certificate does not exist", async function () {
      const nonExistentHash = ethers.keccak256(ethers.toUtf8Bytes("No exist"));
      await expect(
        registry.connect(admin).revokeCertificate(nonExistentHash)
      ).to.be.revertedWith("Certificate does not exist");
    });

    it("Should fail if already revoked", async function () {
      await registry.connect(admin).revokeCertificate(sampleHash);
      await expect(
        registry.connect(admin).revokeCertificate(sampleHash)
      ).to.be.revertedWith("Certificate is already revoked");
    });
  });
});
