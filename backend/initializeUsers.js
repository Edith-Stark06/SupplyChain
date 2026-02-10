// initializeUsers.js
// Script to initialize demo users in DB2
// Run: node backend/initializeUsers.js

const ibmdb = require('ibm_db');
const bcrypt = require('bcryptjs');

const connStr =
  "DATABASE=AIRSCM;" +
  "HOSTNAME=127.0.0.1;" +
  "PORT=25000;" +
  "PROTOCOL=TCPIP;" +
  "UID=db2admin;" +
  "PWD=db2ramana;";

// Demo users removed. Configure users manually via DB2 or API endpoints.
const demoUsers = [];

async function initializeUsers() {
  let conn;

  try {
    conn = await ibmdb.open(connStr);

    console.log('✓ Connected to DB2');

    // Try to create USERS table if it doesn't exist
    try {
      const createTableSql = `
        CREATE TABLE RAMAN.USERS (
          USER_ID INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
          USERNAME VARCHAR(50) UNIQUE NOT NULL,
          PASSWORD_HASH VARCHAR(255) NOT NULL,
          EMAIL VARCHAR(100),
          ROLE VARCHAR(20) NOT NULL,
          PORTAL_TYPE VARCHAR(20) NOT NULL,
          ACTIVE SMALLINT DEFAULT 1,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          LAST_LOGIN TIMESTAMP
        )
      `;

      await new Promise((resolve, reject) => {
        conn.query(createTableSql, [], (err) => {
          if (err && (err.message.includes('already exists') || err.message.includes('SQL0601'))) {
            // Table already exists
            resolve();
          } else if (err && err.message.includes('privilege')) {
            // Insufficient permissions but table might exist
            console.log('⚠ Insufficient permissions to create table (this is okay if it already exists)');
            resolve();
          } else if (err) {
            reject(err);
          } else {
            console.log('📋 Created USERS table');
            resolve();
          }
        });
      });

      console.log('✓ USERS table ready (or already exists)');
    } catch (err) {
      console.error('⚠ Could not create table:', err.message);
      console.log('   Attempting to use existing table...');
    }

    // Insert demo users
    let insertedCount = 0;
    for (const user of demoUsers) {
      try {
        // Check if user exists
        const checkSql = `SELECT USERNAME FROM RAMAN.USERS WHERE USERNAME = ?`;
        const existing = await new Promise((resolve, reject) => {
          conn.query(checkSql, [user.username], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          });
        });

        if (existing.length > 0) {
          console.log(`  ⊘ User '${user.username}' already exists`);
          continue;
        }

        // Hash password and insert
        const hashedPassword = bcrypt.hashSync(user.password, 10);
        const insertSql = `
          INSERT INTO RAMAN.USERS (USERNAME, PASSWORD_HASH, EMAIL, ROLE, PORTAL_TYPE)
          VALUES (?, ?, ?, ?, ?)
        `;

        await new Promise((resolve, reject) => {
          conn.query(insertSql, [user.username, hashedPassword, user.email, user.role, user.portalType], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        console.log(`  ✓ Inserted user: ${user.username} (${user.role})`);
        insertedCount++;
      } catch (err) {
        console.error(`  ✖ Error inserting user '${user.username}':`, err.message);
      }
    }

    console.log(`\n✓ Initialization complete. ${insertedCount} users added.`);
    if (insertedCount === 0) {
      console.log('\n⚠ No new users were added. If no users exist, create them manually via DB2 CLI or REST API.');
    }
  } catch (err) {
    console.error('❌ Error initializing users:', err);
    console.error('\nMake sure:');
    console.error('  1. DB2 is running on localhost:25000');
    console.error('  2. Database "AIRSCM" exists');
    console.error('  3. RAMAN user/schema exists');
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

// Run initialization
initializeUsers();
