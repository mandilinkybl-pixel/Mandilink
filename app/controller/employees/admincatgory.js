const Category = require("../../models/category.model");

class CategoryController {
  // Add Category
  addCategory = async (req, res) => {
    try {
      const { name, status } = req.body;

      // Case-insensitive duplicate check
      const existing = await Category.findOne({
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existing) {
        req.flash("error_msg", "Category already exists");
        return res.redirect("/admin/category");
      }

      const category = new Category({ name: name.trim(), status });
      await category.save();

      req.flash("success_msg", "Category added successfully");
      res.redirect("/admin/category");
    } catch (err) {
      console.error("Add Category Error:", err);
      req.flash("error_msg", "Error adding category");
      res.redirect("/admin/category");
    }
  };

  // Update Category
  updateCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const { name, status } = req.body;

      // Check for duplicates excluding the current id
      const existing = await Category.findOne({
        _id: { $ne: id }, // exclude current category
        name: { $regex: `^${name.trim()}$`, $options: "i" },
      });

      if (existing) {
        req.flash("error_msg", "Category name already exists");
        return res.redirect("/admin/category");
      }

      const category = await Category.findByIdAndUpdate(
        id,
        { name: name.trim(), status },
        { new: true, runValidators: true }
      );

      if (!category) {
        req.flash("error_msg", "Category not found");
        return res.redirect("/admin/category");
      }

      req.flash("success_msg", "Category updated successfully");
      res.redirect("/admin/category");
    } catch (err) {
      console.error("Update Category Error:", err);
      req.flash("error_msg", "Error updating category");
      res.redirect("/admin/category");
    }
  };

  // Delete Category
  deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;

      const category = await Category.findByIdAndDelete(id);

      if (!category) {
        req.flash("error_msg", "Category not found");
        return res.redirect("/admin/category");
      }

      req.flash("success_msg", "Category deleted successfully");
      res.redirect("/admin/category");
    } catch (err) {
      console.error("Delete Category Error:", err);
      req.flash("error_msg", "Error deleting category");
      res.redirect("/admin/category");
    }
  };
}

module.exports = new CategoryController();
