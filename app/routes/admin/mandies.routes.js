const express = require("express");
const router = express.Router();
const mandiController = require("../../controller/admin/adminmandiprice");
const { adminAuth } = require("../../middleware/authadmin");

router.get("/", adminAuth, mandiController.getMandis);

router.get("/create", adminAuth, mandiController.renderCreateMandi);
router.post("/create", adminAuth, mandiController.createMandi);

router.get("/update/:id", adminAuth, mandiController.renderUpdateMandi);
router.post("/update/:id", adminAuth, mandiController.updateMandi);

router.post("/delete/:id", adminAuth, mandiController.deleteMandi);

router.get("/prices/:id", adminAuth, mandiController.renderUpdatePrices);
router.post("/prices/:id", adminAuth, mandiController.updatePrices);

module.exports = router;