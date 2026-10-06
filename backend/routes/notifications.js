const express = require("express");
const notificationController = require("../controllers/notificationController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, notificationController.list);
router.patch("/:id/read", requireAuth, notificationController.markRead);
router.patch("/read-all", requireAuth, notificationController.markAllRead);

module.exports = router;
