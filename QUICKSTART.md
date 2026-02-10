# Quick Start Guide

## 60-Second Setup

### Terminal 1: Backend
```bash
cd "c:/Users/raman/Documents/Projects/SupplyChain"
npm install
node backend/server.js
```
✓ Backend runs on **http://localhost:5000**

### Terminal 2: Frontend
```bash
cd "c:/Users/raman/Documents/Projects/SupplyChain/frontend"
npm install
npm run dev
```
✓ Frontend runs on **http://localhost:5173**

---

## Test the System (In Browser)

### 1. Submit a Part (Supplier Portal)
1. Open http://localhost:5173/
2. Fill in:
   - Supplier ID: `SUP001`
   - Part ID: `ENGINE-001`
   - Part Name: `Aircraft Engine Assembly`
   - Batch No: `BATCH-2026-001`
   - Quantity: `1`
   - MFG Date: `2026-02-01`
3. Click **Generate QR & Hash** — see QR code + SHA-256 hash appear
4. Click **Export Proof (PDF)** — downloads a PDF with part details + QR
5. Click **Submit Part** — stores in blockchain (or simulated ledger if DB2 unavailable)
6. ✓ You get a **TX ID** (blockchain transaction ID)

### 2. Verify the Part (Verify Portal)
1. Go to http://localhost:5173/verify
2. Enter Part ID: `ENGINE-001`
3. Click **Verify Part**
4. ✔ **AUTHENTIC** — if part hasn't been tampered
5. ✖ **TAMPERED** — if DB records and blockchain hash don't match

### 3. File a Claim (Claims Portal)
1. Go to http://localhost:5173/claims
2. Fill in:
   - Part ID: `ENGINE-001`
   - Your ID: `CUST-2026`
   - Insurer ID: `INSURE-001`
   - Description: `Part failed quality check`
3. Click **Submit Claim**
4. ✓ Claim is recorded

### 4. View Claims (Insurer Dashboard)
1. Go to http://localhost:5173/insurer
2. Click **Claims** tab
3. ✓ See all filed claims with status (OPEN, RESOLVED)
4. Click **Recent Transactions** tab
5. ✓ See blockchain ledger entries

---

## API Testing with curl / PowerShell

### Get Ledger
```bash
curl http://localhost:5000/ledger
```

### Verify Part (DB-backed)
```bash
curl http://localhost:5000/verifyDbPart/ENGINE-001
```

### Get Claims as Insurer
```bash
# PowerShell
$headers = @{ 'x-user-role' = 'INSURER' }
Invoke-WebRequest -Uri 'http://localhost:5000/claims' -Headers $headers -UseBasicParsing
```

### Submit Claim as Consumer
```bash
$body = @{
  partId = 'ENGINE-001'
  claimantId = 'CUST-2026'
  insurerId = 'INSURE-001'
  description = 'Quality issue'
} | ConvertTo-Json

$headers = @{ 'x-user-role' = 'CONSUMER' }
Invoke-WebRequest -Uri 'http://localhost:5000/claims' `
  -Method Post `
  -ContentType 'application/json' `
  -Body $body `
  -Headers $headers `
  -UseBasicParsing
```

---

## What's Working Now

✅ **Frontend**
- Three user portals (Supplier, Consumer, Insurer)
- QR code generation for parts
- PDF export with proof details
- Client-side & server-side hashing

✅ **Backend API**
- Part submission with blockchain anchor
- Canonical verification (compare DB vs blockchain)
- Claims lifecycle (POST/GET)
- Role-based access control (RBAC)

✅ **Blockchain**
- Simulated JSON ledger (works without Fabric/Db2)
- All transactions logged with hash + timestamp
- Ready to swap to Hyperledger Fabric later

✅ **Security**
- RBAC enforced on all protected endpoints
- Tamper-proof hash verification
- Multiple user roles (SUPPLIER, CONSUMER, INSURER, ADMIN)

---

## What's Next

🔲 **Keycloak SSO** — Replace role header with JWT authentication  
🔲 **Real Fabric Network** — Deploy chaincode to Hyperledger Fabric  
🔲 **DB2 Schema** — Ensure all tables (AIRCRAFT_PART_MASTER, BLOCKCHAIN_AUDIT, CLAIMS) exist  
🔲 **ML Risk Scoring** — Integrate anomaly detection  
🔲 **Docker & K8s** — Containerize for production deployment  

---

## Troubleshooting

**Frontend won't load?**
- Check http://localhost:5173 is accessible
- Make sure `npm run dev` ran without errors in Terminal 2

**Submit fails with error?**
- Check backend is running on port 5000 (`http://localhost:5000/health`)
- If DB2 unavailable, system uses simulated ledger (look for "using simulated blockchain" in backend logs)

**Cannot access /claims endpoint?**
- Ensure you're using the correct role header: `-H "x-user-role: INSURER"`
- SUPPLIER role cannot access /claims (403 Forbidden is correct)

---

**Ready to go!** Open http://localhost:5173 and start testing.
