# Authentication & Login Setup Guide

## Database Setup (DB2)

### Step 1: Create the USERS Table (Manual SQL)

Connect to your DB2 database and run the following SQL:

```sql
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
);

-- Create indexes  
CREATE INDEX IDX_USERS_USERNAME ON RAMAN.USERS(USERNAME);
CREATE INDEX IDX_USERS_ROLE ON RAMAN.USERS(ROLE);
```

### Step 2: Insert Demo Users (via Node.js Script)

Once the table is created, run:

```bash
cd backend
node initializeUsers.js
```

This will insert users as configured in the script.

---

## Alternative: Manual User Insert

If you prefer to insert users manually in DB2, create accounts with bcrypt-hashed passwords. Use the `/auth/register` endpoint or DB2 CLI to add users.

---

## Running the System with Authentication

### Terminal 1: Backend

```bash
cd backend
node server.js
# Runs on http://localhost:5000
```

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

### Open Browser

Go to **http://localhost:5173**

You'll see a login page. Register or use configured user accounts to log in.

---

## Features

✅ **Individual Logins** — Each user logs in with their own username/password  
✅ **Role-Based Portals** — Different UI based on user role (Supplier / Consumer / Insurer)  
✅ **JWT Authentication** — Tokens stored in localStorage and sent with each request  
✅ **Protected Routes** — API endpoints require valid JWT token  
✅ **Session Persistence** — Login persists across page refreshes  
✅ **Logout** — Clear token and return to login page  

---

## How Authentication Works

1. **Registration** (`POST /auth/register`)
   - User provides: username, password, email, role, portal type
   - Password is hashed with bcryptjs (salt rounds: 10)
   - User inserted into RAMAN.USERS table

2. **Login** (`POST /auth/login`)
   - User provides: username, password
   - Lookup user in RAMAN.USERS by username
   - Verify password using bcrypt.compareSync()
   - If valid, generate JWT token with exp 24h
   - Return token to frontend

3. **Protected Requests**
   - JWT token sent in Authorization header: `Authorization: Bearer <token>`
   - Backend middleware (`verifyToken`) checks token validity
   - RBAC middleware (`requireRole`) checks user role
   - Only SUPPLIER can POST /submitPart, INSURER can GET /claims, etc.

4. **Logout**
   - Frontend deletes token from localStorage
   - User redirected to login page

---

## API Endpoints

### Authentication (No JWT required)
- `POST /auth/register` — Register new user
- `POST /auth/login` — Login, returns JWT token
- `GET /auth/me` — Get current user info (requires JWT)
- `POST /auth/logout` — Logout (client-side delete token)

### Protected Endpoints (Require JWT + Role)
- `POST /submitPart` — Submit part (SUPPLIER role)
- `GET /verifyDbPart/:partId` — Verify part (any role)
- `POST /claims` — File claim (CONSUMER, INSURER roles)
- `GET /claims` — Fetch claims (INSURER role)

---

## Customizing Users

### Add a New User (via API)

**Register Endpoint** (No auth required for registration in PoC):

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_supplier",
    "password": "securepass123",
    "email": "john@supplier.com",
    "role": "SUPPLIER",
    "portalType": "SUPPLIER"
  }'
```

### Add a New User (via Database)

Generate a bcrypt hash for your password:

```javascript
// Run in Node.js console:
const bcrypt = require("bcryptjs");
const hash = bcrypt.hashSync("your_password_here", 10);
console.log(hash);
```

Then insert into DB2:

```sql
INSERT INTO RAMAN.USERS (USERNAME, PASSWORD_HASH, EMAIL, ROLE, PORTAL_TYPE) VALUES
('your_username', '<hashed_password>', 'email@example.com', 'SUPPLIER', 'SUPPLIER');
```

---

## Troubleshooting

**Issue:** Login fails with "User table not initialized"  
**Solution:** Create the USERS table in DB2 using the SQL provided above.

**Issue:** Can't create USERS table (permission denied)  
**Solution:** Contact DB2 admin or use admin credentials to create the table.

**Issue:** Login succeeds but token expires  
**Solution:** Token expiry is set to 24 hours. After expiry, user must login again.

**Issue:** "Invalid or expired token" error  
**Solution:** Token may have expired or been corrupted. Clear localStorage and login again.

---

## Next Steps

1. ✅ Create USERS table
2. ✅ Initialize demo users
3. ✅ Run backend + frontend
4. ✅ Login with demo account
5. ➜ Test role-based portals (Supplier submit, Consumer verify, Insurer dashboard)
6. ➜ Create new users via registration or database
7. ➜ Deploy to production with Keycloak for enterprise SSO

