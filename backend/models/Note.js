const mongoose = require("mongoose");
const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // who owns/wrote the note
  aboutLearnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // set when a Coach writes about a Learner
  title: { type: String, required: true },
  category: { type: String, default: "General" },
  content: { type: String, default: "" }
}, { timestamps: true });
module.exports = mongoose.model("Note", noteSchema);
