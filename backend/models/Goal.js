const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    label: { type: String, required: true },
    // Which real metric this goal tracks
    dimension: {
      type: String,
      enum: ["communicationScore", "argumentScore", "confidenceScore", "fillerWordCount"],
      required: true
    },
    targetValue: { type: Number, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Goal", goalSchema);