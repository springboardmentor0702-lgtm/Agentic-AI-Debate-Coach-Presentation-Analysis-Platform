const mongoose = require("mongoose");
const draftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  topic: { type: String, default: "" },
  format: { type: String, default: "One-on-One Debate" },
  stance: { type: String, default: "Not selected" },
  argument: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model("Draft", draftSchema);
