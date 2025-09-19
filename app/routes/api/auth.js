// WRONG
// const router = require("router");

// CORRECT
const express = require("express");
const router = express.Router();

const authController = require("../../controller/api/common.suth");
const authMiddleware = require("../../middleware/userauth");

// Signup / Login routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/logout", authController.logout);

router.get("/profile", authMiddleware, (req, res) => {
  res.json({ message: "User info", user: req.user });
});

module.exports = router;
