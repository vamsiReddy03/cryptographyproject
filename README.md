# Certificate Chain — Blockchain Certificate Verification System

![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)
![Hardhat](https://img.shields.io/badge/Hardhat-2.x-f5d70a)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![Ethers](https://img.shields.io/badge/Ethers.js-v6-2535a0)
![Tests](https://img.shields.io/badge/contract%20tests-17%20passing-brightgreen)

CertiChain is a full-stack decentralized application for issuing and verifying academic certificates. Institutions issue tamper-evident certificate PDFs through a multi-level approval workflow. The SHA-256 hash of each PDF is anchored in an Ethereum smart contract, the file itself is stored on IPFS, and anyone can verify a certificate by dropping the PDF, entering its ID, or scanning its QR code.

---

## Overview

- **Issuance:** Faculty draft certificates, the HOD and the Principal approve them, and the issuer signs an on-chain transaction with MetaMask.
- **Verification:** Public portal; the PDF is hashed in the browser, so the document never has to be uploaded to check it.
- **Revocation and re-issue:** Certificates can be revoked, or re-issued as a new version while the full history is kept.
- **Audit trails:** Blockchain transactions, application events and admin audit logs are recorded and viewable per role.
- **Multi-role access:** Super Admin, Institute Admin (Principal), HOD, Faculty and Student, enforced by JWT role checks.
- **Reports:** Excel exports of verification logs and issued certificates.

## At a Glance

- **Frontend:** React 19 + Vite, Tailwind CSS v4, ethers.js v6, React Query, Recharts
- **Backend:** Node.js + Express REST API
- **Data layer:** Prisma schema with a lightweight JSON-file datastore (`backend/prisma/db.json`) for local development
- **Auth:** JWT access tokens (15 min) and refresh tokens (7 days), role-based middleware
- **Storage:** IPFS through Pinata, with a local mock-IPFS fallback
- **Blockchain:** Solidity `CertificateRegistry` contract (OpenZeppelin `Ownable`), Hardhat for compile, test and deploy
- **Verification:** SHA-256 computed with the browser Web Crypto API, QR codes for sharing

## Project Modules

1. **Frontend application** (`frontend/`): verification portal (`/`), login (`/login`) and the role-based dashboard (`/admin`) with approval queues, issuance stepper, analytics and logs.
2. **Backend API** (`backend/`): authentication, institute/department/user management, certificate workflow, IPFS upload, reports, notifications.
3. **Blockchain layer** (`contracts/`, `scripts/`, `test/`): the registry contract, deploy script and Hardhat tests.
4. **Data and identity layer** (`backend/prisma/`): schema, JSON-backed client, seed script.
5. **Shared artifacts** (`shared/`): contract address and ABI exported by the deploy script and used by the frontend.

## Core User Flows

1. **Institute setup:** Super Admin creates an institute; Institute Admin creates departments and users (HOD, Faculty, Students).
2. **Certificate lifecycle:** Draft → Submitted → HOD approved → Principal approved → Issued (or Revoked / re-issued as a new version).
3. **Public verification:** Anyone drops the PDF, enters a Certificate ID or hash, or opens a QR link and gets Valid, Revoked or Not Found.
4. **Admin oversight:** Admins review the blockchain ledger, application transactions, audit logs and analytics, and export reports.

## Features

- Three-stage approval (Faculty → HOD → Principal) before a certificate can be issued
- In-browser SHA-256 hashing and PDF generation (jsPDF) with an embedded verification QR code
- On-chain registry with duplicate-hash and duplicate-ID protection
- Version history for corrections (re-issue marks the old version invalid)
- Revocation recorded on-chain
- Verification logs per method (QR, ID, hash, PDF upload)
- Fraud-check and OCR helper endpoints (heuristic, demonstration level)
- Notifications for approval and rejection events
- Charts for verification results and certificate status pipeline

---

## Architecture

```text
        [ Presentation: React + Tailwind + ethers.js ]
                         │            │
            REST + JWT   │            │  MetaMask (ECDSA-signed tx)
                         ▼            ▼
        [ Express API ]          [ Ethereum node (Hardhat local) ]
        │   RBAC middleware       │   CertificateRegistry.sol
        ▼                         │
 [ Prisma-style datastore ]       │
 workflow, users, logs            │
                         ▼
                 [ IPFS (Pinata / mock) ]
                 certificate PDFs by CID
```

### Certificate Issuance Pipeline

```text
Faculty drafts ─► HOD approves ─► Principal approves
        │
        ▼
 PDF generated/uploaded ─► SHA-256 hash (browser) ─► upload to IPFS ─► CID
        │
        ▼
 contract.issueCertificate(hash, id, student, ..., cid)  ◄── signed in MetaMask
        │
        ▼
 Tx hash + block number saved via POST /api/certificates/issue/:id  ─► status = ISSUED
```

### Verification Flow

```text
Drop PDF / enter ID / scan QR
        │
        ▼
 SHA-256 recomputed in the browser
        │
        ▼
 Registry lookup (GET /api/certificates/verify; contract exposes verifyCertificate)
        │
        ├── hash found and valid    ─► Verified Authentic
        ├── hash found but revoked  ─► Revoked
        └── hash not found          ─► Not Registered / Tampered
```

### Authentication Architecture

- `POST /api/auth/login` checks the email and the SHA-256 password digest and returns an access token (15 min) and a refresh token (7 days).
- `authenticateToken` verifies the HS256 JWT; `requireRoles([...])` enforces the role per route.
- The frontend Axios interceptor attaches the access token and refreshes it on a 403.

### Role-Based Access Control

| Role | Can do |
|---|---|
| `SUPER_ADMIN` | Create institutes and users, view logs and reports |
| `INSTITUTE_ADMIN` | Create departments and users, give the final (Principal) approval, revoke, view logs and reports |
| `HOD` | Review and approve or reject submitted certificates |
| `FACULTY` | Create drafts, submit, issue, re-issue and revoke on-chain |
| `STUDENT` | View own certificates |

On-chain, the contract has its own access control: the deployer is the `owner`, the owner can add and remove `admins`, and only admins (or the owner) can issue, re-issue or revoke.

---

## Cryptography Used

| Primitive | Where | Purpose |
|---|---|---|
| SHA-256 | Browser (`crypto.subtle`), `ipfsController.js` | Fingerprint of each certificate PDF (integrity) |
| ECDSA (secp256k1) | MetaMask signing the `issueCertificate` transaction | Authenticity and non-repudiation of issuance |
| Contract access control | `Ownable` + `admins` mapping + `onlyAdmin` | Only authorised wallets can write to the registry |
| HMAC-SHA256 (HS256) | JWT access and refresh tokens | Session integrity and authenticity |
| IPFS content addressing | CID returned on upload | Content-bound file reference stored with the hash |

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 19 | UI |
| Vite | 8 | Dev server and build |
| Tailwind CSS | 4 | Styling |
| ethers.js | 6 | MetaMask and contract calls |
| TanStack React Query | 5 | Data fetching |
| React Router | 7 | Routing |
| jsPDF, qrcode, qrcode.react | latest | Certificate PDF and QR generation |
| react-dropzone | 15 | PDF drag and drop |
| Recharts | 3 | Analytics charts |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js + Express | 4 | REST API |
| jsonwebtoken | 9 | JWT auth |
| Prisma schema + JSON datastore | 5.18 | Data model and local persistence |
| Multer | 1.4 | Memory-buffered PDF uploads |
| Helmet, CORS | 8 / 2 | Security headers and origin control |
| pdf-parse, xlsx | 2.x / 0.20 | OCR helper and Excel reports |
| axios, form-data | 1.x | Pinata IPFS upload |

### Blockchain

| Technology | Version | Purpose |
|---|---|---|
| Solidity | 0.8.24 (optimizer, viaIR) | `CertificateRegistry` contract |
| Hardhat + toolbox | 2.x | Compile, local node, tests, deploy |
| OpenZeppelin Contracts | 5.x | `Ownable` |
| IPFS (Pinata) | n/a | Certificate PDF storage |

---

## Project Structure

```text
certificate-verification-system/
├── contracts/
│   └── CertificateRegistry.sol       # Registry smart contract
├── ignition/modules/                 # Hardhat Ignition deployment module
├── scripts/deploy.js                 # Deploys and exports address + ABI
├── test/CertificateRegistry.js       # 17 contract tests
├── shared/                           # contractAddress.json, abi/
├── backend/
│   ├── server.js                     # Express app, /api/upload, /api/ipfs/:cid
│   ├── routes.js                     # All REST routes
│   ├── middleware/authMiddleware.js  # JWT + role checks
│   ├── controllers/                  # auth, admin, certificate, ipfs, report,
│   │                                 # transaction, notification, ai
│   └── prisma/                       # schema.prisma, db.js, db.json, seed.js
├── frontend/
│   └── src/
│       ├── App.jsx                   # Router, wallet connection
│       ├── pages/                    # Verify, Login, Dashboard
│       ├── services/                 # api.js, ethereum.js, certificateGenerator.js
│       └── shared/                   # Copy of contract address + ABI
├── docs/                             # project_report.md, system_documentation.md
└── hardhat.config.js
```

## Database Schema

```text
Institute 1──N Department 1──N Student
    │               │             │
    1               1             1
    └──N User ──────┘             │
          │                       │
          └── Notification        N
                              Certificate 1──N CertificateVersion
                                   │ │ │
                                   │ │ └──N BlockchainTransaction
                                   │ └────N Approval (HOD, PRINCIPAL)
                                   └──────N VerificationLog, AuditLog
ApplicationTransaction (login/logout and other app events)
```

12 models: `User`, `Institute`, `Department`, `Student`, `Certificate`, `CertificateVersion`, `Approval`, `VerificationLog`, `BlockchainTransaction`, `ApplicationTransaction`, `AuditLog`, `Notification`.

## Smart Contract

`CertificateRegistry.sol` keeps an array of version records per certificate ID and reverse indexes from hash to ID.

| Function | Access | Description |
|---|---|---|
| `issueCertificate(hash, id, name, studentId, institution, title, course, grade, cid)` | admin | Registers version 1; rejects zero hash, empty ID, duplicate hash and duplicate ID |
| `reissueCertificate(...)` | admin | Marks the previous version invalid and adds version n + 1 |
| `revokeCertificate(hash)` | admin | Marks a version invalid |
| `verifyCertificate(hash)` | public view | True if the hash is registered and still valid |
| `getCertificateByHash(hash)` / `getCertificateById(id)` | public view | Record details |
| `getCertificateHistory(id)` | public view | All versions of an ID |
| `addAdmin(addr)` / `removeAdmin(addr)` | owner | Manage institution administrators |

Note that the contract stores student name, ID, course and grade next to the hash, so these fields are readable on a public chain.

---

## API Reference

Base URL: `http://localhost:5000/api`

### Auth

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Returns access and refresh tokens |
| POST | `/auth/refresh` | Public | Renews tokens with a refresh token |
| POST | `/auth/logout` | Authenticated | Logs the logout |
| GET | `/auth/profile` | Authenticated | Current user profile |

### Admin

| Method | Endpoint | Access |
|---|---|---|
| POST / GET | `/admin/institutes` | Super Admin (POST) / Public (GET) |
| POST / GET | `/admin/departments` | Institute Admin (POST) / Authenticated (GET) |
| POST / GET | `/admin/users` | Super Admin, Institute Admin |

### Certificates

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/certificates` | Authenticated | Certificates filtered by role |
| POST | `/certificates/draft` | Faculty | Create draft |
| POST | `/certificates/submit/:id` | Faculty | Submit to HOD |
| POST | `/certificates/approve/hod/:id` | HOD | Approve or reject |
| POST | `/certificates/approve/principal/:id` | Institute Admin | Approve or reject |
| POST | `/certificates/issue/:id` | Faculty | Save hash, CID and tx details after the on-chain issue |
| POST | `/certificates/reissue/:id` | Faculty | Save a new version |
| POST | `/certificates/revoke/:id` | Faculty, Institute Admin | Record revocation |
| GET | `/certificates/verify` | Public | Verify by `type=hash|id` and `query` |
| GET | `/certificates/timeline/:certificateId` | Public | Version history |
| POST | `/certificates/ocr` | Faculty | OCR helper for uploaded PDFs |
| POST | `/certificates/fraud-check` | Public | Duplicate and layout heuristics |

### Storage, Ledger, Reports, Misc

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/upload` | Public | Hash a PDF and store it on IPFS (Pinata or mock) |
| GET | `/ipfs/:cid` | Public | Serve a mock-IPFS file |
| GET | `/transactions/blockchain` | Authenticated | Blockchain transaction ledger |
| GET | `/transactions/application` | Admins | Application events |
| GET | `/transactions/audit` | Admins | Audit logs |
| GET | `/transactions/analytics` | Public | Dashboard analytics |
| GET | `/reports/verification-logs` | Admins | Excel export |
| GET | `/reports/issued` | Admins | Excel export |
| GET / POST | `/notifications`, `/notifications/read/:id` | Authenticated | Notifications |
| POST | `/ai/chat` | Public | Help assistant |
| GET | `/health` | Public | Health check |

---

## Local Development Setup

### Prerequisites

- Node.js 20+ and npm
- MetaMask browser extension

### 1. Install

```bash
cd certificate-verification-system
npm install
```

### 2. Start the local blockchain and deploy the contract

```bash
# Terminal 1
npx hardhat node

# Terminal 2
npx hardhat run scripts/deploy.js --network localhost
```

The node runs at `http://127.0.0.1:8545` (Chain ID `31337`). The deploy script writes the contract address and ABI to `shared/` and `frontend/src/shared/`.

### 3. Start the backend

```bash
# Terminal 3
cd backend
npm install
npm run start
```

The API runs on port `5000`. Create `backend/.env` if you want to change defaults (see below). Without Pinata keys it uses mock IPFS and saves files under `backend/uploads/`.

### 4. Point the frontend at your local API

`frontend/src/services/api.js` contains a hard-coded `API_URL` for a hosted deployment. For local use change it to:

```js
const API_URL = "http://localhost:5000/api";
```

### 5. Start the frontend

```bash
# Terminal 4
cd frontend
npm install
npm run start
```

Open `http://localhost:5173`.

### 6. (Optional) Reseed demo data

```bash
cd backend
node prisma/seed.js
```

### Demo credentials (password for all: `Password123`)

| Role | Email |
|---|---|
| Super Admin | `superadmin@certichain.com` |
| Institute Admin (Principal) | `admin@cit.edu` |
| HOD | `hod.cse@cit.edu` |
| Faculty | `faculty.cse@cit.edu` |
| Student | `student@cit.edu` (roll number `CIT-CSE-2026-001`) |

---

## Environment Variables

Backend (`backend/.env`), all optional for local development:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `JWT_SECRET` | built-in development value | Access token signing secret; **set your own** |
| `JWT_REFRESH_SECRET` | built-in development value | Refresh token signing secret; **set your own** |
| `PINATA_JWT` | none | Pinata IPFS credentials (or use the key/secret pair below) |
| `PINATA_API_KEY` / `PINATA_API_SECRET` | none | Alternative Pinata credentials |

---

## Certificate Issuance Flow

1. Faculty creates a draft with the student's roll number, course and grade.
2. Faculty submits it; an HOD approval record is created.
3. The HOD approves (or rejects, which returns it to draft).
4. The Institute Admin (Principal) gives the final approval.
5. Faculty generates or uploads the certificate PDF in the dashboard.
6. The browser computes the SHA-256 hash; the PDF is uploaded to IPFS and a CID is returned.
7. Faculty signs `issueCertificate` in MetaMask using an admin wallet.
8. The transaction hash, block number and gas used are saved through the API and the certificate becomes `ISSUED`.

## Testing the Application

1. **Configure MetaMask:** add a custom network with RPC `http://127.0.0.1:8545`, Chain ID `31337`, symbol `ETH`.
2. **Import the admin account:** import the first private key printed by `npx hardhat node`. This account deployed the contract, so it is the owner and an admin.
3. **Run the workflow:** log in as Faculty, create a draft for roll number `CIT-CSE-2026-001`, submit it, approve as HOD, approve as Principal, then issue it as Faculty with MetaMask connected.
4. **Verify:** open `/`, drop the issued PDF and confirm **Verified Authentic**.
5. **Tamper test:** change one character in the PDF and drop it again; the hash changes and the result is **Not Registered / Tampered**.
6. **Revoke:** revoke the certificate and verify again; the result is **Revoked**.

When no wallet is connected, the dashboard can run in a simulation mode that does not write to the contract. Use MetaMask for real on-chain issuance.

### Contract tests

```bash
npx hardhat test
```

17 tests cover deployment and ownership, admin management, issuance (non-admin, duplicate hash, duplicate ID), verification and retrieval, and revocation.

## Available Scripts

**Root**

```bash
npx hardhat compile      # Compile contracts
npx hardhat test         # Run the 17 contract tests
npx hardhat node         # Local blockchain
npx hardhat run scripts/deploy.js --network localhost
```

**Backend** (`backend/`)

```bash
npm run start            # node server.js
npm run dev              # node server.js
node prisma/seed.js      # Reset and seed demo data
```

**Frontend** (`frontend/`)

```bash
npm run start            # Vite dev server
npm run build            # Production build
npm run preview          # Preview the build
npm run lint             # oxlint
```

## Troubleshooting

**Frontend shows network errors or login fails**
- Check `API_URL` in `frontend/src/services/api.js` and that the backend is running on port 5000.

**MetaMask transaction fails or the contract call reverts**
- The connected account must be the contract owner or an admin ("Not authorized: Admin role required").
- After restarting `npx hardhat node`, redeploy the contract and restart the frontend so the new address is used. Also reset the MetaMask account (Settings → Advanced → Clear activity tab data).
- A "hash already registered" revert means that exact PDF was issued before; change the content or re-issue it.

**Verification says Not Registered for a genuine certificate**
- The PDF must be byte-identical to the one hashed at issuance. Re-saving or re-exporting the file changes its hash.

**Uploads fail or files are missing**
- Without Pinata keys the backend stores files in `backend/uploads/`; the folder must be writable. Maximum upload size is 10 MB.

**CORS errors**
- Set `FRONTEND_URL` in `backend/.env` to your frontend origin.

---

## Credits and Context

- This README accompanies a Cryptography (23CSE331) case study by G Vamsi Reddy (AV.SC.U4CSE24110), Amrita Vishwa Vidyapeetham, which analyses the hash functions, digital signatures and Merkle-tree concepts behind the system.

## License

The smart contract carries an MIT SPDX identifier. The repository does not include a separate LICENSE file; add one before reusing or redistributing the code.
