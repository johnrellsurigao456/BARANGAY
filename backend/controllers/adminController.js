const bcrypt = require("bcryptjs");
const db = require("../config/db");

function logAction(userId, action, details) {
  db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
    .run(userId, action, details || null);
}

exports.stats = (req, res) => {
  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users) AS total_users,
      (SELECT COUNT(*) FROM users WHERE role='resident') AS total_residents,
      (SELECT COUNT(*) FROM users WHERE role='staff') AS total_staff,
      (SELECT COUNT(*) FROM reports) AS total_reports,
      (SELECT COUNT(*) FROM reports WHERE status='pending') AS pending_reports,
      (SELECT COUNT(*) FROM reports WHERE status='resolved') AS resolved_reports,
      (SELECT COUNT(*) FROM rewards) AS total_rewards,
      (SELECT COUNT(*) FROM redemptions) AS total_redemptions
  `).get();
  res.json({ stats });
};

exports.listUsers = (req, res) => {
  const { role, q } = req.query;
  let sql = "SELECT id, username, email, first_name, last_name, role, status, created_at FROM users WHERE 1=1";
  const params = [];
  if (role) { sql += " AND role = ?"; params.push(role); }
  if (q) { sql += " AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR username LIKE ?)"; 
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`); }
  sql += " ORDER BY created_at DESC";
  res.json({ users: db.prepare(sql).all(...params) });
};

exports.getUser = (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, first_name, middle_name, last_name, suffix, mobile_number,
      address, barangay, role, status, created_at FROM users WHERE id = ?
  `).get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });
  res.json({ user });
};

exports.setUserStatus = (req, res) => {
  const { status } = req.body;
  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, user.id);
  logAction(req.session.user.id, "user_status_change", `User #${user.id} (${user.email}) set to ${status}`);
  res.json({ message: `Account ${status === "active" ? "activated" : "deactivated"} successfully.` });
};

exports.updateUser = (req, res) => {
  const { first_name, last_name, mobile_number, address, barangay } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found." });

  db.prepare(`
    UPDATE users SET first_name=?, last_name=?, mobile_number=?, address=?, barangay=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(first_name || user.first_name, last_name || user.last_name, mobile_number || user.mobile_number,
    address || user.address, barangay || user.barangay, user.id);

  logAction(req.session.user.id, "user_edit", `User #${user.id} (${user.email}) updated`);
  res.json({ message: "Account updated successfully." });
};

// Staff accounts can only be created by an administrator, per system policy.
exports.createStaff = (req, res) => {
  const { first_name, last_name, username, email, mobile_number, address, barangay, password } = req.body;
  if (!first_name || !last_name || !username || !email || !mobile_number || !address || !password) {
    return res.status(400).json({ error: "Please complete all required fields." });
  }
  if (db.prepare("SELECT id FROM users WHERE email = ?").get(email)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }
  if (db.prepare("SELECT id FROM users WHERE username = ?").get(username)) {
    return res.status(409).json({ error: "This username is already taken." });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash, first_name, last_name, mobile_number, address, barangay, role, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'staff', 'active')
  `).run(username, email, password_hash, first_name, last_name, mobile_number, address, barangay || "San Isidro");

  logAction(req.session.user.id, "staff_create", `Staff account created: ${email}`);
  res.status(201).json({ message: "Staff account created successfully.", id: info.lastInsertRowid });
};

// ---- Rewards management ----

exports.createReward = (req, res) => {
  const { name, description, points_required, quantity_available } = req.body;
  if (!name || !points_required) {
    return res.status(400).json({ error: "Please complete all required fields." });
  }
  const info = db.prepare(`
    INSERT INTO rewards (name, description, points_required, quantity_available) VALUES (?, ?, ?, ?)
  `).run(name, description || null, points_required, quantity_available || 0);
  logAction(req.session.user.id, "reward_create", `Reward created: ${name}`);
  res.status(201).json({ message: "Reward added successfully.", id: info.lastInsertRowid });
};

exports.updateReward = (req, res) => {
  const { name, description, points_required, quantity_available, status } = req.body;
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(req.params.id);
  if (!reward) return res.status(404).json({ error: "Reward not found." });

  db.prepare(`
    UPDATE rewards SET name=?, description=?, points_required=?, quantity_available=?, status=? WHERE id=?
  `).run(name || reward.name, description ?? reward.description, points_required || reward.points_required,
    quantity_available ?? reward.quantity_available, status || reward.status, reward.id);

  res.json({ message: "Reward updated successfully." });
};

exports.deleteReward = (req, res) => {
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ?").get(req.params.id);
  if (!reward) return res.status(404).json({ error: "Reward not found." });
  db.prepare("UPDATE rewards SET status = 'inactive' WHERE id = ?").run(reward.id);
  res.json({ message: "Reward deactivated successfully." });
};

exports.listRewardsAdmin = (req, res) => {
  res.json({ rewards: db.prepare("SELECT * FROM rewards ORDER BY created_at DESC").all() });
};

// ---- Settings & audit ----

exports.getSettings = (req, res) => {
  res.json({ settings: db.prepare("SELECT * FROM system_settings WHERE id = 1").get() });
};

exports.updateSettings = (req, res) => {
  const { barangay_name, contact_email, contact_number } = req.body;
  db.prepare(`
    UPDATE system_settings SET barangay_name=?, contact_email=?, contact_number=?, updated_at=datetime('now')
    WHERE id = 1
  `).run(barangay_name, contact_email, contact_number);
  logAction(req.session.user.id, "settings_update", "System settings updated");
  res.json({ message: "Settings updated successfully." });
};

exports.auditLogs = (req, res) => {
  const logs = db.prepare(`
    SELECT a.*, u.first_name, u.last_name FROM audit_logs a
    LEFT JOIN users u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 200
  `).all();
  res.json({ logs });
};
