const mongoose = require("mongoose");
const resourceSchema = new mongoose.Schema({
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ["Article", "Video", "PDF", "Other"], default: "Article" },
  url: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model("Resource", resourceSchema);
