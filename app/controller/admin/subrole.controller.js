const Subrole = require("../../models/subrole");
class SubroleController {
  // 📌 Get all subroles (with search)
  async getSubroles(req, res) {
    try {
      const search = req.query.search || "";
      const query = search
        ? { name: { $regex: search, $options: "i" } }
        : {};

      const subroles = await Subrole.find(query).sort({ createdAt: -1 });

      res.render("admin/subroles", { subroles, search });
    } catch (err) {
      console.error("Error fetching subroles:", err);
      res.status(500).send("Server Error");
    }
  }

  // 📌 Create new subrole
  async createSubrole(req, res) {
    try {
      let { name, categories } = req.body;

      // Ensure categories is always an array
      if (!Array.isArray(categories)) {
        categories = [categories];
      }

      const newSubrole = new Subrole({ name, categories });
      await newSubrole.save();

      res.redirect("/admin/subroles");
    } catch (err) {
      console.error("Error creating subrole:", err);
      res.status(500).send("Server Error");
    }
  }

  // 📌 Update subrole
  async updateSubrole(req, res) {
    try {
      const { id } = req.params;
      let { name, categories } = req.body;

      if (!Array.isArray(categories)) {
        categories = [categories];
      }

      await Subrole.findByIdAndUpdate(id, { name, categories });
      res.redirect("/admin/subroles");
    } catch (err) {
      console.error("Error updating subrole:", err);
      res.status(500).send("Server Error");
    }
  }

  // 📌 Delete subrole
  async deleteSubrole(req, res) {
    try {
      const { id } = req.params;
      await Subrole.findByIdAndDelete(id);
      res.redirect("/admin/subroles");
    } catch (err) {
      console.error("Error deleting subrole:", err);
      res.status(500).send("Server Error");
    }
  }
}


// ✅ Export single instance
module.exports = new SubroleController();
