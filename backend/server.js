require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");

const db = require("./config/db");
const { requireAuth, requireRole, redirectIfAuthenticated } = require("./middleware/auth");

const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const rewardRoutes = require("./routes/rewards");
const activityRoutes = require("./routes/activities");
const notificationRoutes = require("./routes/notifications");
const profileRoutes = require("./routes/profile");
const staffRoutes = require("./routes/staff");
const adminRoutes = require("./routes/admin");

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(helmet({
  contentSecurityPolicy: false // kept simple for local thesis demo; tighten before any public deployment
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  store: new SQLiteStore({ db: "sessions.db", dir: path.join(__dirname, "database") }),
  secret: process.env.SESSION_SECRET || "barangay-eco-care-dev-secret-change-me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: "lax"
  }
}));

// Make current user available to all views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ---------- API routes ----------
app.use("/api/auth", authRoutes);
app.use("/api/reports", requireAuth, reportRoutes);
app.use("/api/rewards", requireAuth, rewardRoutes);
app.use("/api/activities", requireAuth, activityRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);
app.use("/api/profile", requireAuth, profileRoutes);
app.use("/api/staff", requireAuth, staffRoutes);
app.use("/api/admin", requireAuth, adminRoutes);

// ---------- Page routes ----------
app.get("/", (req, res) => res.render("landing"));
app.get("/login", redirectIfAuthenticated, (req, res) => res.render("login"));
app.get("/signup", redirectIfAuthenticated, (req, res) => res.render("signup"));

app.get("/resident/dashboard", requireRole("resident"), (req, res) => res.render("resident-dashboard"));
app.get("/staff/dashboard", requireRole("staff", "admin"), (req, res) => res.render("staff-dashboard"));
app.get("/admin/dashboard", requireRole("admin"), (req, res) => res.render("admin-dashboard"));

// ---------- Error handlers ----------
app.use((req, res) => {
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(404).json({ error: "This endpoint does not exist." });
  }
  res.status(404).render("error", { code: 404, message: "The page you're looking for doesn't exist." });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err.message && err.message.includes("Only JPG")) {
    return res.status(400).json({ error: err.message });
  }
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(500).json({ error: "Something went wrong on our end. Please try again." });
  }
  res.status(500).render("error", { code: 500, message: "Something went wrong on our end. Please try again." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Barangay Eco Care server running at http://localhost:${PORT}`);
});
