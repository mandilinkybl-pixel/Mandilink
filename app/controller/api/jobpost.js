const Job = require("../../models/job");

class JobController {
  // ----------------------
  // Create a Job
  // ----------------------
  async createJob(req, res) {
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
        postedBy,
        postedByModel, // MUST include this
      } = req.body;

      if (!postedBy || !postedByModel) {
        return res.status(400).json({ success: false, error: "`postedBy` and `postedByModel` are required" });
      }

      const job = new Job({
        title,
        companyName,
        location,
        description,
        requirements,
        salary,
        contactNumber,
        contactEmail,
        jobType,
        postedBy,
        postedByModel,
        isActive: true,
      });

      const savedJob = await job.save();
      res.status(201).json({ success: true, data: savedJob });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Get all Jobs
  // ----------------------
  async getJobs(req, res) {
    try {
      const jobs = await Job.find()
        .populate({
          path: "postedBy",
          select: "name email",
          model: function(doc) {
            return doc.postedByModel; // dynamically choose model
          }
        });

      res.status(200).json({ success: true, data: jobs });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Get a single Job by ID
  // ----------------------
  async getJobById(req, res) {
    try {
      const job = await Job.findById(req.params.id)
        .populate({
          path: "postedBy",
          select: "name email",
          model: function(doc) {
            return doc.postedByModel; // dynamically populate correct model
          }
        });

      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      res.status(200).json({ success: true, data: job });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Update a Job
  // ----------------------
  async updateJob(req, res) {
    try {
      const updatedJob = await Job.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      if (!updatedJob) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      res.status(200).json({ success: true, data: updatedJob });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  // ----------------------
  // Deactivate a Job (PATCH)
  // ----------------------
  async deactivateJob(req, res) {
    try {
      const job = await Job.findById(req.params.id);

      if (!job) {
        return res.status(404).json({ success: false, error: "Job not found" });
      }

      if (!job.isActive) {
        return res.status(400).json({ success: false, error: "Job already deactivated" });
      }

      job.isActive = false;
      await job.save();

      res.status(200).json({ success: true, data: job, message: "Job deactivated successfully" });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }
}

module.exports = new JobController();
