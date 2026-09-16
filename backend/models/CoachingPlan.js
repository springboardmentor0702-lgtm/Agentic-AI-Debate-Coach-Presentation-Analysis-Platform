const mongoose = require("mongoose");
const coachingPlanSchema = new mongoose.Schema({
  coachId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  learnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  milestones: [{ label: String, completed: { type: Boolean, default: false } }]
}, { timestamps: true });
module.exports = mongoose.model("CoachingPlan", coachingPlanSchema);