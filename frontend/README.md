# SupplyChain Frontend (PoC)

Run the React frontend (Vite) for local development.

Prerequisites: Node.js 18+ and npm installed.

Install and start:

```bash
cd frontend
npm install
npm run dev
```

The dev server runs on `http://localhost:5173`. The backend API is expected at `http://localhost:5000`.

For production build (served by backend):

```bash
npm run build
# copy the generated dist/ to backend or run backend which serves ../frontend/dist
```
