const db = require("../config/db");

exports.residents = (req, res) => {
  const residents = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, u.mobile_number, u.address, u.status, u.created_at,
      COALESCE((SELECT SUM(CASE WHEN type='earned' THEN points ELSE -points END)
        FROM point_transactions WHERE user_id = u.id), 0) AS points_balance,
      (SELECT COUNT(*) FROM reports WHERE user_id = u.id) AS report_count
    FROM users u WHERE u.role = 'resident'
    ORDER BY u.created_at DESC
  `).all();
  res.json({ residents });
};

exports.analytics = (req, res) => {
  const totals = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM users WHERE role='resident') AS total_residents,
      (SELECT COUNT(*) FROM reports) AS total_reports,
      (SELECT COUNT(*) FROM reports WHERE status='pending') AS pending_reports,
      (SELECT COUNT(*) FROM reports WHERE status='verified') AS verified_reports,
      (SELECT COUNT(*) FROM reports WHERE status='resolved') AS resolved_reports,
      (SELECT COALESCE(SUM(points),0) FROM point_transactions WHERE type='earned') AS points_distributed
  `).get();

  const byCategory = db.prepare(`
    SELECT waste_category, COUNT(*) AS count FROM reports GROUP BY waste_category ORDER BY count DESC
  `).all();

  const byStatus = db.prepare(`
    SELECT status, COUNT(*) AS count FROM reports GROUP BY status
  `).all();

  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', created_at) AS month, COUNT(*) AS count
    FROM reports GROUP BY month ORDER BY month ASC
  `).all();

  res.json({ totals, byCategory, byStatus, monthly });
};
