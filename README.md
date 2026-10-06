# Barangay Eco Care

Integrated Waste Management, Environmental Reporting, Rewards, and Community Engagement System.

A full-stack web application: residents report waste and environmental concerns, barangay staff review and verify them, verified/resolved reports automatically earn residents non-monetary points, and points are redeemable for barangay-provided rewards.

---

## 1. Requirements

- **Node.js** 18 or newer (tested on Node 22)
- **npm** (comes with Node)

No separate database server is required — the app uses **SQLite**, stored as a single file inside the project.

---

## 2. Installation

```bash
cd backend
npm install
```

This installs Express, better-sqlite3 (the database driver), bcryptjs, express-session, multer, express-validator, helmet, dotenv, ejs, and connect-sqlite3.

---

## 3. Configuration

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Purpose | Default |
|---|---|---|
| `PORT` | Port the server runs on | `3000` |
| `SESSION_SECRET` | Secret used to sign session cookies | (change before real deployment) |
| `DEFAULT_ADMIN_EMAIL` | Email for the seeded administrator account | `admin@barangayecocare.gov.ph` |
| `DEFAULT_ADMIN_PASSWORD` | Password for the seeded administrator account | `ChangeMe!2026` |

---

## 4. Database setup

The database schema is created automatically the first time the server starts (see `backend/database/schema.sql`).

To create the **default administrator account** plus a sample staff account, a sample resident, and sample rewards, run the seed script once:

```bash
npm run seed
```

This is the **secure setup process** for the first admin account — there is no public admin registration page, exactly as required. The seed script prints the admin login to the console.

If you ever need to reset the database, delete `backend/database/barangayecocare.db` and re-run `npm run seed`.

---

## 5. Running the app

```bash
npm start
```

Then open **http://localhost:3000** in your browser.

For development with auto-reload on file changes, you can instead run:

```bash
npx nodemon server.js
```

(nodemon is not included by default — `npm install -D nodemon` first if you want it.)

---

## 6. Default accounts (after running `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Administrator | admin@barangayecocare.gov.ph | ChangeMe!2026 |
| Barangay staff | fatima.merida@barangayecocare.gov.ph | StaffPass123! |
| Resident (sample) | juan.delacruz@email.com | ResidentPass123! |

**Change the admin password immediately** (Resident/Staff dashboards don't currently expose a password-change UI for the seeded admin from the sidebar — log in, then use the `/api/profile/password` endpoint, or change `DEFAULT_ADMIN_PASSWORD` in `.env` and re-seed on a fresh database).

New residents register themselves through **Create account** on the landing page — there is **no role selector** on that form, exactly as required. New accounts are always created as Residents. Staff accounts can only be created by an Administrator, from the Admin dashboard's **Staff management** page.

---

## 7. Project structure

```
barangayecocare/
├── README.md
└── backend/
    ├── server.js              # App entry point — sessions, security, routing
    ├── package.json
    ├── .env.example
    ├── config/
    │   ├── db.js               # SQLite connection, runs schema.sql on boot
    │   └── upload.js           # Multer config for report photo uploads
    ├── database/
    │   ├── schema.sql           # Full relational schema (12 tables)
    │   └── seed.js              # Creates default admin/staff/resident + sample data
    ├── middleware/
    │   └── auth.js              # requireAuth, requireRole, redirectIfAuthenticated
    ├── controllers/
    │   ├── authController.js
    │   ├── reportController.js
    │   ├── rewardController.js
    │   ├── activityController.js
    │   ├── notificationController.js
    │   ├── profileController.js
    │   ├── staffController.js
    │   └── adminController.js
    ├── routes/
    │   ├── auth.js, reports.js, rewards.js, activities.js,
    │   └── notifications.js, profile.js, staff.js, admin.js
    ├── views/                   # EJS pages (server-rendered shell)
    │   ├── landing.ejs, login.ejs, signup.ejs, error.ejs
    │   ├── resident-dashboard.ejs, staff-dashboard.ejs, admin-dashboard.ejs
    │   └── partials/brand.ejs
    └── public/
        ├── css/style.css        # Full dark theme
        ├── js/                  # common.js, auth.js, resident.js, staff.js, admin.js
        └── uploads/              # Resident-submitted report photos land here
```

**Architecture note:** pages are server-rendered shells (EJS) that load client-side JavaScript, which then talks to the JSON REST API under `/api/*` for all data and actions (login, submit report, verify report, redeem reward, etc.). Session cookies (not tokens) authenticate API calls, so the frontend JS always uses `credentials` on fetch.

---

## 8. Roles and access

Registration never asks the user to pick a role. Every self-registered account is a **Resident**. Staff and Admin accounts are provisioned separately:

- **Admin** accounts: only created via `npm run seed` (first one) or by an existing Admin from **Admin → Staff management → Create staff account** (for staff) — admin-to-admin promotion isn't exposed in the UI by design; do it directly in the database if truly needed.
- **Staff** accounts: created only by an Admin.
- **Resident** accounts: created by anyone via the public sign-up form.

All authorization is enforced **server-side** in `middleware/auth.js` (`requireRole`) on every protected route and page — not just hidden in the frontend. A resident calling a staff/admin-only API endpint directly gets a `403`.

| Role | Access |
|---|---|
| Resident | Resident dashboard, submit/track own reports, points & rewards, activities, profile |
| Staff | Staff dashboard, view/verify/reject/resolve **all** reports, view residents, analytics, create activities |
| Admin | Admin dashboard, user management (activate/deactivate/edit), staff account creation, rewards catalog management, system settings, audit logs |

---

## 9. Core flow implemented

```
Landing page → Create account (Resident only) / Log in
  → Resident submits a waste/environmental report (with optional photo)
  → Report saved with status "pending", staff notified implicitly (visible on their dashboard)
  → Staff reviews: mark Under review / Verify / Reject / Resolve, with a response
  → On Verify or Resolve: resident automatically earns points (10 / 20), notified
  → Resident checks Rewards, redeems a reward for points (confirmation modal, balance checked)
  → Redemption recorded, resident notified, points deducted
  → Admin can see everything in aggregate: users, rewards catalog, audit trail of admin actions
```

All of the above was tested end-to-end against the running server during development (registration, validation errors, duplicate email/username, login, logout, session-protected pages, role-based 403s, report submission with and without a photo, invalid file type rejection, status transitions, automatic point awarding, reward redemption with insufficient-points rejection, activity registration, admin user activation/deactivation blocking login, staff creation, reward CRUD, settings update, and audit log recording).

---

## 10. Security notes

- Passwords are hashed with **bcrypt** (via bcryptjs), never stored in plain text.
- Sessions are **httpOnly** cookies backed by a SQLite session store (`connect-sqlite3`), separate from the main database file.
- All mutating routes require an authenticated session; role-specific routes additionally check the session's role server-side.
- `helmet` is applied for baseline security headers.
- Report photo uploads are restricted by file extension (JPG/PNG/WEBP) and size (5MB).
- Input validation runs server-side (`express-validator` for auth; manual checks in controllers for reports/profile) — the frontend validation is a convenience layer only, never trusted alone.
- **For a real deployment** (this project is set up for local thesis demonstration/grading): set a strong unique `SESSION_SECRET`, serve over HTTPS, set cookie `secure: true`, and review `helmet`'s `contentSecurityPolicy` (currently disabled for simplicity).

---

## 11. Known simplifications

Given the scope of a single capstone deliverable, a few things are intentionally simple rather than enterprise-grade:

- No CSRF token middleware is wired in (session + `sameSite: lax` cookies mitigate the most common case for this local/demo context) — note this to your panel if asked, and `csurf`-style protection can be added as a follow-up.
- Analytics charts are rendered as simple CSS bar rows rather than a charting library, to avoid an external dependency.
- Admin cannot promote an existing Staff to Admin from the UI (only create new Staff) — this was a deliberate reading of "administrative access must be controlled securely," left as a direct database action rather than a self-service UI toggle.
