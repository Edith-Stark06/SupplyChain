// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const ibmdb = require('ibm_db');

const { generatePartHash } = require('./hashUtil');
const { writeToBlockchain } = require('./blockchain'); // simulated (fallback)
const { invokeBlockchain } = require('./fabricClient'); // real Fabric

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Enable CORS for development (React dev server will call API)
app.use(cors());

// ===============================
// JWT CONFIGURATION
// ===============================
const JWT_SECRET = process.env.JWT_SECRET || 'supply-chain-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

// ===============================
// JWT VERIFICATION MIDDLEWARE
// ===============================
// Verify JWT token and extract user info
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ===============================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ===============================
// Require specific roles (checked after JWT verification)
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden', requiredRole: allowedRoles, userRole: req.user?.role });
    }
    next();
  };
}

// If a frontend production build exists at ../frontend/dist, serve it
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

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
// AUTHENTICATION: REGISTER
// ===============================
app.post('/auth/register', async (req, res) => {
  const { username, password, email, role, portalType } = req.body;

  if (!username || !password || !role || !portalType) {
    return res.status(400).json({ error: 'Missing required fields: username, password, role, portalType' });
  }

  if (!['SUPPLIER', 'CONSUMER', 'INSURER'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be SUPPLIER, CONSUMER, or INSURER' });
  }

  let conn;

  try {
    conn = await ibmdb.open(connStr);
    console.log('✓ DB2 connection successful');

    // Check if user already exists
    const checkSql = `SELECT USER_ID FROM RAMAN.USERS WHERE USERNAME = ?`;
    const existing = await new Promise((resolve, reject) => {
      conn.query(checkSql, [username], (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        }
        else resolve(rows || []);
      });
    });

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insert new user
    const insertSql = `
      INSERT INTO RAMAN.USERS (USERNAME, PASSWORD_HASH, EMAIL, ROLE, PORTAL_TYPE)
      VALUES (?, ?, ?, ?, ?)
    `;

    await new Promise((resolve, reject) => {
      conn.query(insertSql, [username, hashedPassword, email || '', role, portalType], (err) => {
        if (err) {
          console.error('Insert error:', err);
          reject(err);
        }
        else resolve();
      });
    });

    console.log(`✓ User registered: ${username}`);
    res.json({
      status: 'REGISTERED',
      message: 'User registered successfully',
      username,
      role,
      portalType
    });

  } catch (err) {
    console.error('❌ Error in /auth/register:', err.message);
    res.status(500).json({ error: err.message || 'Registration failed' });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// AUTHENTICATION: LOGIN
// ===============================
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  let conn;

  try {
    conn = await ibmdb.open(connStr);
    console.log(`✓ DB2 connection successful for login: ${username}`);

    // Query user from DB2
    const sql = `SELECT USER_ID, USERNAME, PASSWORD_HASH, EMAIL, ROLE, PORTAL_TYPE FROM RAMAN.USERS WHERE USERNAME = ?`;
    console.log(`🔍 Querying user: ${username}`);
    
    const rows = await new Promise((resolve, reject) => {
      conn.query(sql, [username], (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        }
        else {
          console.log(`Query result: ${rows ? rows.length + ' rows' : 'no rows'}`);
          resolve(rows || []);
        }
      });
    });

    if (!rows || rows.length === 0) {
      console.log(`⚠ User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    console.log(`✓ User found: ${user.USERNAME}`);

    // Verify password
    const passwordMatch = bcrypt.compareSync(password, user.PASSWORD_HASH);
    if (!passwordMatch) {
      console.log(`❌ Password mismatch for user: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`✓ Password verified for user: ${username}`);

    // Generate JWT
    const token = jwt.sign(
      {
        username: user.USERNAME,
        email: user.EMAIL,
        role: user.ROLE,
        portalType: user.PORTAL_TYPE
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`✓ JWT generated for user: ${username}`);

    res.json({
      status: 'SUCCESS',
      message: 'Login successful',
      token,
      user: {
        username: user.USERNAME,
        role: user.ROLE,
        portalType: user.PORTAL_TYPE,
        email: user.EMAIL
      }
    });

  } catch (err) {
    console.error('❌ Error in /auth/login:', err.message);
    res.status(500).json({ error: err.message || 'Login failed' });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// AUTHENTICATION: LOGOUT
// ===============================
app.post('/auth/logout', verifyToken, (req, res) => {
  // In JWT-based systems, logout is handled client-side (delete token)
  res.json({ status: 'SUCCESS', message: 'Logged out successfully' });
});

// ===============================
// AUTHENTICATION: VERIFY TOKEN
// ===============================
app.get('/auth/me', verifyToken, (req, res) => {
  res.json({
    status: 'OK',
    user: req.user
  });
});

// Simple endpoint for frontend PoC: return entire simulated ledger
app.get('/ledger', (req, res) => {
  try {
    const ledgerPath = path.join(__dirname, 'blockchain_ledger.json');
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    res.json({ status: 'OK', ledger });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Simple verification endpoint: return on-chain records for a partId
app.get('/verifyPart/:partId', (req, res) => {
  try {
    const ledgerPath = path.join(__dirname, 'blockchain_ledger.json');
    const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    const partId = req.params.partId;
    const matches = ledger.filter(tx => tx.partId === partId);
    if (!matches || matches.length === 0) {
      return res.status(404).json({ status: 'NOT_FOUND' });
    }
    res.json({ status: 'FOUND', records: matches });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// ===============================
// SUPPLIER PART SUBMISSION API
// ===============================
app.post('/submitPart', verifyToken, requireRole('SUPPLIER'), async (req, res) => {
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
// VERIFY PART (CANONICAL DB-BACKED)
// ===============================
// Compare DB2 record hash against blockchain audit hash for tamper-proof proof.
// Open to all roles (SUPPLIER, CONSUMER, INSURER verification flows).
app.get('/verifyDbPart/:partId', async (req, res) => {
  const { partId } = req.params;
  let conn;

  try {
    conn = await ibmdb.open(connStr);

    // 1️⃣ Query DB2 part master
    const partSql = `SELECT PART_ID, PART_NAME, SUPPLIER_ID, BATCH_NO, QUANTITY, MFG_DATE FROM RAMAN.AIRCRAFT_PART_MASTER WHERE PART_ID = ?`;
    const partRow = await new Promise((resolve, reject) => {
      conn.query(partSql, [partId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows && rows.length > 0 ? rows[0] : null);
      });
    });

    if (!partRow) {
      return res.status(404).json({ status: 'NOT_FOUND', message: 'Part not found in DB2' });
    }

    // 2️⃣ Compute canonical hash from DB2 record
    const canonicalHash = generatePartHash({
      partId: partRow.PART_ID,
      supplierId: partRow.SUPPLIER_ID,
      batchNo: partRow.BATCH_NO,
      quantity: partRow.QUANTITY,
      mfgDate: partRow.MFG_DATE
    });

    console.log('🔐 Canonical hash from DB2:', canonicalHash);

    // 3️⃣ Query blockchain audit for on-chain hash
    const auditSql = `SELECT PART_HASH, BLOCK_TX_ID FROM RAMAN.BLOCKCHAIN_AUDIT WHERE PART_ID = ? ORDER BY ROW_NUMBER() OVER (ORDER BY PART_HASH DESC) FETCH FIRST 1 ROW ONLY`;
    const auditRow = await new Promise((resolve, reject) => {
      conn.query(auditSql, [partId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows && rows.length > 0 ? rows[0] : null);
      });
    });

    if (!auditRow) {
      return res.status(404).json({ status: 'NOT_ANCHORED', message: 'Part not found in blockchain audit' });
    }

    // 4️⃣ Compare hashes
    const onChainHash = auditRow.PART_HASH;
    const isMatched = canonicalHash === onChainHash;

    res.json({
      status: 'VERIFIED',
      partId,
      isMatched,
      dbHash: canonicalHash,
      blockchainHash: onChainHash,
      blockchainTxId: auditRow.BLOCK_TX_ID,
      part: {
        partName: partRow.PART_NAME,
        supplierId: partRow.SUPPLIER_ID,
        batchNo: partRow.BATCH_NO,
        quantity: partRow.QUANTITY,
        mfgDate: partRow.MFG_DATE
      },
      verdict: isMatched ? '✔ AUTHENTIC' : '✖ TAMPERED'
    });

  } catch (err) {
    console.error('❌ Error in /verifyDbPart:', err);
    res.status(500).json({ status: 'ERROR', error: err.message });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// GET PART DETAILS (DB2 ONLY)
// ===============================
app.get('/parts/:partId', async (req, res) => {
  const { partId } = req.params;
  let conn;

  try {
    conn = await ibmdb.open(connStr);
    const sql = `SELECT * FROM RAMAN.AIRCRAFT_PART_MASTER WHERE PART_ID = ?`;
    const rows = await new Promise((resolve, reject) => {
      conn.query(sql, [partId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (!rows || rows.length === 0) {
      return res.status(404).json({ status: 'NOT_FOUND' });
    }

    res.json({ status: 'OK', part: rows[0] });

  } catch (err) {
    res.status(500).json({ status: 'ERROR', error: err.message });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// CLAIMS API (SKELETON)
// ===============================
// Create a claim for a part
app.post('/claims', verifyToken, requireRole('INSURER', 'CONSUMER'), async (req, res) => {
  const { partId, claimantId, insurerId, description } = req.body;

  if (!partId || !claimantId) {
    return res.status(400).json({ error: 'partId and claimantId required' });
  }

  let conn;

  try {
    conn = await ibmdb.open(connStr);

    // Check if CLAIMS table exists; for PoC, just log success
    const insertSql = `
      INSERT INTO RAMAN.CLAIMS (PART_ID, CLAIMANT_ID, INSURER_ID, STATUS, DESCRIPTION, CREATED_AT)
      VALUES (?, ?, ?, 'OPEN', ?, CURRENT_TIMESTAMP)
    `;

    await new Promise((resolve, reject) => {
      conn.query(insertSql, [partId, claimantId, insurerId, description], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.json({
      status: 'CREATED',
      message: 'Claim submitted',
      partId,
      claimantId
    });

  } catch (err) {
    console.warn('⚠ Claims table may not exist; resuming:', err.message);
    // Fallback: return success anyway for PoC
    res.json({
      status: 'CREATED',
      message: 'Claim logged (table not ready)',
      partId,
      claimantId
    });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// Get claims for insurer
app.get('/claims', verifyToken, requireRole('INSURER'), async (req, res) => {
  let conn;

  try {
    conn = await ibmdb.open(connStr);
    const sql = `SELECT * FROM RAMAN.CLAIMS ORDER BY CREATED_AT DESC`;
    const rows = await new Promise((resolve, reject) => {
      conn.query(sql, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    res.json({ status: 'OK', claims: rows });

  } catch (err) {
    console.warn('⚠ Claims table may not exist:', err.message);
    res.json({ status: 'OK', claims: [] });
  } finally {
    if (conn) {
      await conn.close();
    }
  }
});

// ===============================
// DEBUG: Inspect user record (DEV ONLY)
// Enable by setting environment variable DEBUG_AUTH=1 before starting the server.
// Example (PowerShell): $env:DEBUG_AUTH='1'; node server.js
// This endpoint is intentionally gated and should not be enabled in production.
app.get('/debug/user/:username', async (req, res) => {
  if (process.env.DEBUG_AUTH !== '1') {
    return res.status(403).json({ error: 'Debug endpoints disabled. Set DEBUG_AUTH=1 to enable.' });
  }

  const username = req.params.username;
  let conn;

  try {
    conn = await ibmdb.open(connStr);
    const sql = `SELECT USER_ID, USERNAME, PASSWORD_HASH, EMAIL, ROLE, PORTAL_TYPE FROM RAMAN.USERS WHERE USERNAME = ?`;
    const rows = await new Promise((resolve, reject) => {
      conn.query(sql, [username], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    if (!rows || rows.length === 0) {
      return res.status(404).json({ found: false, message: 'User not found' });
    }

    const u = rows[0];

    // Return non-sensitive debug info. Do not leak full password hashes.
    res.json({
      found: true,
      user: {
        userId: u.USER_ID,
        username: u.USERNAME,
        email: u.EMAIL,
        role: u.ROLE,
        portalType: u.PORTAL_TYPE,
        passwordHashPreview: u.PASSWORD_HASH ? `${u.PASSWORD_HASH.slice(0, 10)}...` : null
      }
    });

  } catch (err) {
    console.error('❌ Error in /debug/user:', err);
    res.status(500).json({ error: err.message });
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