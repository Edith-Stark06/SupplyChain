const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

const ccpPath = path.resolve(
  __dirname,
  '../fabric-samples/test-network/organizations/peerOrganizations/org1.example.com/connection-org1.json'
);

async function invokeBlockchain(partId, hash) {
  const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

  const wallet = await Wallets.newFileSystemWallet('./wallet');

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: 'appUser',
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork('mychannel');
  const contract = network.getContract('aircraftcc');

  const tx = await contract.submitTransaction(
    'CreateAsset',
    partId,
    'ENGINE',
    '50',
    'SUP1001',
    new Date().toISOString()
  );

  const txId = contract.createTransaction('CreateAsset').getTransactionId();

  await gateway.disconnect();
  return txId;
}

module.exports = { invokeBlockchain };
