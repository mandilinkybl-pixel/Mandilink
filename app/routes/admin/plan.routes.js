const express = require("express");
const router = express.Router();
const PlanController = require("../../controller/admin/admin.plans.controller");
const methodOverride = require("method-override");

router.use(methodOverride("_method"));


router.post("/Create", PlanController.create);
router.post("/:id", PlanController.update);
router.delete("/:id", PlanController.delete);

module.exports = router;
