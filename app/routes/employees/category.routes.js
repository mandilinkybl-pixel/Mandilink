const express = require("express");
const router = express.Router();
const categoryController = require("../../controller/employees/admincatgory")
 const {employeeAuth} = require('../../middleware/authadmin');
const SecureEmployee = require("../../models/adminEmployee");
// Show all categories page
router.get("/", employeeAuth, async (req, res) => {
  try {
    const user = req.user;
    const userdetails = await SecureEmployee.findById(user.id);
   
    const Category = require("../../models/category.model" );
    const categories = await Category.find().sort({ createdAt: -1 });
     const employee = await SecureEmployee.findById(user.id);
    res.render("employees/category", {
      categories,
      userdetails,
      user,
      employee,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error fetching categories");
    res.redirect("/employees/category");
  }
});

// Add Category
router.post("/create", employeeAuth, categoryController.addCategory);

// Update Category
router.post("/update/:id", employeeAuth, categoryController.updateCategory);

// Delete Category
router.post("/delete/:id", employeeAuth, categoryController.deleteCategory);

module.exports = router;
