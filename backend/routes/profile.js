const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.get("/", requireAuth, profileController.getProfile);
router.patch("/", requireAuth, profileController.updateProfile);
router.patch("/password", requireAuth, profileController.changePassword);

module.exports = router;
