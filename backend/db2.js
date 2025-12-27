const ibmdb = require('ibm_db');

const connStr =
  "DATABASE=AIRCRAFTSCM;" +
  "HOSTNAME=localhost;" +
  "PORT=50000;" +
  "PROTOCOL=TCPIP;" +
  "UID=db2admin;" +
  "PWD=db2ramana;";

function getConnection() {
  return new Promise((resolve, reject) => {
    ibmdb.open(connStr, (err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

module.exports = { getConnection };
