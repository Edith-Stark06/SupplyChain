// server.js
const express = require('express');
const path = require('path');
const ibmdb = require('ibm_db');

const { generatePartHash } = require('./hashUtil');
const { writeToBlockchain } = require('./blockchain'); // simulated (fallback)
const { invokeBlockchain } = require('./fabricClient'); // real Fabric

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===============================
// DB2 CONNECTION STRING
// ===============================
const connStr =
  "DATABASE=AIRSCM;" +
  "HOSTNAME=127.0.0.1;" +
  "PORT=25000;" +
  "PROTOCOL=TCPIP;" +
  "UID=db2admin;" +
  "PWD=db2ramana;";

// ===============================
// HEALTH CHECK
// ===============================
app.get('/health', (req, res) => {
  res.send("Backend is running on port 5000");
});

// ===============================
// SUPPLIER PART SUBMISSION API
// ===============================
app.post('/submitPart', async (req, res) => {
  const {
    supplierId,
    partId,
    partName,
    batchNo,
    quantity,
    mfgDate
  } = req.body;

  console.log("📥 Incoming part:", req.body);

  let conn;

  try {
    // ===============================
    // 1️⃣ OPEN DB2 CONNECTION
    // ===============================
    conn = await ibmdb.open(connStr);

    // ===============================
    // 2️⃣ INSERT INTO MAIN TABLE
    // ===============================
    const insertSql = `
      INSERT INTO RAMAN.AIRCRAFT_PART_MASTER
      (PART_ID, PART_NAME, SUPPLIER_ID, BATCH_NO, QUANTITY, MFG_DATE)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await conn.query(insertSql, [
      partId,
      partName,
      supplierId,
      batchNo,
      quantity,
      mfgDate
    ]);

    // ===============================
    // 3️⃣ GENERATE HASH
    // ===============================
    const partHash = generatePartHash({
      partId,
      supplierId,
      batchNo,
      quantity,
      mfgDate
    });

    console.log("🔐 Generated Hash:", partHash);

    // ===============================
    // 4️⃣ INVOKE BLOCKCHAIN
    // ===============================
    let blockchainTxId;

    try {
      // 🔗 REAL Hyperledger Fabric
      blockchainTxId = await invokeBlockchain(partId, partHash);
      console.log("⛓ Fabric TX ID:", blockchainTxId);
    } catch (fabricErr) {
      // 🟡 FALLBACK: Simulated blockchain
      console.warn("⚠ Fabric unavailable, using simulated blockchain");
      blockchainTxId = writeToBlockchain(partId, partHash);
    }

    // ===============================
    // 5️⃣ INSERT BLOCKCHAIN AUDIT
    // ===============================
    const auditSql = `
      INSERT INTO RAMAN.BLOCKCHAIN_AUDIT
      (PART_ID, PART_HASH, BLOCK_TX_ID)
      VALUES (?, ?, ?)
    `;

    await conn.query(auditSql, [
      partId,
      partHash,
      blockchainTxId
    ]);

    // ===============================
    // 6️⃣ SUCCESS RESPONSE
    // ===============================
    res.json({
      status: "SUCCESS",
      message: "Part stored + blockchain audit recorded",
      partId,
      blockchainTxId
    });

  } catch (err) {
    console.error("❌ Error in /submitPart:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message
    });

  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// START SERVER
// ===============================
app.listen(5000, () => {
  console.log("✅ Backend running on port 5000");
});