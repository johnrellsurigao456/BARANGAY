const db = require("../config/db");

function getBalance(userId) {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) AS earned,
      COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) AS redeemed
    FROM point_transactions WHERE user_id = ?
  `).get(userId);
  return {
    balance: row.earned - row.redeemed,
    total_earned: row.earned,
    total_redeemed: row.redeemed
  };
}

exports.myPoints = (req, res) => {
  const summary = getBalance(req.session.user.id);
  const history = db.prepare(
    "SELECT * FROM point_transactions WHERE user_id = ? ORDER BY created_at DESC"
  ).all(req.session.user.id);
  res.json({ ...summary, history });
};

exports.listRewards = (req, res) => {
  const rewards = db.prepare(
    "SELECT * FROM rewards WHERE status = 'active' ORDER BY points_required ASC"
  ).all();
  res.json({ rewards });
};

function generateRedemptionCode() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");
  return `RDM-${datePart}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

exports.redeem = (req, res) => {
  const reward = db.prepare("SELECT * FROM rewards WHERE id = ? AND status = 'active'").get(req.params.id);
  if (!reward) return res.status(404).json({ error: "No available rewards at the moment." });
  if (reward.quantity_available <= 0) {
    return res.status(400).json({ error: "This reward is currently out of stock." });
  }

  const { balance } = getBalance(req.session.user.id);
  if (balance < reward.points_required) {
    return res.status(400).json({ error: "You don't have enough points for this reward." });
  }

  const redemption_code = generateRedemptionCode();

  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO point_transactions (user_id, points, type, reference_type, description)
      VALUES (?, ?, 'redeemed', 'reward', ?)`)
      .run(req.session.user.id, reward.points_required, `Redeemed: ${reward.name}`);

    db.prepare(`INSERT INTO redemptions (redemption_code, user_id, reward_id, points_used, status)
      VALUES (?, ?, ?, ?, 'pending')`)
      .run(redemption_code, req.session.user.id, reward.id, reward.points_required);

    db.prepare("UPDATE rewards SET quantity_available = quantity_available - 1 WHERE id = ?").run(reward.id);

    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'redemption')`)
      .run(req.session.user.id, "Reward redeemed",
        `You redeemed "${reward.name}" for ${reward.points_required} points. Visit the barangay hall to claim it.`);
  });
  tx();

  res.status(201).json({ message: "Reward redeemed successfully.", redemption_code });
};

exports.myRedemptions = (req, res) => {
  const redemptions = db.prepare(`
    SELECT red.*, r.name AS reward_name
    FROM redemptions red JOIN rewards r ON r.id = red.reward_id
    WHERE red.user_id = ? ORDER BY red.created_at DESC
  `).all(req.session.user.id);
  res.json({ redemptions });
};

exports.getBalanceInternal = getBalance;
