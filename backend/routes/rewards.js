const express = require("express");
const rewardController = require("../controllers/rewardController");
const { requireRole } = require("../middleware/auth");

const router = express.Router();

router.get("/points", requireRole("resident"), rewardController.myPoints);
router.get("/", requireRole("resident"), rewardController.listRewards);
router.post("/:id/redeem", requireRole("resident"), rewardController.redeem);
router.get("/redemptions/mine", requireRole("resident"), rewardController.myRedemptions);

module.exports = router;
