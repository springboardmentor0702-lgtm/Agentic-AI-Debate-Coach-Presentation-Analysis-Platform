const mongoose = require("mongoose");

const scheduledSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    topic: { type: String, required: true },
    format: { type: String, default: "One-on-One Debate" },
    scheduledFor: { type: Date, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ScheduledSession", scheduledSessionSchema);