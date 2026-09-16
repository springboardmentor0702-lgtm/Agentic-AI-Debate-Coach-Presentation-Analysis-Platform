const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    legacyId: { type: Number, index: true },
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: String,

    experience: {
      type: String,
      enum: ["Beginner", "Intermediate", "Expert", "Advanced"],
      default: "Beginner"
    },

    assignedCoach: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    assignedEducators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ NEW — cold-start onboarding survey answers
    preferredFormats: {
      type: [String],
      default: []
    },
    onboardingCompleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
