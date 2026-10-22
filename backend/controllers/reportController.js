const xlsx = require("xlsx");
const prisma = require("../prisma/db");

// Export Verification Logs to Excel
exports.exportVerificationLogs = async (req, res) => {
  try {
    const logs = await prisma.verificationLog.findMany({
      include: {
        certificate: true
      }
    });

    const data = logs.map(l => ({
      "Log ID": l.id,
      "Certificate ID": l.certificate?.certificateId || "N/A",
      "Verifier Name": l.verifierName,
      "Method": l.verificationMethod,
      "Result": l.result,
      "IP Address": l.ipAddress || "127.0.0.1",
      "Timestamp": new Date(l.verifiedAt).toLocaleString()
    }));

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Verification Logs");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=verification_logs.xlsx");
    return res.send(buffer);
  } catch (error) {
    console.error("Export logs error:", error);
    return res.status(500).json({ error: "Failed to generate spreadsheet report" });
  }
};

// Export Issued Certificates to Excel
exports.exportIssuedCertificates = async (req, res) => {
  try {
    const certs = await prisma.certificate.findMany({
      where: { status: "ISSUED" },
      include: {
        student: {
          include: {
            user: true,
            department: true
          }
        },
        versions: true
      }
    });

    const data = certs.map(c => {
      const active = c.versions.find(v => v.versionNumber === c.currentVersion) || {};
      return {
        "Certificate ID": c.certificateId,
        "Student Name": active.studentName || c.student.user.name,
        "Roll Number": c.student.rollNumber,
        "Department": c.student.department.name,
        "Course Name": active.courseName || "N/A",
        "Grade": active.grade || "N/A",
        "IPFS CID": active.ipfsCID || "N/A",
        "Tx Hash": active.txHash || "N/A",
        "Versions Count": c.currentVersion,
        "Date Issued": active.issueDate ? new Date(active.issueDate).toLocaleString() : "N/A"
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Issued Certificates");

    const buffer = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=issued_certificates.xlsx");
    return res.send(buffer);
  } catch (error) {
    console.error("Export certs error:", error);
    return res.status(500).json({ error: "Failed to generate certificate report" });
  }
};
