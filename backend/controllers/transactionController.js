const prisma = require("../prisma/db");

exports.getBlockchainTxs = async (req, res) => {
  try {
    const txs = await prisma.blockchainTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        certificate: true
      }
    });
    return res.status(200).json({ success: true, transactions: txs });
  } catch (error) {
    console.error("Get blockchain txs error:", error);
    return res.status(500).json({ error: "Server error fetching blockchain ledger" });
  }
};

exports.getApplicationTxs = async (req, res) => {
  try {
    const txs = await prisma.applicationTransaction.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true
      }
    });
    
    // Sanitize user details
    const sanitized = txs.map(t => ({
      id: t.id,
      action: t.action,
      status: t.status,
      details: t.details,
      ipAddress: t.ipAddress,
      createdAt: t.createdAt,
      user: t.user ? { name: t.user.name, email: t.user.email, role: t.user.role } : null
    }));

    return res.status(200).json({ success: true, transactions: sanitized });
  } catch (error) {
    console.error("Get application txs error:", error);
    return res.status(500).json({ error: "Server error fetching app transactions" });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: true,
        certificate: true
      }
    });

    const sanitized = logs.map(l => ({
      id: l.id,
      timestamp: l.timestamp,
      action: l.action,
      details: l.details,
      ipAddress: l.ipAddress,
      user: l.user ? { name: l.user.name, email: l.user.email, role: l.user.role } : null,
      certificateId: l.certificate ? l.certificate.certificateId : null
    }));

    return res.status(200).json({ success: true, logs: sanitized });
  } catch (error) {
    console.error("Get audit logs error:", error);
    return res.status(500).json({ error: "Server error fetching security logs" });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const totalIssued = await prisma.certificate.count({ where: { status: "ISSUED" } });
    const totalRevoked = await prisma.certificate.count({ where: { status: "REVOKED" } });
    const totalPending = await prisma.certificate.count({
      where: {
        status: { in: ["SUBMITTED", "HOD_APPROVED"] }
      }
    });

    // Verification stats
    const totalVerifications = await prisma.verificationLog.count();
    const validVerifications = await prisma.verificationLog.count({ where: { result: "VALID" } });
    const invalidVerifications = await prisma.verificationLog.count({ where: { result: "INVALID" } });

    // Blockchain tx counts
    const blockchainTxsCount = await prisma.blockchainTransaction.count();

    // Verification method trend
    const qrCount = await prisma.verificationLog.count({ where: { verificationMethod: "QR" } });
    const idCount = await prisma.verificationLog.count({ where: { verificationMethod: "ID" } });
    const hashCount = await prisma.verificationLog.count({ where: { verificationMethod: "HASH" } });
    const uploadCount = await prisma.verificationLog.count({ where: { verificationMethod: "PDF_UPLOAD" } });

    return res.status(200).json({
      success: true,
      summary: {
        totalIssued,
        totalRevoked,
        totalPending,
        totalVerifications,
        blockchainTxsCount,
      },
      verificationMethods: [
        { name: "QR Scanner", value: qrCount },
        { name: "Cert ID Search", value: idCount },
        { name: "Hash Check", value: hashCount },
        { name: "PDF Drag & Drop", value: uploadCount },
      ],
      accuracyRate: {
        valid: validVerifications,
        invalid: invalidVerifications
      }
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    return res.status(500).json({ error: "Server error aggregating dashboard data" });
  }
};
