const express = require("express");
const router = express.Router();
const mandiController = require("../../controller/employees/mandi.controller");
const { employeeAuth } = require("../../middleware/authadmin");

router.get("/", employeeAuth, mandiController.getMandis);

router.get("/create", employeeAuth, mandiController.renderCreateMandi);
router.post("/create", employeeAuth, mandiController.createMandi);

router.get("/update/:id", employeeAuth, mandiController.renderUpdateMandi);
router.post("/update/:id", employeeAuth, mandiController.updateMandi);

router.post("/delete/:id", employeeAuth, mandiController.deleteMandi);

router.get("/prices/:id", employeeAuth, mandiController.renderUpdatePrices);
router.post("/prices/:id", employeeAuth, mandiController.updatePrices);

module.exports = router;