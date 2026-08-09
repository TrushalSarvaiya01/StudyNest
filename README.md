StudyNest

A semester-based study material portal. Students can browse departments → semesters → subjects → documents and search across everything; admins can log in to manage the catalog and upload PDFs.

Tech Stack

Frontend

React 18 + React Router v6
Axios for API calls
Framer Motion (animations)
lucide-react (icons)
Create React App (react-scripts)

Backend

Node.js + Express
MongoDB + Mongoose
JWT for admin authentication
bcryptjs for password hashing
Cloudinary for PDF storage
Multer + streamifier for file upload handling
Project Structure
root/
├── backend/
│   ├── config/           # DB connection + Cloudinary config
│   ├── middleware/        # JWT auth middleware
│   ├── models/             # Mongoose schemas (Admin, Department, Semester, Subject, Document)
│   ├── routes/             # publicRoutes.js, adminRoutes.js
│   ├── scripts/            # One-off migration scripts
│   ├── utils/               # Pagination/sort helpers
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/    # Navbar, Sidebar, Breadcrumbs, ProtectedRoute, etc.
│   │   ├── pages/           # Home, Department, Semester, Subject, Login, Admin*
│   │   ├── services/        # api.js (Axios instance + auth helpers)
│   │   ├── App.js
│   │   └── styles.css
│   ├── .env.example
│   └── package.json
└── .gitignore

Note: frontend must sit at the project root, as a sibling of backend — not nested inside it — for the .gitignore rules and build tooling to work correctly.

Getting Started
Prerequisites
Node.js 18+
A MongoDB database (local or Atlas)
A Cloudinary account (for PDF storage)
1. Backend setup
bash
cd backend
npm install
cp .env.example .env

Fill in backend/.env:

Variable	Description
PORT	Port the API runs on (default 5000)
MONGO_URI	MongoDB connection string
JWT_SECRET	Long random string used to sign admin JWTs
ADMIN_USERNAME	Admin login username (auto-seeded on first server start)
ADMIN_PASSWORD	Admin login password (auto-seeded / auto-updated on start)
CLOUDINARY_CLOUD_NAME	From your Cloudinary dashboard
CLOUDINARY_API_KEY	From your Cloudinary dashboard
CLOUDINARY_API_SECRET	From your Cloudinary dashboard

Run it:

bash
npm run dev      # nodemon, for local development
npm start          # plain node, for production

The API will be available at http://localhost:5000/api. Check GET /api/health to confirm it's running.

2. Frontend setup
bash
cd frontend
npm install
cp .env.example .env

Fill in frontend/.env:

Variable	Description
REACT_APP_API_URL	Full base URL of the backend API, including the /api suffix (e.g. http://localhost:5000/api locally, https://your-backend.example.com/api in production)

⚠️ Create React App bakes REACT_APP_API_URL into the build at build time. If you change this value, you must run npm run build again — editing .env alone does not update an existing production build.

Run it:

bash
npm start          # local dev server, http://localhost:3000
npm run build   # production build, output in frontend/build/
API Overview

All routes are prefixed with /api.

Public

GET /health — health check
GET /departments, GET /departments/:id, GET /departments/:id/semesters
GET /semesters, GET /semesters/:id, GET /semesters/:id/subjects
GET /subjects/:id, GET /subjects/:id/documents
GET /overview — dashboard-style aggregate stats
GET /search?q=... — search across documents
GET /documents/:id/download — streams the PDF from Cloudinary
POST /admin/login — returns a JWT

Admin (requires Authorization: Bearer <token>)

POST/PUT/DELETE /admin/department, /admin/semester, /admin/subject
POST /admin/document — uploads a PDF (multipart) to Cloudinary and creates a record
GET/PUT/DELETE /admin/document(s)
GET /admin/stats, GET /admin/recent-documents
Deployment Notes
Deploy the backend first (Render, Railway, Fly.io, a VPS, etc.) and set its environment variables on the host — never commit .env.
Confirm the backend is reachable at <backend-url>/api/health.
Set REACT_APP_API_URL in frontend/.env to the real backend URL, then run npm run build.
Deploy the contents of frontend/build/ to a static host (Vercel, Netlify, GitHub Pages, etc.).
Security
Never commit .env files — only .env.example should be tracked in git.
Rotate MONGO_URI credentials, JWT_SECRET, and Cloudinary keys if they are ever exposed (e.g. shared in a zip, screenshot, or committed by accident).
Admin credentials (ADMIN_USERNAME / ADMIN_PASSWORD) are seeded automatically by the backend on startup — change them via environment variables, not by editing the database directly.
