# Technical Documentation: Blockchain Certificate Verification System

This documentation provides an overview of the system architecture, smart contract design, workflow models, and deployment configurations of the **Blockchain Certificate Verification System**.

---

## 1. System Architecture

The application is structured as a full-stack Web3 decentralized application (dApp). It uses **Vite + React** for the UI, **Ethers.js v6** for smart contract connectivity, a **Node.js/Express** backend for document storage orchestration, and an **Ethereum Virtual Machine (EVM)** compatible blockchain network for storing certificate registries.

```mermaid
graph TD
    User([Institution Admin / Verifier]) -->|Interacts with| UI[React Frontend]
    UI -->|Sign / Broadcast Tx| MM[MetaMask Wallet]
    MM -->|Execute Calls| SC[Solidity Smart Contract]
    SC -->|Write / Query State| EVM[Ethereum Blockchain]
    UI -->|Direct View Queries| SC
    UI -->|Upload PDF| API[Express Backend]
    API -->|Generate SHA-256| API
    API -->|Pin File| IPFS[Pinata IPFS]
    API -->|Fallback Local storage| Store[(Local Mock IPFS)]
```

---

## 2. Smart Contract Design

The `CertificateRegistry` smart contract acts as the trust anchor. It uses SHA-256 hashes of the certificate PDFs as the unique primary identifier.

### Data Structure

```solidity
struct Certificate {
    string certificateId;      // Unique alphanumeric serial number
    string studentName;        // Name of the recipient
    string studentId;          // Academic identifier
    string institutionName;    // Issuing body name
    string certificateTitle;   // Degree/Certificate name (e.g., Bachelor of Arts)
    string course;             // Domain/Subject major
    string grade;              // Grade/CGPA achieved
    string ipfsCID;            // Decentralized storage pointer (CID)
    uint256 issueDate;         // Block timestamp of registration
    bool valid;                // Revocation indicator
    bool exists;               // Existence flag
}
```

### Storage Indexes
- `mapping(bytes32 => Certificate) public certificates;`
- `mapping(string => bytes32) public idToHash;`
- `mapping(address => bool) public admins;`

---

## 3. Workflow Diagrams

### Certificate Issuance Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Institution Admin
    participant UI as React Frontend
    participant API as Express Backend
    participant IPFS as Pinata IPFS
    participant MM as MetaMask Wallet
    participant BC as Smart Contract

    Admin->>UI: Select PDF & input student metadata
    UI->>UI: Calculate SHA-256 locally
    UI->>API: Send PDF file upload
    alt Pinata JWT configured
        API->>IPFS: Pin PDF to decentralized network
        IPFS-->>API: Return IPFS CID
    else Fallback Mode
        API->>API: Save PDF to backend/uploads
        API-->>API: Generate mock CID
    end
    API-->>UI: Return IPFS CID & gateway link
    UI->>MM: Request transaction signature
    Admin->>MM: Sign transaction
    MM->>BC: Call issueCertificate(hash, id, metadata, CID)
    BC->>BC: Write mapping & emit CertificateIssued()
    BC-->>UI: Confirm transaction mined (Receipt)
    UI->>UI: Render QR Code & download receipt
    UI-->>Admin: Show success receipt
```

### Certificate Verification Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Verifier as Employer / Verifier
    participant UI as React Frontend
    participant BC as Smart Contract

    alt Option A: Upload PDF Document
        Verifier->>UI: Drag & drop certificate PDF
        UI->>UI: Compute SHA-256 hash in browser
        UI->>BC: Call verifyCertificate(hash)
    else Option B: ID Search
        Verifier->>UI: Enter Certificate ID
        UI->>BC: Call getCertificateById(id)
    else Option C: QR Code Scan
        Verifier->>UI: Open URL (?hash=0x...)
        UI->>BC: Call getCertificateByHash(hash)
    end
    
    BC-->>UI: Return Certificate status & details
    alt Verified & Valid
        UI-->>Verifier: Display green verified card with student metadata & IPFS link
    else Revoked
        UI-->>Verifier: Display red revoked warning
    else Not Found
        UI-->>Verifier: Display amber invalid/tampered alert
    end
```

---

## 4. API Specifications (Express Backend)

The Express backend serves as a utility node for processing documents. It does not carry any private keys or conduct on-chain transactions, ensuring a decentralized trust model.

### 1. Upload File & Generate Hash
- **Endpoint:** `POST /api/upload`
- **Payload:** `multipart/form-data` containing key `file` (PDF file).
- **Responses:**
  - `200 OK`: File processed successfully.
    ```json
    {
      "success": true,
      "fileName": "degree.pdf",
      "hash": "0x3f4f0d9a92ab...",
      "rawHash": "3f4f0d9a92ab...",
      "ipfsCID": "QmXoypi...",
      "ipfsUrl": "https://gateway.pinata.cloud/ipfs/QmXoypi...",
      "isMock": false
    }
    ```
  - `400 Bad Request`: Missing file payload.
  - `500 Internal Server Error`: Processing or storage upload error.

### 2. Retrieve Mock IPFS PDF
- **Endpoint:** `GET /api/ipfs/:cid`
- **Description:** Statically serves PDF files saved inside the mock storage directory.
- **Responses:**
  - `200 OK`: PDF file stream inline.
  - `404 Not Found`: CID not registered in local mock directory.

---

## 5. Security Architecture

1. **Immutable Hashes:** Documents are identified on-chain exclusively by their cryptographic SHA-256 signatures. If a single character or byte in the PDF is altered, the verification hash changes completely, prompting instant validation failure.
2. **Access Control:** The contract uses role-based access checks (`onlyAdmin` and `onlyOwner`). Only registered admin addresses added by the contract owner can sign transaction data to issue or revoke records.
3. **Decentralized Trust:** Verifiers interact directly with the blockchain contract using standard Ethereum providers. They do not rely on centralized API credentials, intermediate databases, or trusted middlemen to perform authenticity lookups.
