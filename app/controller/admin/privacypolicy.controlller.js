// controllers/PrivacyPolicyController.js

const SecureEmployee = require('../../models/adminEmployee');
const PrivacyPolicy = require('../../models/privacypolicy');

class PrivacyPolicyController {
  // Render Privacy Policy list + form
  async getAll(req, res) {
    try {
      const policies = await PrivacyPolicy.find();
      const userdetails = await SecureEmployee.findById(req.user.id);

      // If editing, pass policy data (otherwise null for Add form)
      let editPolicy = null;
      if (req.query.editId) {
        editPolicy = await PrivacyPolicy.findById(req.query.editId);
      }

      return res.render("admin/privacypolicy", { 
        policies, 
        user: req.user,
        userdetails, 
        authUser: req.user, 
        editPolicy 
      });
    } catch (error) {
      return res.redirect("/admin/privacypolicy")
    }
  }

  // Create or Update Privacy Policy
// Create or Update Privacy Policy
async save(req, res) {
  try {
    const { id, title, paragraph } = req.body;

    if (!title || !paragraph) {
      return res.status(400).json({ message: "Title and paragraph are required" });
    }

    // Convert textarea input (string) into an array of paragraphs
    const paragraphArray = paragraph
      .split('\n')                     // split by new line
      .map(p => p.trim())              // remove extra spaces
      .filter(p => p.length > 0);      // remove empty lines

    if (id) {
      // Update existing policy
      const updatedPolicy = await PrivacyPolicy.findByIdAndUpdate(
        id,
        { title, paragraph: paragraphArray },
        { new: true, runValidators: true }
      );

      if (!updatedPolicy) {
        return res.status(404).json({ message: "Privacy Policy not found" });
      }

      req.flash("success_msg", "Privacy Policy updated successfully");
    } else {
      // Create new policy
      const newPolicy = new PrivacyPolicy({
        title,
        paragraph: paragraphArray,
      });

      await newPolicy.save();
      req.flash("success_msg", "Privacy Policy added successfully");
    }

    return res.redirect("/admin/privacypolicy");
  } catch (error) {
    return res.redirect("/admin/privacypolicy")
  }
}


  // Delete a Privacy Policy
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deletedPolicy = await PrivacyPolicy.findByIdAndDelete(id);

      if (!deletedPolicy) {
        return res.status(404).json({ message: "Privacy Policy not found" });
      }

      req.flash("success_msg", "Privacy Policy deleted successfully");
      return res.redirect("/admin/privacypolicy");
    } catch (error) {
      return res.redirect("/admin/privacypolicy")
    }
  }
}

module.exports = new PrivacyPolicyController();
