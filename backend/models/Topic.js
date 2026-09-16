const mongoose = require("mongoose");

const DEBATE_FORMATS = [
  "One-on-One Debate",
  "Parliamentary Debate",
  "Oxford Debate",
  "Policy Debate",
  "Public Forum Debate",
  "AI Debate Simulation"
];

const topicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    format: {
      type: String,
      enum: DEBATE_FORMATS,
      required: true,
      default: "One-on-One Debate"
    },

    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Hard"],
      default: "Beginner"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

topicSchema.statics.FORMATS = DEBATE_FORMATS;

module.exports = mongoose.model("Topic", topicSchema);
