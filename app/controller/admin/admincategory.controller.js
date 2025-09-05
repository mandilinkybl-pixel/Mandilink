const Category = require("../../models/category.model");

// Add Category
class categoryController{
addCategory = async (req, res) => {
  try {
    const { name, status } = req.body;

    const existing = await Category.findOne({ name: name.trim() });
    if (existing) {
      req.flash("error_msg", "Category already exists");
      return res.redirect("back");
    }

    const category = new Category({ name, status });
    await category.save();

    req.flash("success_msg", "Category added successfully");
    res.redirect("back");
  } catch (err) {
    req.flash("error_msg", "Error adding category");
    res.redirect("back");
  }
};

// Update Category
updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { name, status },
      { new: true, runValidators: true }
    );

    if (!category) {
      req.flash("error_msg", "Category not found");
      return res.redirect("back");
    }

    req.flash("success_msg", "Category updated successfully");
    res.redirect("back");
  } catch (err) {
    req.flash("error_msg", "Error updating category");
    res.redirect("back");
  }
};

// Delete Category
deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      req.flash("error_msg", "Category not found");
      return res.redirect("back");
    }

    req.flash("success_msg", "Category deleted successfully");
    res.redirect("back");
  } catch (err) {
    req.flash("error_msg", "Error deleting category");
    res.redirect("back");
  }
};
}
module.exports= new categoryController()
