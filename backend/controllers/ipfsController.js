const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const FormData = require("form-data");

// Helper to calculate SHA-256 hash of file buffer
function calculateSHA256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

exports.uploadCertificate = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    // 1. Calculate SHA-256 Hash
    const rawHash = calculateSHA256(fileBuffer);
    const hashBytes32 = `0x${rawHash}`; // Prefixed for Solidity bytes32 compatibility

    console.log(`Processing file: ${fileName}`);
    console.log(`SHA-256: ${rawHash}`);

    // Check if Pinata keys are provided in environment
    const jwt = process.env.PINATA_JWT;
    const apiKey = process.env.PINATA_API_KEY;
    const apiSecret = process.env.PINATA_API_SECRET;

    let ipfsCID = "";
    let ipfsUrl = "";
    let isMock = false;

    if (jwt || (apiKey && apiSecret)) {
      console.log("Pinata credentials found. Uploading to Pinata IPFS...");
      try {
        const formData = new FormData();
        formData.append("file", fileBuffer, { filename: fileName });

        const pinataMetadata = JSON.stringify({
          name: fileName,
          keyvalues: {
            sha256: rawHash,
          },
        });
        formData.append("pinataMetadata", pinataMetadata);

        const pinataOptions = JSON.stringify({
          cidVersion: 0,
        });
        formData.append("pinataOptions", pinataOptions);

        const headers = {
          ...formData.getHeaders(),
        };

        if (jwt) {
          headers["Authorization"] = `Bearer ${jwt}`;
        } else {
          headers["pinata_api_key"] = apiKey;
          headers["pinata_secret_api_key"] = apiSecret;
        }

        const response = await axios.post(
          "https://api.pinata.cloud/pinning/pinFileToIPFS",
          formData,
          {
            maxBodyLength: "Infinity",
            headers,
          }
        );

        ipfsCID = response.data.IpfsHash;
        ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCID}`;
        console.log(`Successfully uploaded to Pinata IPFS. CID: ${ipfsCID}`);
      } catch (ipfsError) {
        console.error("IPFS upload failed, falling back to mock storage:", ipfsError.message);
        isMock = true;
      }
    } else {
      isMock = true;
    }

    if (isMock) {
      console.log("No Pinata credentials or upload failed. Utilizing local Mock IPFS storage...");
      // Generate a mock CID based on a double SHA-256 hash
      const mockCID = `QmMock${crypto.createHash("sha256").update(rawHash).digest("hex").substring(0, 36)}`;
      
      const uploadsDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Save file locally as CID name
      const filePath = path.join(uploadsDir, mockCID);
      fs.writeFileSync(filePath, fileBuffer);

      ipfsCID = mockCID;
      ipfsUrl = `http://localhost:${process.env.PORT || 5000}/api/ipfs/${mockCID}`;
      console.log(`Saved file locally to Mock IPFS. Mock CID: ${ipfsCID}`);
    }

    return res.status(200).json({
      success: true,
      fileName,
      hash: hashBytes32,
      rawHash: rawHash,
      ipfsCID,
      ipfsUrl,
      isMock,
    });
  } catch (error) {
    console.error("Error in uploadCertificate:", error);
    return res.status(500).json({ error: error.message || "Failed to process certificate file" });
  }
};

// Serving mock IPFS files
exports.getMockIPFS = (req, res) => {
  const { cid } = req.params;
  const filePath = path.join(__dirname, "../uploads", cid);

  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${cid}.pdf"`);
    return res.sendFile(filePath);
  } else {
    return res.status(404).json({ error: "File not found in mock storage" });
  }
};
