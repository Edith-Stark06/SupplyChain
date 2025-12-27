const fs = require('fs');
const path = require('path');

const ledgerPath = path.join(__dirname, 'blockchain_ledger.json');

function writeToBlockchain(partId, hashValue) {
  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));

  const tx = {
    txId: "TX-" + Date.now(),
    partId: partId,
    hash: hashValue,
    timestamp: new Date().toISOString()
  };

  ledger.push(tx);

  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));

  console.log("🔗 Blockchain TX:", tx);

  return tx.txId;
}

module.exports = { writeToBlockchain };
