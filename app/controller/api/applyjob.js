const JobApplication = require("../../models/jobapplymodel");

class JobApplicationController {
  // 1️⃣ Apply for a job
async applyJob(req, res) {
  try {
    const { fullName, email, phone, whyInterested } = req.body;

    let resumePath = "";
    if (req.file) {
      resumePath = `/uploads/resumes/${req.file.filename}`; // store relative path for frontend
    }

    const newApplication = new JobApplication({
      job: req.params.jobId || null,
      fullName: fullName || "",
      email: email || "",
      phone: phone || "",
      resume: resumePath,
      whyInterested: whyInterested || "",
    });

    await newApplication.save();

    return res.status(201).json({
      message: "Application submitted successfully",
      application: newApplication,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error applying for job",
      error: error.message,
    });
  }
}





  // 2️⃣ Get all applications
  async getAllApplications(req, res) {
    try {
      const applications = await JobApplication.find().populate("job");
      return res.json(applications);
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching applications",
        error: error.message,
      });
    }
  }

  // 3️⃣ Get applications for a specific job
  async getApplicationsByJob(req, res) {
    try {
      const applications = await JobApplication.find({
        job: req.params.jobId,
      }).populate("job");

      return res.json(applications);
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching job applications",
        error: error.message,
      });
    }
  }

  // 4️⃣ Get single application
  async getApplicationById(req, res) {
    try {
      const application = await JobApplication.findById(req.params.id).populate("job");
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      return res.json(application);
    } catch (error) {
      return res.status(500).json({
        message: "Error fetching application",
        error: error.message,
      });
    }
  }

  // 5️⃣ Update application status
  async updateApplicationStatus(req, res) {
    try {
      const { status } = req.body;
      const application = await JobApplication.findByIdAndUpdate(
        req.params.id,
        { status },
        { new: true }
      );

      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }

      return res.json({
        message: "Status updated successfully",
        application,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Error updating status",
        error: error.message,
      });
    }
  }

  // 6️⃣ Delete application
  async deleteApplication(req, res) {
    try {
      const application = await JobApplication.findByIdAndDelete(req.params.id);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      return res.json({ message: "Application deleted successfully" });
    } catch (error) {
      return res.status(500).json({
        message: "Error deleting application",
        error: error.message,
      });
    }
  }
}

module.exports = new JobApplicationController();
