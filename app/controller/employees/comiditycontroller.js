const Commodity = require("../../models/commodityname");
const fs = require("fs");
const path = require("path");

class CommodityController {
  /**
   * @desc Create a new commodity
   * @route POST /api/commodities
   */
  async createCommodity(req, res) {
    try {
      const { commodityName, category, subCategory, unit, hsnCode, description } = req.body;

      // Save only relative path for image
      const image = req.file
        ? path.join("/uploads/commodity", req.file.filename)
        : null;

      // Check for duplicate commodity
      const existingCommodity = await Commodity.findOne({
        commodityName: commodityName.trim(),
      });

      if (existingCommodity) {
        return res.status(400).json({
          success: false,
          message: "Commodity already exists!",
        });
      }

      const newCommodity = new Commodity({
        commodityName,
        category,
        subCategory,
        unit,
        hsnCode,
        description,
        image,
      });

      await newCommodity.save();

      return res.status(201).json({
        success: true,
        message: "Commodity created successfully!",
        data: newCommodity,
      });
    } catch (error) {
      console.error("Error creating commodity:", error.message);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }

  /**
   * @desc Update a commodity
   * @route PUT /api/commodities/:id
   */
  async updateCommodity(req, res) {
    try {
      const commodity = await Commodity.findById(req.params.id);

      if (!commodity) {
        return res.status(404).json({ success: false, message: "Commodity not found" });
      }

      let image = commodity.image;

      // If new image uploaded, delete old one
      if (req.file) {
        if (commodity.image) {
          const oldImagePath = path.join(__dirname, "../../", commodity.image);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
        image = path.join("/uploads/commodity", req.file.filename);
      }

      const fieldsToUpdate = {
        commodityName: req.body.commodityName || commodity.commodityName,
        category: req.body.category || commodity.category,
        subCategory: req.body.subCategory || commodity.subCategory,
        unit: req.body.unit || commodity.unit,
        hsnCode: req.body.hsnCode || commodity.hsnCode,
        description: req.body.description || commodity.description,
        image,
      };

      const updatedCommodity = await Commodity.findByIdAndUpdate(
        req.params.id,
        { $set: fieldsToUpdate },
        { new: true, runValidators: true }
      );

      return res.status(200).json({
        success: true,
        message: "Commodity updated successfully!",
        data: updatedCommodity,
      });
    } catch (error) {
      console.error("Error updating commodity:", error.message);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  }
}

module.exports = new CommodityController();
