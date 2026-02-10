# SupplyChain PoC — System Architecture & Setup Guide

## Overview
This is a tamper-proof multi-user supply chain verification system that anchors aircraft part metadata to a blockchain ledger while maintaining authoritative records in DB2. The system supports three user roles: **Supplier**, **Consumer**, and **Insurer**, each with role-based access control (RBAC) to portal dashboards.

## Architecture

### Components
```
┌─ User & Client Layer ────────────────────────────────────────┐
│  React SPA (Supplier, Consumer, Insurer Portals)            │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌─ API & Microservices Layer ──────────────────────────────────┐
│  Node.js Express Backend (Port 5000)                         │
│  ├─ Role-Based Access Control (RBAC)                         │
│  ├─ Part submission & hashing                                │
│  ├─ Verification (DB vs Blockchain)                          │
│  └─ Claims management                                        │
└──────────────────────────────────────────────────────────────┘
         ↓ (DB2)              ↓ (Fabric/Simulated)
    ┌─────────────┐      ┌──────────────────┐
    │  DB2 (SoR)  │      │  Blockchain      │
    │  - Parts    │      │  - Ledger JSON   │
    │  - Audit    │      │  - Chaincode     │
    │  - Claims   │      │  - Merkle proofs │
    └─────────────┘      └──────────────────┘
```

### Data Flow (Tamper-Proof Guarantee)

**Part Submission (Supplier)**
1. Supplier fills form with part details (ID, name, batch, quantity, mfg date)
2. Frontend computes SHA-256 hash of canonical payload
3. Hash is sent with part data to backend `/submitPart`
4. Backend:
   - Inserts part into `AIRCRAFT_PART_MASTER` (Db2)
   - Recomputes hash server-side to verify
   - Submits hash + metadata to blockchain chaincode
   - Receives blockchain TX ID and stores in `BLOCKCHAIN_AUDIT`
5. Supplier receives blockchain TX ID as proof of anchor

**Verification (Consumer / Insurer)**
1. User enters part ID to verify
2. Frontend calls `/verifyDbPart/:partId`
3. Backend:
   - Queries `AIRCRAFT_PART_MASTER` for part data
   - Recomputes canonical hash from DB record
   - Queries `BLOCKCHAIN_AUDIT` for on-chain hash
   - Compares: if match → authentic, else → tampered
4. Returns verdict + both hashes + TX ID for proof

**Claims (Consumer / Insurer)**
1. Consumer files claim referencing part ID
2. Insurer reviews all claims in dashboard
3. Each claim linked to immutable blockchain proof of part integrity

---

## Running the PoC Locally

### Prerequisites
- Node.js 18+ and npm
- IBM Db2 (optional; system falls back to simulated ledger if DB2 unavailable)
- Two terminal windows (one for backend, one for frontend)

### Quick Start

**Terminal 1: Backend**
```bash
cd "c:/Users/raman/Documents/Projects/SupplyChain"
npm install
node backend/server.js
# Backend listens on http://localhost:5000
```

**Terminal 2: Frontend**
```bash
cd "c:/Users/raman/Documents/Projects/SupplyChain/frontend"
npm install
npm run dev
# Frontend dev server runs on http://localhost:5173
```

Then open http://localhost:5173 in a browser.

### Manual API Testing (Role-Based Access)

**View Ledger (public)**
```bash
curl http://localhost:5000/ledger
```

**Get Claims as INSURER (RBAC enforced)**
```bash
curl -H "x-user-role: INSURER" http://localhost:5000/claims
```

**Attempt Claims Access as SUPPLIER (should fail with 403)**
```bash
curl -H "x-user-role: SUPPLIER" http://localhost:5000/claims
# Returns: {"error":"Forbidden","requiredRole":["INSURER"],...}
```

**Submit Claim as CONSUMER**
```bash
curl -X POST http://localhost:5000/claims \
  -H "Content-Type: application/json" \
  -H "x-user-role: CONSUMER" \
  -d '{"partId":"SHI300","claimantId":"CUST001","insurerId":"INS001","description":"Defective part"}'
```

---

## Frontend Walkthrough

### Routes
- **/**  — Supplier Portal: submit parts, generate QR codes, export PDF proofs
- **/verify** — Verification Portal: enter part ID to verify authenticity against blockchain
- **/claims** — File Claims: consumer submits issues
- **/insurer** — Insurer Dashboard: view recent transactions and claims queue

### Features

**Supplier Page**
- Form fields: Supplier ID, Part ID, Part Name, Batch No, Quantity, MFG Date
- Buttons:
  - **Submit Part**: POST to `/submitPart` (stores in Db2 + blockchain)
  - **Generate QR & Hash**: Compute SHA-256 client-side + display QR code containing part ID + hash
  - **Export Proof (PDF)**: Generate PDF with part details + QR code (for offline verification)

**Verify Page**
- Input: Part ID
- Output: 
  - ✔ if authentic (DB hash == blockchain hash)
  - ✖ if tampered (hashes don't match)
  - Shows: canonical hash, blockchain hash, TX ID, part details

**Claims Page**
- File a claim referencing a part ID
- Includes: claimant ID, insurer ID, description
- Backend stores in `BLOCKCHAIN_AUDIT` table (RBAC-protected: CONSUMER + INSURER roles)

**Insurer Dashboard**
- Two tabs:
  - Recent Transactions: shows blockchain ledger entries (last 10)
  - Claims: lists all open/resolved claims from `BLOCKCHAIN_AUDIT` table
- Refresh button to reload data
- Color-coded status indicators (OPEN = orange, RESOLVED = green)

---

## API Endpoints

### Public (No RBAC Required)
- `GET /health` — Health check
- `GET /ledger` — Returns entire simulated blockchain ledger
- `GET /verifyPart/:partId` — Simple ledger lookup (not DB-backed)

### Supplier (Any authenticated user submitting parts)
- `POST /submitPart` — Supplier submits part data + hash → stores in Db2 + blockchain

### Verification (Any user)
- `GET /verifyDbPart/:partId` — DB-backed verification: compares DB hash vs blockchain hash

### RBAC-Protected Endpoints
- `POST /claims` — File claim (roles: CONSUMER, INSURER)
- `GET /claims` — List claims (roles: INSURER)

### Role Header
```
x-user-role: SUPPLIER | CONSUMER | INSURER | ADMIN
```
*For PoC, pass role in request header. In production, replace with Keycloak JWT.*

---

## Blockchain & Ledger

### Simulated Ledger (JSON)
Located in `backend/blockchain_ledger.json`. Each entry:
```json
{
  "txId": "TX-1770405437001",
  "partId": "cwesadc",
  "hash": "f9024bad4adf1ad2c3347d26ed0b91f6ac063939268168a73512befc29f065d5",
  "timestamp": "2026-02-06T19:17:17.001Z"
}
```

### Blockchain Chaincode (`aircraftChaincode.js`)
Minimal Hyperledger Fabric smart contract:
- `recordPart(ctx, partId, hashValue, eventType)` — Store part hash on-chain
- `queryPart(ctx, partId)` — Retrieve part from ledger

*Future: Extend with `GetHistory()`, `AnchorMerkleRoot()`, and Merkle batching for scaled anchoring.*

---

## Tamper-Proof Guarantee

**Canonical Hashing**
```
Payload = partId | supplierId | batchNo | quantity | mfgDate
Hash = SHA-256(Payload)
```
- Order is fixed (no field reordering attacks)
- All fields are normalized (trim, lowercase dates)
- Hash computed client-side AND server-side for verification

**Proof Chain**
```
Part Data (DB2) 
    ↓ (compute hash)
Canonical Hash
    ↓ (compare to)
On-Chain Hash (Blockchain Audit)
    ↓
Verification: Match or Tampered
```

If records are modified in DB2 after blockchain anchor but before verification, re-computed hash will NOT match on-chain hash → TAMPERED verdict.

---

## Security Considerations (PoC → Production)

| Layer | PoC | Production |
|-------|-----|-----------|
| Authentication | Role header (`x-user-role`) | Keycloak JWT (OIDC) |
| Secrets | plaintext in code | HashiCorp Vault |
| Signing | none | ECDSA per supplier |
| Blockchain | JSON file | Hyperledger Fabric network |
| DB Encryption | none | Db2 Transparent Data Encryption (TDE) |
| Rate Limiting | none | API Gateway + middleware |
| Input Validation | basic | comprehensive regex + sanitization |

---

## Database Schema (Db2)

*Automatically created by backend on first run (or manually with provided DDL):*

```sql
-- System of Record
CREATE TABLE RAMAN.AIRCRAFT_PART_MASTER (
  PART_ID VARCHAR(50) PRIMARY KEY,
  PART_NAME VARCHAR(255),
  SUPPLIER_ID VARCHAR(50),
  BATCH_NO VARCHAR(50),
  QUANTITY INTEGER,
  MFG_DATE DATE,
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blockchain Audit Trail
CREATE TABLE RAMAN.BLOCKCHAIN_AUDIT (
  ID INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  PART_ID VARCHAR(50),
  PART_HASH VARCHAR(64),
  BLOCK_TX_ID VARCHAR(100),
  ANCHOR_TYPE VARCHAR(20) DEFAULT 'single',
  MERKLE_PROOF VARCHAR(1000),
  SIGNATURE VARCHAR(256),
  SIGNER_ID VARCHAR(50),
  CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (PART_ID) REFERENCES AIRCRAFT_PART_MASTER(PART_ID)
);

-- Claims Tracking
CREATE TABLE RAMAN.CLAIMS (
  CLAIM_ID INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  PART_ID VARCHAR(50),
  CLAIMANT_ID VARCHAR(50),
  INSURER_ID VARCHAR(50),
  STATUS VARCHAR(20) DEFAULT 'OPEN',
  DESCRIPTION VARCHAR(1000),
  CREATED_AT TIMESTAMP,
  RESOLVED_AT TIMESTAMP,
  FOREIGN KEY (PART_ID) REFERENCES AIRCRAFT_PART_MASTER(PART_ID)
);
```

---

## Next Steps (Roadmap)

1. **Sprint 1 ✓** — React SPA + QR/PDF generation + verification UI
2. **Sprint 2** — Full Keycloak SSO integration (replace role header)
3. **Sprint 3** — Hyperledger Fabric network setup + real chaincode deployment
4. **Sprint 4** — Merkle batching for scaled anchoring (1M+ parts)
5. **Sprint 5** — ML-based risk scoring (anomaly detection)
6. **Sprint 6** — Kubernetes + Prometheus + audit logging

---

## Troubleshooting

**Issue**: Backend can't connect to Db2
- **Solution**: System falls back to simulated JSON ledger. To use Db2, ensure connection string in `backend/server.js` is correct and Db2 is running.

**Issue**: Frontend `/submitPart` fails
- **Check**: Backend is running on port 5000 and `/submitPart` endpoint exists.
- **Fallback**: Backend uses simulated blockchain (`blockchain_ledger.json`) if Fabric is unavailable.

**Issue**: RBAC rejecting authorized role
- **Check**: Request includes `x-user-role` header with correct value (SUPPLIER, CONSUMER, INSURER, ADMIN).
- **Example**: `curl -H "x-user-role: INSURER" http://localhost:5000/claims`

**Issue**: QR code not displaying on Supplier page
- **Check**: `qrcode` package is installed (`npm install` in frontend/).
- **Fallback**: User can still view the hash in the form and export PDF proof.

---

## Files Modified / Created

**Backend**
- `backend/server.js` — Updated with RBAC, verification, claims endpoints
- `package.json` — Added `cors` dependency

**Frontend**
- `frontend/src/App.jsx` — Added Claims route
- `frontend/src/pages/Supplier.jsx` — Added QR + PDF + client-side hashing
- `frontend/src/pages/Verify.jsx` — Improved verification UI with verdict
- `frontend/src/pages/Claims.jsx` — New claims filing form
- `frontend/src/pages/Insurer.jsx` — Tabbed dashboard (transactions + claims)
- `frontend/src/styles.css` — Enhanced styling
- `frontend/package.json` — Added `qrcode`, `jspdf` dependencies

---

## Contact & Support
For questions on blockchain anchor strategy, tamper-proof guarantees, or deployment to production, refer to the Hyperledger Fabric and Db2 documentation or contact your cloud provider (IBM Cloud, AWS, etc.).

---

**Last Updated**: February 7, 2026  
**PoC Status**: ✔ Frontend + Backend + RBAC complete; ready for Keycloak + Fabric integration
