import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Generate an official PDF Certificate file and return it as a File object & data URL
 */
export async function generateCertificatePDF({
  certificateId,
  studentName,
  rollNumber,
  courseName,
  grade,
  institutionName = "Rizvi College of Engineering",
  issueDate = new Date().toLocaleDateString(),
  hodName = "Dr. Charles Xavier (HOD)",
  principalName = "Dr. Erik Lensherr (Principal)"
}) {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background Fill
  doc.setFillColor(252, 252, 254);
  doc.rect(0, 0, width, height, "F");

  // Outer Border (Navy Blue)
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(2.5);
  doc.rect(8, 8, width - 16, height - 16);

  // Inner Border (Gold/Purple Accent)
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(0.8);
  doc.rect(11, 11, width - 22, height - 22);

  // Corner Accent Flourishes
  const corners = [
    [11, 11], [width - 11, 11],
    [11, height - 11], [width - 11, height - 11]
  ];
  doc.setDrawColor(139, 92, 246);
  doc.setLineWidth(1.5);
  corners.forEach(([x, y]) => {
    doc.circle(x, y, 2, "S");
  });

  // Institution Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(institutionName.toUpperCase(), width / 2, 26, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("SECURED BLOCKCHAIN ACADEMIC CREDENTIAL VERIFICATION SYSTEM", width / 2, 33, { align: "center" });

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(40, 36, width - 40, 36);

  // Certificate Title
  doc.setFont("serif", "bold");
  doc.setFontSize(26);
  doc.setTextColor(109, 40, 217); // Purple accent
  doc.text("CERTIFICATE OF ACHIEVEMENT", width / 2, 48, { align: "center" });

  // Subtitle
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text("This official credential certifies that", width / 2, 58, { align: "center" });

  // Student Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(15, 23, 42);
  doc.text(studentName, width / 2, 70, { align: "center" });

  // Roll Number
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`ROLL NUMBER: ${rollNumber}`, width / 2, 78, { align: "center" });

  // Fulfillment Statement
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105);
  doc.text("has successfully completed all prescribed coursework and requirements for", width / 2, 89, { align: "center" });

  // Course Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text(courseName, width / 2, 100, { align: "center" });

  // Grade Box / Badge
  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(209, 213, 219);
  doc.roundedRect(width / 2 - 35, 107, 70, 12, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(16, 185, 129); // Emerald Green
  doc.text(`AWARDED GRADE: ${grade}`, width / 2, 114.5, { align: "center" });

  // Certificate Metadata
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Certificate ID: ${certificateId}`, 30, 138);
  doc.text(`Date of Issuance: ${issueDate}`, 30, 144);
  doc.text("Status: VERIFIED ON-CHAIN", 30, 150);

  // Generate QR Code Data URL for instant verification
  const verifyUrl = `${window.location.origin}/verify?id=${certificateId}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 200,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" }
  });

  // Embed QR Code on Bottom Right
  const qrSize = 36;
  const qrX = width - 66;
  const qrY = 130;
  
  doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("SCAN TO VERIFY ON-CHAIN", qrX + qrSize / 2, qrY + qrSize + 4, { align: "center" });

  // Signatures Section (Center-Left & Center-Right)
  // HOD Signature
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  doc.line(90, 160, 145, 160);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(hodName, 117.5, 165, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Head of Department", 117.5, 170, { align: "center" });

  // Principal Signature
  doc.line(165, 160, 220, 160);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(principalName, 192.5, 165, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Principal / Academic Seal", 192.5, 170, { align: "center" });

  // Footer / Cryptographic Ledger Note
  doc.setFillColor(15, 23, 42);
  doc.rect(8, height - 16, width - 16, 8, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`VERICHAIN PROTOCOL | IMMUTABLE LEDGER HASH PROOF | AUTHENTICATED CERTIFICATE ${certificateId}`, width / 2, height - 11, { align: "center" });

  // Return PDF blob and file
  const pdfBlob = doc.output("blob");
  const pdfFile = new File([pdfBlob], `${certificateId}.pdf`, { type: "application/pdf" });
  
  return {
    doc,
    pdfBlob,
    pdfFile,
    fileName: `${certificateId}.pdf`
  };
}
