const Job = require("../../models/job");

class JobController {
  // Show job list page

  // Create new job
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
        requirements: requirements.split(",").map((r) => r.trim()), // multiple reqs
        salary,
        contactNumber,
        contactEmail,
        jobType,
        postedBy: req.user.id || null,
      });

      await job.save();
      res.redirect("/employees/jobs");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error creating job");
    }
  }

  // Render edit form
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

  // Update job
async update(req, res) {
  try {
    const { id } = req.params;
    const { title, companyName, location, description, salary, contactNumber, contactEmail, jobType } = req.body;

    const requirements = req.body.requirements
      ? req.body.requirements.split(",").map(r => r.trim())
      : [];

    await Job.findByIdAndUpdate(id, {
      title,
      companyName,
      location,
      description,
      requirements,
      salary,
      contactNumber,
      contactEmail,
      jobType,
    });

    res.redirect("/employees/jobs");
  } catch (error) {
    // console.error(error);
    res.redirect("/employees/jobs"); // fallback
  }
}



  // Delete job
  async delete(req, res) {
    try {
      await Job.findByIdAndDelete(req.params.id);
      res.redirect("/employees/jobs");
    } catch (err) {
      console.error(err);
      res.status(500).send("Error deleting job");
    }
  }
}

module.exports = new JobController();
