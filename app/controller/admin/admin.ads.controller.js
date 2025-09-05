const Ad = require("../../models/topads");

const fs = require("fs");
const path = require("path");

class AdController {
  // Create Ad
  async createAd(req, res) {
    try {
      const { title, link, type, startDate, endDate, createdBy } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      const ad = new Ad({
        title,
        link,
        type,
        startDate,
        endDate,
        createdBy,
        image: req.file.filename, // from multer
      });

      await ad.save();
      res.redirect(`/admin/${type.toLowerCase()}-ads`);
    } catch (error) {
      console.error("Error creating ad:", error);
      res.redirect(`/admin/${req.body.type.toLowerCase()}-ads?error=Error creating ad`);
    }
  }


  // Update Ad
  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, link, type, endDate, isActive } = req.body;

      const ad = await Ad.findById(id);
      if (!ad) {
        return res.status(404).send("Ad not found");
      }

      // Prepare update data
      let updateData = {
        title,
        link,
        type,
        endDate: endDate || null,
        isActive: isActive === "true",
      };

      // If new image uploaded
      if (req.file) {
        // Delete old image
        if (ad.image) {
          const oldImagePath = path.join(__dirname, "../../../uploads/ads", ad.image);
          fs.unlink(oldImagePath, (err) => {
            if (err) console.error("Failed to delete old image:", err);
          });
        }

        updateData.image = req.file.filename;
      }

      const updatedAd = await Ad.findByIdAndUpdate(id, updateData, { new: true });

      res.redirect(`/admin/${updatedAd.type.toLowerCase()}-ads`);
    } catch (err) {
      console.error("Error updating ad:", err);
      res.status(500).send("Error updating ad");
    }
  }

  // Delete Ad
  async delete(req, res) {
    try {
      const { id } = req.params;

      const ad = await Ad.findByIdAndDelete(id);
      if (!ad) {
        return res.status(404).send("Ad not found");
      }

      // Delete old image
      if (ad.image) {
        const oldImagePath = path.join(__dirname, "../../../uploads/ads", ad.image);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Failed to delete old image:", err);
        });
      }

      res.redirect(`/admin/${ad.type.toLowerCase()}-ads`);
    } catch (err) {
      console.error("Error deleting ad:", err);
      res.redirect(`/admin/${req.params.type.toLowerCase()}-ads?error=Error deleting ad`);
    }
  }
}


module.exports = new AdController();
