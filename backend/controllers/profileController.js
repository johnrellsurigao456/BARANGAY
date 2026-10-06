const bcrypt = require("bcryptjs");
const db = require("../config/db");

exports.getProfile = (req, res) => {
  const user = db.prepare(`
    SELECT id, username, email, first_name, middle_name, last_name, suffix,
      mobile_number, address, barangay, role, created_at, profile_photo
    FROM users WHERE id = ?
  `).get(req.session.user.id);
  res.json({ user });
};

exports.updateProfile = (req, res) => {
  const { first_name, middle_name, last_name, suffix, mobile_number, address } = req.body;
  if (!first_name || !last_name || !mobile_number || !address) {
    return res.status(400).json({ error: "Please complete all required fields." });
  }
  if (!/^(09|\+639)\d{9}$/.test(mobile_number)) {
    return res.status(400).json({ error: "Please enter a valid Philippine mobile number." });
  }

  db.prepare(`
    UPDATE users SET first_name=?, middle_name=?, last_name=?, suffix=?, mobile_number=?, address=?, updated_at=datetime('now')
    WHERE id = ?
  `).run(first_name, middle_name || null, last_name, suffix || null, mobile_number, address, req.session.user.id);

  req.session.user.first_name = first_name;
  req.session.user.last_name = last_name;

  res.json({ message: "Profile updated successfully." });
};

exports.changePassword = (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.user.id);

  if (!bcrypt.compareSync(current_password || "", user.password_hash)) {
    return res.status(400).json({ error: "Current password is incorrect." });
  }
  if (!new_password || new_password.length < 8 || !/\d/.test(new_password)) {
    return res.status(400).json({ error: "New password must be at least 8 characters and include a number." });
  }
  if (new_password !== confirm_password) {
    return res.status(400).json({ error: "Password confirmation does not match." });
  }

  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
    .run(hash, user.id);

  res.json({ message: "Password changed successfully." });
};
