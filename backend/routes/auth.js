const express = require("express");
const { body, validationResult } = require("express-validator");
const authController = require("../controllers/authController");

const router = express.Router();

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() });
  }
  next();
}

const registerRules = [
  body("first_name").trim().notEmpty().withMessage("First name is required."),
  body("last_name").trim().notEmpty().withMessage("Last name is required."),
  body("username").trim().isLength({ min: 3 }).withMessage("Username must be at least 3 characters.")
    .matches(/^[a-zA-Z0-9_.]+$/).withMessage("Username can only contain letters, numbers, dots, and underscores."),
  body("email").trim().isEmail().withMessage("Please enter a valid email address."),
  body("mobile_number").trim().matches(/^(09|\+639)\d{9}$/).withMessage("Please enter a valid Philippine mobile number."),
  body("address").trim().notEmpty().withMessage("Complete address is required."),
  body("barangay").trim().notEmpty().withMessage("Barangay is required."),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .matches(/\d/).withMessage("Password must contain at least one number."),
  body("confirm_password").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Password confirmation does not match.");
    return true;
  }),
  body("terms").equals("on").withMessage("You must agree to the Terms and Conditions.")
];

const loginRules = [
  body("email").trim().isEmail().withMessage("Please enter a valid email address."),
  body("password").notEmpty().withMessage("Password is required.")
];

router.post("/register", registerRules, handleValidation, authController.register);
router.post("/login", loginRules, handleValidation, authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);

module.exports = router;
