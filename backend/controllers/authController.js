const bcrypt = require("bcryptjs");
const db = require("../config/db");

function toSessionUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    role: row.role,
    barangay: row.barangay
  };
}

exports.register = (req, res) => {
  const {
    first_name, middle_name, last_name, suffix,
    username, email, mobile_number, address, barangay,
    password
  } = req.body;

  const existingEmail = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existingEmail) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  const existingUsername = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existingUsername) {
    return res.status(409).json({ error: "This username is already taken." });
  }

  const password_hash = bcrypt.hashSync(password, 10);

  // Normal registration always creates a Resident account.
  // Staff and Admin accounts can only be created by an Administrator (see admin routes).
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash, first_name, middle_name, last_name, suffix,
      mobile_number, address, barangay, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resident', 'active')
  `).run(username, email, password_hash, first_name, middle_name || null, last_name, suffix || null,
    mobile_number, address, barangay || "San Isidro");

  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);

  db.prepare("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)")
    .run(user.id, "Welcome to Barangay Eco Care",
      "Your resident account has been created. Start by submitting your first report or exploring community activities.",
      "account");

  req.session.user = toSessionUser(user);
  res.status(201).json({ message: "Account created successfully.", user: toSessionUser(user) });
};

exports.login = (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (user.status !== "active") {
    return res.status(403).json({ error: "This account has been deactivated. Contact the barangay office." });
  }

  req.session.user = toSessionUser(user);

  const dest = user.role === "admin" ? "/admin/dashboard"
    : user.role === "staff" ? "/staff/dashboard"
    : "/resident/dashboard";

  res.json({ message: "Login successful.", user: toSessionUser(user), redirect: dest });
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
};

exports.me = (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "Not logged in." });
  res.json({ user: req.session.user });
};
