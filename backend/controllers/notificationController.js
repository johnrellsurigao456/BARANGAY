const db = require("../config/db");

exports.list = (req, res) => {
  const notifications = db.prepare(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
  ).all(req.session.user.id);
  const unread = db.prepare(
    "SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0"
  ).get(req.session.user.id).c;
  res.json({ notifications, unread_count: unread });
};

exports.markRead = (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.session.user.id);
  res.json({ message: "Notification marked as read." });
};

exports.markAllRead = (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(req.session.user.id);
  res.json({ message: "All notifications marked as read." });
};
