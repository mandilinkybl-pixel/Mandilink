const express = require("express");
const router = express.Router();
const categoryController = require("../../controller/admin/admincategory.controller");
 const {adminAuth} = require('../../middleware/authadmin');
const SecureEmployee = require("../../models/adminEmployee");
// Show all categories page
router.get("/", adminAuth, async (req, res) => {
  try {
    const user = req.user;
    const userdetails = await SecureEmployee.findById(user.id);
   
    const Category = require("../../models/category.model" );
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render("admin/category", {
      categories,
      userdetails,
      user,
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg"),
    });
  } catch (err) {
    console.error(err);
    req.flash("error_msg", "Error fetching categories");
    res.redirect("/admin/category");
  }
});

// Add Category
router.post("/create", adminAuth, categoryController.addCategory);

// Update Category
router.post("/update/:id", adminAuth, categoryController.updateCategory);

// Delete Category
router.post("/delete/:id", adminAuth, categoryController.deleteCategory);

module.exports = router;
