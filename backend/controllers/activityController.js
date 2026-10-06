const db = require("../config/db");

exports.list = (req, res) => {
  const activities = db.prepare(
    "SELECT * FROM activities ORDER BY activity_date ASC"
  ).all();

  const withCounts = activities.map(a => {
    const count = db.prepare("SELECT COUNT(*) AS c FROM activity_participants WHERE activity_id = ?").get(a.id).c;
    const registered = req.session.user
      ? !!db.prepare("SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?")
          .get(a.id, req.session.user.id)
      : false;
    return { ...a, participant_count: count, registered };
  });

  res.json({ activities: withCounts });
};

exports.register = (req, res) => {
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(req.params.id);
  if (!activity) return res.status(404).json({ error: "Activity not found." });

  const existing = db.prepare("SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?")
    .get(activity.id, req.session.user.id);
  if (existing) return res.status(409).json({ error: "You are already registered for this activity." });

  db.prepare("INSERT INTO activity_participants (activity_id, user_id) VALUES (?, ?)")
    .run(activity.id, req.session.user.id);

  res.status(201).json({ message: "You're registered for this activity." });
};

// ---- Staff / Admin management ----

exports.create = (req, res) => {
  const { title, description, activity_date, activity_time, location, organizer } = req.body;
  if (!title || !activity_date) {
    return res.status(400).json({ error: "Please complete all required fields." });
  }
  const info = db.prepare(`
    INSERT INTO activities (title, description, activity_date, activity_time, location, organizer, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, activity_date, activity_time || null, location || null,
    organizer || null, req.session.user.id);
  res.status(201).json({ message: "Activity created successfully.", id: info.lastInsertRowid });
};

exports.update = (req, res) => {
  const { title, description, activity_date, activity_time, location, organizer, status } = req.body;
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(req.params.id);
  if (!activity) return res.status(404).json({ error: "Activity not found." });

  db.prepare(`
    UPDATE activities SET title=?, description=?, activity_date=?, activity_time=?, location=?, organizer=?, status=?
    WHERE id = ?
  `).run(title || activity.title, description ?? activity.description, activity_date || activity.activity_date,
    activity_time ?? activity.activity_time, location ?? activity.location, organizer ?? activity.organizer,
    status || activity.status, activity.id);

  res.json({ message: "Activity updated successfully." });
};

exports.remove = (req, res) => {
  const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(req.params.id);
  if (!activity) return res.status(404).json({ error: "Activity not found." });
  db.prepare("DELETE FROM activity_participants WHERE activity_id = ?").run(activity.id);
  db.prepare("DELETE FROM activities WHERE id = ?").run(activity.id);
  res.json({ message: "Activity deleted successfully." });
};

exports.participants = (req, res) => {
  const list = db.prepare(`
    SELECT u.id, u.first_name, u.last_name, u.username, p.registered_at
    FROM activity_participants p JOIN users u ON u.id = p.user_id
    WHERE p.activity_id = ? ORDER BY p.registered_at ASC
  `).all(req.params.id);
  res.json({ participants: list });
};
