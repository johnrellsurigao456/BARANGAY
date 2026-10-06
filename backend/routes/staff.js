const express = require("express");
const staffController = require("../controllers/staffController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/residents", requireRole("staff", "admin"), staffController.residents);
router.get("/analytics", requireRole("staff", "admin"), staffController.analytics);

module.exports = router;
