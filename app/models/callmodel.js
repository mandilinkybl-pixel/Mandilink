const mongoose = require("mongoose");

const callRecordSchema = new mongoose.Schema(
  {
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Masked numbers (optional, useful if you don’t want to expose real numbers)
    callerMasked: { type: String },  
    receiverMasked: { type: String },  

    callType: {
      type: String,
      enum: ["voice", "video"],
      required: true,
    },

    startTime: { type: Date, required: true },
    endTime: { type: Date },

    duration: { type: Number, default: 0 }, // in seconds

    status: {
      type: String,
      enum: ["completed", "missed", "rejected", "ongoing"],
      default: "ongoing",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CallRecord", callRecordSchema);
