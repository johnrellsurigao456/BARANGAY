// Seeds a default administrator account and demo data.
// Run with: npm run seed
require("dotenv").config();
const bcrypt = require("bcryptjs");
const db = require("../config/db");

function upsertUser(u) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(u.email);
  if (existing) return existing.id;
  const hash = bcrypt.hashSync(u.password, 10);
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash, first_name, middle_name, last_name, suffix,
      mobile_number, address, barangay, role, status)
    VALUES (@username, @email, @password_hash, @first_name, @middle_name, @last_name, @suffix,
      @mobile_number, @address, @barangay, @role, 'active')
  `).run({
    username: u.username, email: u.email, password_hash: hash,
    first_name: u.first_name, middle_name: u.middle_name || null, last_name: u.last_name,
    suffix: u.suffix || null, mobile_number: u.mobile_number, address: u.address,
    barangay: u.barangay || "San Isidro", role: u.role
  });
  return info.lastInsertRowid;
}

const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@barangayecocare.gov.ph";
const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "ChangeMe!2026";

const adminId = upsertUser({
  username: "becadmin", email: adminEmail, password: adminPassword,
  first_name: "System", last_name: "Administrator", mobile_number: "09876543210",
  address: "Barangay Hall", role: "admin"
});

const staffId = upsertUser({
  username: "johnrell", email: "johnrellsurigao@barangayecocare.gov.ph", password: "StaffPass123!",
  first_name: "Johnrell", last_name: "Surigao", mobile_number: "09467116874",
  address: "Purok 1, San Isidro", role: "staff"
});

const residentId = upsertUser({
  username: "john", email: "john.rell@email.com", password: "ResidentPass123!",
  first_name: "John", last_name: "Rell", mobile_number: "09181234567",
  address: "Purok 3, San Isidro", role: "resident"
});

db.prepare(`INSERT OR IGNORE INTO system_settings (id, barangay_name, contact_email, contact_number)
  VALUES (1, 'Barangay San Isidro', 'contact@barangayecocare.gov.ph', '(032) 123-4567')`).run();

const rewardCount = db.prepare("SELECT COUNT(*) AS c FROM rewards").get().c;
if (rewardCount === 0) {
  const insertReward = db.prepare(`INSERT INTO rewards (name, description, points_required, quantity_available)
    VALUES (?, ?, ?, ?)`);
  insertReward.run("Reusable eco bag", "Woven bag for market trips, distributed at the barangay hall.", 100, 50);
  insertReward.run("Grocery voucher", "₱100 non-cash voucher usable at partner sari-sari stores.", 200, 30);
  insertReward.run("Compost bin", "Starter home compost bin for biodegradable waste.", 350, 15);
  insertReward.run("Barangay recognition certificate", "Certificate recognizing consistent proper segregation.", 500, 20);
}

const reportCount = db.prepare("SELECT COUNT(*) AS c FROM reports").get().c;
if (reportCount === 0) {
  const insertReport = db.prepare(`
    INSERT INTO reports (report_code, user_id, report_type, waste_category, description, location,
      incident_datetime, status, staff_response, verified_by, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertReport.run("RPT-20260914-0001", residentId, "Waste Concern", "Uncollected Waste",
    "Garbage left uncollected along the main road for three days.", "Purok 3, near the chapel",
    "2026-09-14 08:00", "resolved", "Collection rescheduled and completed.", staffId, "2026-09-15 10:00");
  insertReport.run("RPT-20260928-0002", residentId, "Waste Concern", "Improper Waste Disposal",
    "Mixed waste dumped beside the basketball court.", "Purok 3, basketball court",
    "2026-09-28 07:30", "pending", null, null, null);

  const earn = db.prepare(`INSERT INTO point_transactions (user_id, points, type, reference_type, reference_id, description)
    VALUES (?, ?, 'earned', 'report', ?, ?)`);
  earn.run(residentId, 20, 1, "Points for verified and resolved report RPT-20260914-0001");
}

console.log("Seed complete.");
console.log("Default admin login:");
console.log("  Email:   " + adminEmail);
console.log("  Password:" + " " + adminPassword);
console.log("Change this password after first login.");
