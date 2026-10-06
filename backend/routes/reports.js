const express = require("express");
const upload = require("../config/upload");
const reportController = require("../controllers/reportController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

// Resident
router.post("/", requireRole("resident"), upload.single("photo"), reportController.create);
router.get("/mine", requireRole("resident"), reportController.myReports);
router.get("/mine/:id", requireRole("resident"), reportController.myReportDetail);

// Staff
router.get("/", requireRole("staff", "admin"), reportController.allReports);
router.patch("/:id/status", requireRole("staff", "admin"), reportController.updateStatus);

module.exports = router;
