const mongoose = require("mongoose");
const platformNoticeSchema = new mongoose.Schema({
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model("PlatformNotice", platformNoticeSchema);
