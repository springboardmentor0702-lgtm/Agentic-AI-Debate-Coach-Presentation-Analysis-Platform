const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    topic: {
      type: String,
      required: true
    },

    format: {
      type: String,
      enum: [
        "One-on-One Debate",
        "Parliamentary Debate",
        "Oxford Debate",
        "Policy Debate",
        "Public Forum Debate",
        "AI Debate Simulation"
      ],
      default: "One-on-One Debate"
    },

    stance: {
      type: String,
      default: "Not selected"
    },

    argument: {
      type: String,
      required: true
    },

    feedback: {
      type: String,
      default: ""
    },

    // ✅ SKILL SCORES (unchanged — original logic)
    communicationScore: {
      type: Number,
      default: 0
    },

    argumentScore: {
      type: Number,
      default: 0
    },

    confidenceScore: {
      type: Number,
      default: 0
    },

    // ✅ NEW: real engagement score from Agent 3, needed for the
    // Communication Skills component of the weighted overall score
    engagementScore: {
      type: Number,
      default: null
    },

    // ✅ NEW — Phase B: real saved path to the recorded audio file on
    // disk (served statically by Node), null for typed-mode sessions.
    audioUrl: {
      type: String,
      default: null
    },

    // Only meaningfully populated for voice-mode turns
    fallacyDetected: {
      type: Boolean,
      default: null
    },

    // =========================================================
    // ✅ NEW — full report detail, ONLY populated by voice-mode
    // turns (the Python engine's 4-agent output). Typed-mode
    // sessions leave these as their defaults — nothing is faked
    // for them; the "My Debates" page shows a simpler summary
    // view for those instead of a full Report Card.
    // =========================================================
    presentationMetrics: {
      wordsPerMinute: { type: Number, default: null },
      paceStatus: { type: String, default: null },
      fillerWordCount: { type: Number, default: null }
    },

    argumentAnalysis: {
      clarityScore: { type: Number, default: null },
      relevanceScore: { type: Number, default: null },
      evidenceStrengthScore: { type: Number, default: null },
      logicalConsistencyScore: { type: Number, default: null },
      persuasivenessScore: { type: Number, default: null },
      strengths: { type: [String], default: [] },
      weaknesses: {
        type: [{ issue: String, strongerVersion: String }],
        default: []
      }
    },

    fallacyDetails: {
      fallacyType: { type: String, default: null },
      offendingText: { type: String, default: null },
      explanation: { type: String, default: null },
      correctionSuggestion: { type: String, default: null }
    },

    grammarIssues: {
      type: [
        {
          originalText: String,
          correctedText: String,
          explanation: String
        }
      ],
      default: []
    },

    deliveryOverallFeedback: {
      type: String,
      default: ""
    },

    // ✅ Coach review (unchanged — original logic)
    reviewedByCoach: {
      type: Boolean,
      default: false
    },
    coachFeedback: {
      type: String,
      default: ""
    },

    // ✅ NEW: separate educator review track
    reviewedByEducator: {
      type: Boolean,
      default: false
    },
    educatorFeedback: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Session", sessionSchema);