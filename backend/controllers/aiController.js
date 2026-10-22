const prisma = require("../prisma/db");

exports.chatHelp = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const msgLower = message.toLowerCase();
    let response = "";

    // 1. Check if the message contains a certificate ID format (CER-XXXX-XXX or CER-XXXXXX)
    const certIdMatch = message.match(/cer-\d+-\d+/i) || message.match(/cer-\d+/i);
    const hashMatch = message.match(/0x[a-fA-F0-9]{64}/);

    if (certIdMatch) {
      const certId = certIdMatch[0].toUpperCase();
      const cert = await prisma.certificate.findUnique({
        where: { certificateId: certId },
        include: { versions: true, student: { include: { user: true } } }
      });

      if (cert) {
        const latest = cert.versions.sort((a, b) => b.versionNumber - a.versionNumber)[0];
        response = `🤖 **CertiChain Ledger Scan Report**:
I checked the decentralized registry for ID **${certId}**.
- **Student**: ${latest.studentName} (Roll: ${latest.studentRollNo})
- **Course**: ${latest.courseName}
- **Grade**: ${latest.grade}
- **Ledger Status**: ${cert.status}
- **Current Version**: V${cert.currentVersion}
- **IPFS Storage CID**: \`${latest.ipfsCID}\`
- **Block Anchored**: ${latest.txHash ? `Yes (Tx: ${latest.txHash.slice(0, 10)}...)` : "No (Pending Signature)"}`;
      } else {
        response = `🤖 **CertiChain Ledger Scan Report**:
I searched the database for Certificate ID **${certId}** but could not locate any registered credentials. Please verify the spelling or check if it is still in the approval pipeline.`;
      }
    } else if (hashMatch) {
      const hash = hashMatch[0];
      const version = await prisma.certificateVersion.findUnique({
        where: { pdfHash: hash },
        include: { certificate: true }
      });

      if (version) {
        response = `🤖 **CertiChain Cryptographic Match Found**:
PDF Hash \`${hash.slice(0, 12)}...\` matches a registered credential!
- **Certificate ID**: ${version.certificate.certificateId}
- **Recipient**: ${version.studentName}
- **Version**: V${version.versionNumber}
- **Integrity Check**: Pass (Matches the registered hash).
- **IPFS CID**: \`${version.ipfsCID}\`
- **Current Registry Status**: ${version.status === "ISSUED" ? "✅ VALID & ACTIVE" : "⚠️ REVOKED / SUPERSEDED"}`;
      } else {
        response = `🤖 **CertiChain Cryptographic Check**:
The hash \`${hash}\` is **NOT registered** in our ledger. If this PDF was modified by even 1 byte, its SHA-256 hash changes completely. This file may be forged or edited.`;
      }
    } else if (msgLower.includes("how") && (msgLower.includes("verify") || msgLower.includes("check"))) {
      response = `🤖 **How to Verify Credentials on CertiChain**:
1. **Drag & Drop PDF**: Go to the homepage and drop the certificate PDF. We'll compute its SHA-256 hash in your browser and check if it matches the on-chain signature.
2. **Search Registry**: Input the Certificate ID (e.g. \`CER-123456\`) or SHA-256 Hash directly in the search bar.
3. **QR Code**: Scan the QR code printed on the physical or digital certificate to open the instant verification link.`;
    } else if (msgLower.includes("reissue") || msgLower.includes("version") || msgLower.includes("correction")) {
      response = `🤖 **Certificate Versioning System FAQ**:
Unlike standard blockchain networks where details are locked permanently, CertiChain supports **Certificate Versioning**:
- If a student name has a typo or a grade changes, Faculty can **Reissue** the credential.
- This creates a **new block transaction** (new hash, new IPFS CID) on Ethereum.
- The previous version is marked as **superseded** (invalidated), but is retained in the on-chain history logs.
- Public verifiers see a complete timeline history (V1 $\rightarrow$ V2 $\rightarrow$ V3) for full auditing transparency.`;
    } else if (msgLower.includes("ipfs") || msgLower.includes("storage")) {
      response = `🤖 **IPFS Storage Details**:
Storing large PDF files on the Ethereum blockchain directly is cost-prohibitive due to gas fees. Instead:
1. We upload the certificate PDF to **IPFS** (InterPlanetary File System), a decentralized storage network.
2. IPFS returns a unique Content Identifier (**CID**).
3. We store only this immutable **CID** and the cryptographic **SHA-256 Hash** of the PDF on the Ethereum blockchain.
4. Anyone can view the original document by loading the CID through an IPFS gateway (e.g., Pinata).`;
    } else if (msgLower.includes("fraud") || msgLower.includes("fake") || msgLower.includes("duplicate")) {
      response = `🤖 **AI-Assisted Fraud Protection Features**:
CertiChain implements real-time safeguards during issuance and verification:
- **Duplicate Hash Alert**: Blocks registering the exact same PDF hash twice.
- **Student Collision Check**: Flags warnings if a certificate for the same course and student roll number is already issued.
- **AI Formatting Scan**: Scans document text contents for forged layouts, spelling typos, or signature discrepancies, rating the authenticity confidence (e.g. 98% authentic).`;
    } else {
      response = `🤖 **Hello! I am your CertiChain Verification Assistant.**
I can help you audit credentials, understand the workflow, or query the ledger. Try asking me:
- *"Is certificate CER-101 valid?"*
- *"Check hash 0x..."*
- *"How does versioning work?"*
- *"Explain IPFS storage"*`;
    }

    return res.status(200).json({ success: true, reply: response });
  } catch (error) {
    console.error("AI assistant chat error:", error);
    return res.status(500).json({ error: "Chatbot engine error" });
  }
};
