const express = require("express");
const router = express.Router();
const PlanController = require("../../controller/employees/employee.planscontroller");
const methodOverride = require("method-override");
const { employeeAuth } = require("../../middleware/authadmin");

router.use(methodOverride("_method"));


router.post("/Create",employeeAuth, PlanController.create);
router.post("/:id",employeeAuth, PlanController.update);
router.delete("/:id",employeeAuth, PlanController.delete);

module.exports = router;
