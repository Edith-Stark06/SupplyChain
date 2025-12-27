const express = require('express');
const router = express.Router();
const { getConnection } = require('../db2');
const { generateHash } = require('../hashUtil');
const { storeOnBlockchain } = require('../blockchain');
const { analyzeRisk } = require('../watsonx');

router.post('/submitPart', async (req, res) => {
  console.log("Request received")
  const part = req.body;

  try {
    const conn = await getConnection();

    const insertSql = `
      INSERT INTO AIRCRAFT_PART_MASTER
      (PART_ID, PART_NAME, SUPPLIER_ID, BATCH_NO, QUANTITY, MFG_DATE)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await conn.prepare(insertSql, (err, stmt) => {
      stmt.execute([
        part.partId,
        part.partName,
        part.supplierId,
        part.batchNo,
        part.quantity,
        part.mfgDate
      ]);
    });

    const hash = generateHash(part);

    const bcResult = storeOnBlockchain(
      part.partId,
      part.batchNo,
      hash
    );

    const aiResult = analyzeRisk(part);

    res.json({
      status: "SUCCESS",
      blockchainTx: bcResult.txId,
      aiResult
    });

  } catch (err) {
    res.status(500).json({ error: err.toString() });
  }
});

module.exports = router;
