const express = require("express");
const activityController = require("../controllers/activityController");
const { requireAuth, requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, activityController.list);
router.post("/:id/register", requireRole("resident"), activityController.register);

router.post("/", requireRole("staff", "admin"), activityController.create);
router.patch("/:id", requireRole("staff", "admin"), activityController.update);
router.delete("/:id", requireRole("admin"), activityController.remove);
router.get("/:id/participants", requireRole("staff", "admin"), activityController.participants);

module.exports = router;
