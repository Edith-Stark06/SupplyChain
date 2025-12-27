const crypto = require('crypto');

function generatePartHash(part) {
  const data =
    part.partId +
    part.supplierId +
    part.batchNo +
    part.quantity +
    part.mfgDate;

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

module.exports = { generatePartHash };
