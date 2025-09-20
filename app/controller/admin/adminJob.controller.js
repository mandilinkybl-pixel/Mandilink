const Job = require("../../models/job");

class JobController {
  // Show job list page
  // (Assume handled in routes/view, not included here)

  // ----------------------
  // Create new job
  // ----------------------
  async create(req, res) {
    try {
      const {
        title,
        companyName,
        location,
        description,
        requirements,
        salary,
        contactNumber,
        contactEmail,
        jobType,
      } = req.body;

      const job = new Job({
        title,
        companyName,
        location,
        description,
        requirements: requirements
          ? requirements.split(",").map((r) => r.trim())
          : [],
        salary,
        contactNumber,
        contactEmail,
        jobType,
        postedBy: req.user.id,           // Set postedBy from logged-in user
        postedByModel: "SecureEmployee", // Set model type as SecureEmployee
        isActive: true,
      });

      await job.save();
      res.redirect("/admin/jobs");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error creating job");
    }
  }

  // ----------------------
  // Render edit form
  // ----------------------
  async editForm(req, res) {
    try {
      const job = await Job.findById(req.params.id);
      if (!job) return res.status(404).send("Job not found");
      res.render("jobs/edit", { job });
    } catch (err) {
      console.error(err);
      res.status(500).send("Error loading job for edit");
    }
  }

  // ----------------------
  // Update job
  // ----------------------
  async update(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        companyName,
        location,
        description,
        salary,
        contactNumber,
        contactEmail,
        jobType,
        requirements,
      } = req.body;

      const updatedRequirements = requirements
        ? requirements.split(",").map((r) => r.trim())
        : [];

      await Job.findByIdAndUpdate(
        id,
        {
          title,
          companyName,
          location,
          description,
          requirements: updatedRequirements,
          salary,
          contactNumber,
          contactEmail,
          jobType,
          postedBy: req.user.id,           // Ensure postedBy stays updated
          postedByModel: "SecureEmployee", // Keep postedByModel
        },
        { new: true, runValidators: true }
      );

      res.redirect("/admin/jobs");
    } catch (error) {
      console.error(error);
      res.redirect("/admin/jobs"); // fallback
    }
  }

  // ----------------------
  // Delete job
  // ----------------------
  async delete(req, res) {
    try {
      await Job.findByIdAndDelete(req.params.id);
      res.redirect("/admin/jobs");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error deleting job");
    }
  }
}

module.exports = new JobController();
