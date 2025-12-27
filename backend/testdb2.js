const ibmdb = require('ibm_db');

const connStr =
  "DATABASE=AIRSCM;" +
  "HOSTNAME=127.0.0.1;" +
  "PORT=25000;" +
  "PROTOCOL=TCPIP;" +
  "UID=db2admin;" +
  "PWD=db2ramana;";

ibmdb.open(connStr, (err, conn) => {
  if (err) {
    console.error("❌ DB2 Error:", err);
    return;
  }
  console.log("✅ DB2 Connected Successfully");
  conn.close();
});
