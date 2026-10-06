const express = require("express");
const adminController = require("../controllers/adminController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();
router.use(requireRole("admin"));

router.get("/stats", adminController.stats);

router.get("/users", adminController.listUsers);
router.get("/users/:id", adminController.getUser);
router.patch("/users/:id", adminController.updateUser);
router.patch("/users/:id/status", adminController.setUserStatus);

router.post("/staff", adminController.createStaff);

router.get("/rewards", adminController.listRewardsAdmin);
router.post("/rewards", adminController.createReward);
router.patch("/rewards/:id", adminController.updateReward);
router.delete("/rewards/:id", adminController.deleteReward);

router.get("/settings", adminController.getSettings);
router.patch("/settings", adminController.updateSettings);

router.get("/audit-logs", adminController.auditLogs);

module.exports = router;
