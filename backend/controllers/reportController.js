const db = require("../config/db");

function generateReportCode() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  const countToday = db.prepare(
    "SELECT COUNT(*) AS c FROM reports WHERE report_code LIKE ?"
  ).get(`RPT-${datePart}-%`).c;
  const seq = String(countToday + 1).padStart(4, "0");
  return `RPT-${datePart}-${seq}`;
}

const WASTE_CATEGORIES = [
  "Improper Waste Disposal", "Illegal Dumping", "Uncollected Waste",
  "Overflowing Garbage", "Burning of Waste", "Blocked Drainage", "Other Environmental Concern"
];

exports.create = (req, res) => {
  const { report_type, waste_category, description, location, incident_datetime, additional_notes } = req.body;

  if (!report_type || !waste_category || !description || !location || !incident_datetime) {
    return res.status(400).json({ error: "Please complete all required fields." });
  }
  if (!WASTE_CATEGORIES.includes(waste_category)) {
    return res.status(400).json({ error: "Please select a valid waste category." });
  }
  if (description.trim().length < 10) {
    return res.status(400).json({ error: "Please provide a more detailed description (at least 10 characters)." });
  }

  const report_code = generateReportCode();
  const photo_path = req.file ? `/uploads/${req.file.filename}` : null;

  const info = db.prepare(`
    INSERT INTO reports (report_code, user_id, report_type, waste_category, description,
      location, incident_datetime, photo_path, additional_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(report_code, req.session.user.id, report_type, waste_category, description.trim(),
    location, incident_datetime, photo_path, additional_notes || null);

  db.prepare(`INSERT INTO report_status_history (report_id, status, changed_by, note)
    VALUES (?, 'pending', ?, 'Report submitted by resident.')`)
    .run(info.lastInsertRowid, req.session.user.id);

  res.status(201).json({
    message: "Your report has been submitted successfully.",
    report_code
  });
};

exports.myReports = (req, res) => {
  const reports = db.prepare(
    "SELECT * FROM reports WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.session.user.id);
  res.json({ reports });
};

exports.myReportDetail = (req, res) => {
  const report = db.prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.session.user.id);
  if (!report) return res.status(404).json({ error: "Report not found." });

  const history = db.prepare(
    "SELECT * FROM report_status_history WHERE report_id = ? ORDER BY changed_at ASC"
  ).all(report.id);

  res.json({ report, history });
};

// ---- Staff ----

exports.allReports = (req, res) => {
  const { status } = req.query;
  let reports;
  if (status) {
    reports = db.prepare(`
      SELECT r.*, u.first_name, u.last_name, u.username
      FROM reports r JOIN users u ON u.id = r.user_id
      WHERE r.status = ?
      ORDER BY r.created_at DESC
    `).all(status);
  } else {
    reports = db.prepare(`
      SELECT r.*, u.first_name, u.last_name, u.username
      FROM reports r JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `).all();
  }
  res.json({ reports });
};

const STATUS_POINTS = { verified: 10, resolved: 20 };

exports.updateStatus = (req, res) => {
  const { status, response } = req.body;
  const validStatuses = ["under_review", "verified", "resolved", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value." });
  }

  const report = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found." });

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE reports SET status = ?, staff_response = ?, verified_by = ?, verified_at = ?
    WHERE id = ?
  `).run(status, response || report.staff_response, req.session.user.id,
    (status === "verified" || status === "resolved") ? now : report.verified_at, report.id);

  db.prepare(`INSERT INTO report_status_history (report_id, status, changed_by, note)
    VALUES (?, ?, ?, ?)`).run(report.id, status, req.session.user.id, response || null);

  // Award non-monetary points automatically when verified or resolved, once per milestone.
  if (STATUS_POINTS[status]) {
    const already = db.prepare(`
      SELECT id FROM point_transactions WHERE reference_type = 'report' AND reference_id = ? AND description LIKE ?
    `).get(report.id, `%${status}%`);
    if (!already) {
      db.prepare(`INSERT INTO point_transactions (user_id, points, type, reference_type, reference_id, description)
        VALUES (?, ?, 'earned', 'report', ?, ?)`)
        .run(report.user_id, STATUS_POINTS[status], report.id,
          `Points for report ${report.report_code} marked as ${status}`);

      db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'points')`)
        .run(report.user_id, "Points earned",
          `Your report ${report.report_code} was marked as ${status}. You earned ${STATUS_POINTS[status]} points.`);
    }
  }

  const notifTitle = status === "rejected" ? "Report rejected" : "Report update";
  const notifMsg = status === "rejected"
    ? `Your report ${report.report_code} was rejected. Reason: ${response || "No reason provided."}`
    : `Your report ${report.report_code} status changed to ${status.replace("_", " ")}.`;
  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'report')`)
    .run(report.user_id, notifTitle, notifMsg);

  res.json({ message: "Report updated successfully." });
};
