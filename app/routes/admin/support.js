// routes/admin/support.js
const express = require("express");
const router = express.Router();
const SupportController = require("../../controller/admin/supprt"); // ensure the correct file name
const { adminAuth } = require("../../middleware/authadmin"); // adjust names to your project

// ADMIN PAGES

// All complaints
router.get("/all", adminAuth, SupportController.getAll);

// User complaints
router.get("/users", adminAuth, SupportController.getUsers);

// Company complaints
router.get("/companies", adminAuth, SupportController.getCompanies);

// Successful
router.get("/successful", adminAuth, SupportController.getSuccessful);

// Unsuccessful
router.get("/unsuccessful", adminAuth, SupportController.getUnsuccessful);

// View single complaint
router.get("/view/:id", adminAuth, SupportController.view);

// Create complaint
router.post("/create", adminAuth, SupportController.create);

// Add message
router.post("/add-message/:id", adminAuth, SupportController.addMessage);

// Update status
router.post("/update-status/:id", adminAuth, SupportController.updateStatus);

// Delete
router.post("/delete/:id", adminAuth, SupportController.delete);

// Export only the admin router
module.exports = router;
