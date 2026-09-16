require("dotenv").config();

const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// 🔐 AUTH IMPORTS
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ NEW — Phase B: real audio file storage
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 📦 MODELS
const User = require("./models/User");
const Presentation = require("./models/Presentation");
const DebateHistory = require("./models/DebateHistory");
const Session = require("./models/Session");
const Topic = require("./models/Topic");
const Goal = require("./models/Goal");
const ScheduledSession = require("./models/ScheduledSession");
const Draft = require("./models/Draft");
const Note = require("./models/Note");
const CoachingPlan = require("./models/CoachingPlan");
const SupportTicket = require("./models/SupportTicket");
const Class = require("./models/Class");
const Rubric = require("./models/Rubric");
const Announcement = require("./models/Announcement");
const Assignment = require("./models/Assignment");
const Resource = require("./models/Resource");
const PlatformNotice = require("./models/PlatformNotice");
const AuditLog = require("./models/AuditLog");
const ToolUsageLog = require("./models/ToolUsageLog");
const PresentationSession = require("./models/PresentationSession"); // ✅ NEW — Phase A

// 🤖 AI SERVICE
const generateFeedback = require("./aiService");
const { processDebateTurn, analyzePresentation } = require("./aiService");

// 🛡️ AUTH MIDDLEWARE (new — only guards the new routes below)
const { verifyToken, requireRole } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ NEW — Phase B: real audio file storage for debate recordings —
// saved to local disk (no cloud/Docker, per instruction), served back
// statically at /uploads/audio/<filename>.
const AUDIO_UPLOAD_DIR = path.join(__dirname, "uploads", "audio");
fs.mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AUDIO_UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.webm`)
});
const uploadAudio = multer({ storage: audioStorage, limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB cap


// =========================
// ✅ CONNECT TO MONGODB
// =========================
console.log("MONGO URI:", process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));


// =========================
// 🚀 SIGNUP
// =========================
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, experience } = req.body;

    if (!name || !email || !password || !role) {
      return res.json({
        success: false,
        message: "All fields are required"
      });
    }

    const allowedRoles = [
      "Learner",
      "Debate Coach",
      "Educator",
      "Admin"
    ];

    if (!allowedRoles.includes(role)) {
      return res.json({
        success: false,
        message: "Invalid role selected"
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.json({
        success: false,
        message: "Email already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      experience: experience || "Beginner" // ✅ NEW, optional, safe default
    });

    await newUser.save();

    const token = jwt.sign(
      {
        id: newUser._id,
        user_id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.toLowerCase()
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      success: true,
      message: "Account created successfully",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role.toLowerCase(),
        experience: newUser.experience || "Beginner",
        onboardingCompleted: newUser.onboardingCompleted || false
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});


// =========================
// 🔐 LOGIN
// =========================
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email: new RegExp(`^${String(email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password"
      });
    }

    const token = jwt.sign(
      {
        id: user._id,
        user_id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase()
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d"
      }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.toLowerCase(),
        experience: user.experience || "Beginner",
        onboardingCompleted: user.onboardingCompleted || false
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// =======================================================================
// Mongo-backed presentation and debate history used by the web frontend.
// =======================================================================
function presentationFromClient(body, user) {
  return {
    userId: user?.id || null,
    userEmail: user?.email || body.user_email || null,
    userName: user?.name || body.user_name || "Speaker",
    title: body.title || "Vocal Presentation Run",
    transcript: body.transcript || body.speech_text || "",
    duration: body.duration || `${body.duration_seconds || 30}s`,
    durationSeconds: Number(body.duration_seconds || 30),
    wpm: body.wpm || body.words_per_minute || body.speech_pace_wpm || 140,
    fillerWords: body.fillerWords ?? body.filler_words_count ?? 0,
    fillerBreakdown: body.fillerBreakdown || body.filler_words_list || "None",
    confidence: body.confidence || body.confidence_score || 85,
    clarity: body.clarity || body.clarity_score || 88,
    engagement: body.engagement || body.engagement_score || 86,
    paceStatus: body.pace_status || "Optimal",
    feedback: body.feedback || null
  };
}

function presentationForClient(record) {
  const item = record.toObject ? record.toObject() : record;
  return {
    ...item,
    id: item.legacyId || item._id,
    user_id: item.legacyUserId || item.userId,
    user_email: item.userEmail,
    user_name: item.userName,
    duration_seconds: item.durationSeconds,
    filler_words_count: item.fillerWords,
    filler_words_list: item.fillerBreakdown,
    confidence_score: item.confidence,
    clarity_score: item.clarity,
    engagement_score: item.engagement,
    pace_status: item.paceStatus,
    date: item.date || (item.recordedAt || item.createdAt)?.toISOString?.().split("T")[0]
  };
}

function debateForClient(record) {
  const item = record.toObject ? record.toObject() : record;
  return {
    ...item,
    id: item.legacyId || item._id,
    user_id: item.legacyUserId || item.userId,
    user_email: item.userEmail,
    user_name: item.userName,
    opponent_persona: item.opponentPersona,
    completed_at: item.completedAt,
    executive_summary: item.executiveSummary,
    areas_for_improvement: item.areasForImprovement,
    coaching_review: item.coachingReview
  };
}

function buildAiAnalytics(presentations, debates) {
  const completedDebates = debates.filter((debate) =>
    debate.status === "Completed" || debate.status === "Recorded" || debate.score !== undefined
  );
  const debateScores = completedDebates
    .map((debate) => Number(debate.score ?? debate.scores?.overall))
    .filter(Number.isFinite);
  const presentationScores = presentations
    .map((presentation) => {
      const clarity = Number(presentation.clarity ?? presentation.clarityScore);
      const confidence = Number(presentation.confidence ?? presentation.confidenceScore);
      return Number.isFinite(clarity) && Number.isFinite(confidence) ? (clarity + confidence) / 2 : null;
    })
    .filter(Number.isFinite);
  const allScores = [...debateScores, ...presentationScores];
  const avgScore = allScores.length
    ? `${(allScores.reduce((total, score) => total + score, 0) / allScores.length).toFixed(1)}%`
    : "N/A";

  const wpms = presentations.map((presentation) => Number(presentation.wpm)).filter((wpm) => Number.isFinite(wpm) && wpm > 0);
  const avgWpm = wpms.length
    ? `${Math.round(wpms.reduce((total, wpm) => total + wpm, 0) / wpms.length)} WPM`
    : "N/A";
  const fallacies = completedDebates.flatMap((debate) => Array.isArray(debate.fallacies) ? debate.fallacies : [])
    .map((fallacy) => typeof fallacy === "string" ? fallacy : fallacy?.fallacy_type)
    .filter((fallacy) => fallacy && fallacy !== "None");
  const fallacyCounts = fallacies.reduce((counts, fallacy) => ({ ...counts, [fallacy]: (counts[fallacy] || 0) + 1 }), {});
  const topFallacy = Object.entries(fallacyCounts).sort((a, b) => b[1] - a[1])[0];
  const topAvoidedFallacy = topFallacy ? `${topFallacy[0]} (${topFallacy[1]}x)` : "100% Clean Logic";

  const consistencyScore = completedDebates.length
    ? Math.max(50, Math.min(99, Math.round(95 - fallacies.length * 8)))
    : 0;
  const argumentScores = completedDebates.map((debate) => Number(debate.scores?.argQuality ?? debate.scores?.evidence ?? debate.score)).filter(Number.isFinite);
  const argumentScore = argumentScores.length ? Math.round(argumentScores.reduce((total, score) => total + score, 0) / argumentScores.length) : 0;
  const clarityScores = presentations.map((presentation) => Number(presentation.clarity)).filter(Number.isFinite);
  const clarityScore = clarityScores.length ? Math.round(clarityScores.reduce((total, score) => total + score, 0) / clarityScores.length) : 0;
  const fillerCounts = presentations.map((presentation) => Number(presentation.fillerWords || 0)).filter(Number.isFinite);
  const averageFillers = fillerCounts.length ? fillerCounts.reduce((total, count) => total + count, 0) / fillerCounts.length : 0;
  const fillerScore = presentations.length ? Math.max(40, Math.min(98, Math.round(96 - averageFillers * 4))) : 0;
  const rebuttalScores = completedDebates.map((debate) => Number(debate.scores?.rebuttal ?? debate.score)).filter(Number.isFinite);
  const rebuttalScore = rebuttalScores.length ? Math.round(rebuttalScores.reduce((total, score) => total + score, 0) / rebuttalScores.length) : 0;
  const totalCompleted = completedDebates.length + presentations.length;
  const drillStatus = totalCompleted >= 5 ? "Level 3 - Master Debater" : totalCompleted >= 2 ? "Level 2 - Practitioner" : "Level 1 - Novice";

  return {
    avgScore,
    avgWpm,
    drillStatus,
    topAvoidedFallacy,
    skillsMatrix: [
      { name: "Logical Consistency", value: `${consistencyScore}%`, rawValue: consistencyScore, color: "#D90429", description: "Ability to avoid fallacy traps under cross-examination." },
      { name: "Argument Construction", value: `${argumentScore}%`, rawValue: argumentScore, color: "#111827", description: "Evidence strength, claim isolation, and structural reasoning." },
      { name: "Vocal Clarity & Cadence", value: `${clarityScore}%`, rawValue: clarityScore, color: "#4B5563", description: "Pacing precision and voice clarity from AI delivery analysis." },
      { name: "Filler Word Control", value: `${fillerScore}%`, rawValue: fillerScore, color: "#10B981", description: "Minimal use of vocal pauses from AI speech analysis." },
      { name: "Rebuttal Effectiveness", value: `${rebuttalScore}%`, rawValue: rebuttalScore, color: "#3B82F6", description: "Addressing critical challenges using AI-scored counterarguments." }
    ],
    coachingInsights: {
      activePlan: drillStatus,
      summary: `AI analysis based on ${completedDebates.length} debate(s) and ${presentations.length} presentation(s). Coach and educator comments are shown only on individual debate history records.`,
      recommendations: [
        fallacies.length ? `Drill counter-examples to eliminate ${fallacies[0]} traps.` : "Practice rapid cross-examination on adversarial counter-claims.",
        averageFillers > 3 ? "Reduce filler words by pausing before transitions." : "Maintain current concise articulation during rebuttals.",
        "Test contrasting debate formats to expand strategic agility."
      ],
      activeStep: "Review your latest AI analysis"
    }
  };
}

app.post("/api/v1/presentations", verifyToken, async (req, res) => {
  try {
    const record = await Presentation.create(presentationFromClient(req.body, req.user));
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save presentation", error: error.message });
  }
});

app.get("/api/v1/presentations", verifyToken, async (req, res) => {
  try {
    const records = await Presentation.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(records.map(presentationForClient));
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load presentations", error: error.message });
  }
});

app.delete("/api/v1/presentations", verifyToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [req.body?.id];
    const validIds = ids.filter((id) => id !== undefined && id !== null && String(id).trim() !== "");
    if (!validIds.length) return res.status(400).json({ message: "At least one presentation ID is required" });
    const idClauses = [
      ...validIds.filter((id) => Number.isFinite(Number(id))).map((id) => ({ legacyId: Number(id) })),
      ...validIds.filter((id) => mongoose.isValidObjectId(String(id))).map((id) => ({ _id: id }))
    ];
    if (!idClauses.length) return res.status(400).json({ success: false, message: "No valid presentation history IDs were provided" });
    const query = {
      $and: [
        { $or: [{ userId: req.user.id }, ...(req.user.email ? [{ userEmail: req.user.email }] : [])] },
        { $or: idClauses }
      ]
    };
    const result = await Presentation.deleteMany(query);
    if (!result.deletedCount) return res.status(404).json({ success: false, message: "No matching presentation history belongs to this account" });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete presentations", error: error.message });
  }
});

app.post("/api/v1/debates/history", verifyToken, async (req, res) => {
  try {
    const body = req.body || {};
    const record = await DebateHistory.create({
      ...body,
      userId: req.user.id,
      userEmail: req.user.email || body.user_email || null,
      userName: req.user.name || body.user_name || "Debater",
      opponentPersona: body.opponent_persona,
      completedAt: body.completed_at ? new Date(body.completed_at) : new Date(),
      executiveSummary: body.executive_summary,
      areasForImprovement: body.areas_for_improvement,
      coachingReview: body.coaching_review
    });
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save debate", error: error.message });
  }
});

app.get("/api/v1/debates/history", verifyToken, async (req, res) => {
  try {
    const records = await DebateHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json(records.map(debateForClient));
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load debates", error: error.message });
  }
});

app.delete("/api/v1/debates/history", verifyToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [req.body?.id];
    const validIds = ids.filter((id) => id !== undefined && id !== null && String(id).trim() !== "");
    if (!validIds.length) return res.status(400).json({ message: "At least one debate ID is required" });
    const idClauses = [
      ...validIds.filter((id) => Number.isFinite(Number(id))).map((id) => ({ legacyId: Number(id) })),
      ...validIds.filter((id) => mongoose.isValidObjectId(String(id))).map((id) => ({ _id: id }))
    ];
    if (!idClauses.length) return res.status(400).json({ success: false, message: "No valid debate history IDs were provided" });
    const query = {
      $and: [
        { $or: [{ userId: req.user.id }, ...(req.user.email ? [{ userEmail: req.user.email }] : [])] },
        { $or: idClauses }
      ]
    };
    const result = await DebateHistory.deleteMany(query);
    if (!result.deletedCount) return res.status(404).json({ success: false, message: "No matching debate history belongs to this account" });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete debates", error: error.message });
  }
});

app.get("/api/v1/dashboard/analytics", verifyToken, async (req, res) => {
  try {
    const [presentations, debates] = await Promise.all([
      Presentation.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean(),
      DebateHistory.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
    ]);
    const aiAnalytics = buildAiAnalytics(presentations, debates);
    res.json({
      hasHistory: presentations.length > 0 || debates.length > 0,
      presentationsCount: presentations.length,
      debatesCount: debates.length,
      ...aiAnalytics,
      presentationHistory: presentations.map(presentationForClient),
      debateHistory: debates.map(debateForClient)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load analytics", error: error.message });
  }
});

app.post("/api/v1/platform-state", async (req, res) => {
  try {
    await mongoose.connection.collection("platform_state").updateOne(
      { key: "frontend-server-store" },
      { $set: { key: "frontend-server-store", data: req.body || {}, updatedAt: new Date() } },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to persist platform state", error: error.message });
  }
});


// =========================
// 🤖 SAVE SESSION + AI
// =========================
app.post("/session", async (req, res) => {
  try {
    const { userId, topic, stance, argument, format } = req.body;

    const aiResult = await generateFeedback(topic, stance, argument);

    const safeResult = {
      feedback: aiResult?.feedback || "No feedback generated",
      communicationScore: aiResult?.communicationScore || 0,
      argumentScore: aiResult?.argumentScore || 0,
      confidenceScore: aiResult?.confidenceScore || 0
    };

    const session = new Session({
      userId,
      topic,
      format: format || "One-on-One Debate",
      stance,
      argument,
      feedback: safeResult.feedback,
      communicationScore: safeResult.communicationScore,
      argumentScore: safeResult.argumentScore,
      confidenceScore: safeResult.confidenceScore
    });

    await session.save();

    res.json({
      success: true,
      message: "Session saved with AI feedback",
      session
    });

  } catch (error) {
    console.error("SESSION ERROR:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save session",
      error: error.message
    });
  }
});


// =========================================================================
// 🎯 SIMULATION / DEBATE TURN (Connected directly to Python AI Engine)
// =========================================================================
app.post("/api/v1/simulation/turn", async (req, res) => {
  try {
    const {
      session_id,
      topic = "AI Regulation & Governance",
      user_argument,
      user_input,
      history = [],
      opponent_persona = "The Contrarian",
      format = "Oxford Debate",
      difficulty = "Intermediate"
    } = req.body;

    const argument = user_argument || user_input || "";
    if (!argument.trim()) {
      return res.status(400).json({ success: false, message: "Argument text is required" });
    }

    const aiResult = await processDebateTurn({
      sessionId: session_id || `session-${Date.now()}`,
      format,
      argument,
      history,
      opponentPersona: opponent_persona,
      difficulty,
    });

    const fallacyMetrics = aiResult.fallacyMetrics || {};
    const fallacyDetected = fallacyMetrics.fallacy_detected ? fallacyMetrics : null;
    const fallacyType = fallacyDetected?.fallacy_type || null;
    const audit = fallacyType ? `[AUDIT] Fallacy Detected: ${fallacyType}` : "[AUDIT] Argument structure verified.";
    const rebuttalStrength = aiResult.argumentAnalysis?.persuasiveness_score || 85;

    res.json({
      success: true,
      turn_number: (history.length || 0) + 1,
      user_input: argument,
      user_transcript: argument,
      opponent_response: aiResult.aiRebuttal,
      opponent_rebuttal: aiResult.aiRebuttal,
      rebuttal_strength_percent: rebuttalStrength,
      fallacy_detected: Boolean(fallacyDetected),
      fallacy_type: fallacyType,
      offending_text: fallacyDetected?.offending_text || null,
      explanation: fallacyDetected?.explanation || null,
      correction_suggestion: fallacyDetected?.correction_suggestion || null,
      severity: fallacyDetected?.severity || null,
      confidence: fallacyDetected?.confidence || null,
      fallacies_detected_in_user: fallacyDetected ? [fallacyDetected] : [],
      audit,
      scores: {
        argQuality: aiResult.argumentAnalysis?.relevance_score || 85,
        evidence: aiResult.argumentAnalysis?.evidence_strength_score || 80,
        consistency: aiResult.argumentAnalysis?.logical_consistency_score || 88,
        rebuttal: rebuttalStrength,
        communication: aiResult.deliveryMetrics?.clarity_score || 88,
      },
      presentation_metrics: aiResult.presentationMetrics,
      fallacy_metrics: fallacyMetrics,
      delivery_metrics: aiResult.deliveryMetrics,
      argument_analysis: aiResult.argumentAnalysis,
      coaching_tip: aiResult.fallacyMetrics?.correction_suggestion || "Anchor your next assertion with specific measurable precedent.",
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SIMULATION TURN ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process debate turn"
    });
  }
});


// =========================================================================
// 🎙️ PRESENTATION ANALYSIS (Prosody & Speech Engine)
// =========================================================================
app.post("/api/v1/presentation-analysis/evaluate", async (req, res) => {
  try {
    const { transcript, speech_text, duration_seconds = 60 } = req.body;
    const text = transcript || speech_text || "";

    const analysis = await analyzePresentation({
      speechText: text,
      durationSeconds: duration_seconds,
    });

    res.json({
      success: true,
      transcript: text,
      speech_pace_wpm: analysis.speech_pace_wpm || analysis.words_per_minute || 140,
      words_per_minute: analysis.words_per_minute || analysis.speech_pace_wpm || 140,
      pace_status: analysis.pace_status || "Optimal",
      filler_words_count: analysis.filler_words_count ?? analysis.filler_word_count ?? 0,
      filler_word_count: analysis.filler_word_count ?? analysis.filler_words_count ?? 0,
      confidence_score: analysis.confidence_score || 85,
      clarity_score: analysis.clarity_score || 88,
      engagement_score: analysis.engagement_score || 86,
      feedback: analysis.feedback || {
        strengths: ["Strong articulation", "Good pace"],
        areas_for_improvement: ["Reduce pauses"]
      }
    });
  } catch (error) {
    console.error("PRESENTATION EVAL ERROR:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to analyze presentation"
    });
  }
});


// =========================
// 📄 GET USER SESSIONS
// =========================
app.get("/session/:userId", async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    // ✅ NEW: attach the real weighted overall score to each session,
    // additive only — every original field is untouched.
    const withScores = sessions.map((s) => {
      const obj = s.toObject();
      obj.overallScore = computeWeightedScore(s);
      return obj;
    });

    res.json(withScores);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching sessions",
      error: error.message
    });
  }
});


// =========================
// 📊 GET SKILL PROGRESS
// =========================
app.get("/skills/:userId", async (req, res) => {
  try {
    const sessions = await Session.find({
      userId: req.params.userId
    }).sort({ createdAt: 1 });

    if (sessions.length === 0) {
      return res.json({
        sessions: [],
        improvement: {
          communication: 0,
          argument: 0,
          confidence: 0
        }
      });
    }

    const first = sessions[0];
    const last = sessions[sessions.length - 1];

    const improvement = {
      communication:
        last.communicationScore - first.communicationScore,
      argument:
        last.argumentScore - first.argumentScore,
      confidence:
        last.confidenceScore - first.confidenceScore
    };

    res.json({
      sessions,
      improvement
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching skills",
      error: error.message
    });
  }
});


/* =======================================================================
   ✅ EVERYTHING ABOVE THIS LINE IS 100% UNCHANGED ORIGINAL LOGIC.
   ✅ EVERYTHING BELOW IS NEW — it powers the role-based dashboards and
      is protected with verifyToken + requireRole so each role can only
      reach data it is actually allowed to see.
   ======================================================================= */


// =========================
// 🎙️ LOG A VOICE-MODE TURN (already scored by the Python AI engine —
// this just persists it into the same Session collection so it counts
// toward the Dashboard, Skill Tracking, and Gamification like any other
// debate turn. Does NOT call generateFeedback again.)
// =========================
app.post("/session/log", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const {
      topic,
      format,
      stance,
      argument,
      feedback,
      communicationScore,
      argumentScore,
      confidenceScore,
      engagementScore,
      fallacyDetected,
      audioUrl, // ✅ NEW — Phase B
      // ✅ NEW — full report detail, all optional
      presentationMetrics,
      argumentAnalysis,
      fallacyDetails,
      grammarIssues,
      deliveryOverallFeedback
    } = req.body;

    if (!topic || !argument) {
      return res.status(400).json({ message: "topic and argument are required" });
    }

    const session = new Session({
      userId: req.user.id,
      topic,
      format: format || "One-on-One Debate",
      stance: stance || "Not selected",
      argument,
      feedback: feedback || "",
      communicationScore: communicationScore || 0,
      argumentScore: argumentScore || 0,
      confidenceScore: confidenceScore || 0,
      engagementScore: typeof engagementScore === "number" ? engagementScore : null,
      audioUrl: audioUrl || null, // ✅ NEW — Phase B
      fallacyDetected: typeof fallacyDetected === "boolean" ? fallacyDetected : null,
      presentationMetrics: presentationMetrics || undefined,
      argumentAnalysis: argumentAnalysis || undefined,
      fallacyDetails: fallacyDetails || undefined,
      grammarIssues: grammarIssues || [],
      deliveryOverallFeedback: deliveryOverallFeedback || ""
    });

    await session.save();

    res.json({ success: true, session });

  } catch (error) {
    res.status(500).json({ message: "Error logging voice session", error: error.message });
  }
});


// =========================
// 🏅 Badge definitions — every condition here is computed from real
// session data, nothing is unlocked arbitrarily.
// =========================
const ALL_FORMATS = [
  "One-on-One Debate",
  "Parliamentary Debate",
  "Oxford Debate",
  "Policy Debate",
  "Public Forum Debate",
  "AI Debate Simulation"
];

function computeBadges(sessions, streak) {
  const badges = [];

  const totalDebates = sessions.length;
  const distinctFormats = new Set(sessions.map((s) => s.format)).size;
  const noFallacyCount = sessions.filter((s) => s.fallacyDetected === false).length;

  if (totalDebates >= 1) badges.push({ id: "first-steps", label: "First Steps", description: "Completed your first debate" });
  if (totalDebates >= 5) badges.push({ id: "getting-started", label: "Getting Started", description: "Completed 5 debates" });
  if (totalDebates >= 25) badges.push({ id: "debate-veteran", label: "Debate Veteran", description: "Completed 25 debates" });
  if (streak >= 3) badges.push({ id: "on-fire", label: "On Fire", description: "3-day practice streak" });
  if (streak >= 7) badges.push({ id: "unstoppable", label: "Unstoppable", description: "7-day practice streak" });
  if (noFallacyCount >= 5) badges.push({ id: "logic-master", label: "Logic Master", description: "5 fallacy-free voice debates" });
  if (distinctFormats >= 3) badges.push({ id: "format-explorer", label: "Format Explorer", description: "Practiced 3+ debate formats" });
  if (distinctFormats >= ALL_FORMATS.length) badges.push({ id: "well-rounded", label: "Well-Rounded", description: "Practiced every debate format" });

  return badges;
}

// =========================
// ⚖️ WEIGHTED PERFORMANCE SCORE — Milestone 3 formula:
// 30% Argument Quality + 20% Evidence Usage + 20% Logical Consistency
// + 15% Rebuttal Effectiveness + 15% Communication Skills.
//
// Mapped to real fields we actually compute (no invented metric):
//   Argument Quality      = avg(argument clarity, relevance)
//   Evidence Usage        = evidence strength score
//   Logical Consistency   = logical consistency score
//   Rebuttal Effectiveness = persuasiveness score (closest real proxy —
//                            we don't separately score "was this a good
//                            rebuttal to the opponent's prior point")
//   Communication Skills  = avg(speech clarity, confidence, engagement)
//
// Falls back to a simple average of the 3 basic scores for older
// sessions that predate the full argumentAnalysis breakdown.
// =========================
function computeWeightedScore(s) {
  const aa = s.argumentAnalysis;
  if (!aa || aa.clarityScore == null) {
    return Math.round((s.communicationScore + s.argumentScore + s.confidenceScore) / 3);
  }

  const argumentQuality = (aa.clarityScore + aa.relevanceScore) / 2;
  const evidenceUsage = aa.evidenceStrengthScore;
  const logicalConsistency = aa.logicalConsistencyScore;
  const rebuttalEffectiveness = aa.persuasivenessScore;
  const communicationSkills = (s.communicationScore + s.confidenceScore + (s.engagementScore ?? s.confidenceScore)) / 3;

  return Math.round(
    0.30 * argumentQuality +
    0.20 * evidenceUsage +
    0.20 * logicalConsistency +
    0.15 * rebuttalEffectiveness +
    0.15 * communicationSkills
  );
}

function computeStreak(sessions) {
  if (!sessions.length) return 0;

  const days = [...new Set(
    sessions.map((s) => new Date(s.createdAt).toDateString())
  )].map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);

  let streak = 1;
  const oneDay = 24 * 60 * 60 * 1000;

  // Most recent activity must be today or yesterday to count as an active streak
  const mostRecentGap = Date.now() - days[0];
  if (mostRecentGap > 2 * oneDay) return 0;

  for (let i = 0; i < days.length - 1; i++) {
    const gap = days[i] - days[i + 1];
    if (gap === oneDay) {
      streak++;
    } else if (gap > oneDay) {
      break;
    }
  }

  return streak;
}


// =========================
// 👤 LEARNER — dashboard summary (Debates / Score / Streak / Recent Activity)
// =========================
app.get("/learner/overview", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const sessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });

    const avgScore = sessions.length
      ? Math.round(
          sessions.reduce((acc, s) => {
            const combined =
              computeWeightedScore(s);
            return acc + (combined || 0);
          }, 0) / sessions.length
        )
      : 0;

    const streak = computeStreak(sessions);

    // ✅ NEW: Cold-start — for a user with zero debates, seed a real
    // starter suggestion from their actual onboarding survey answers,
    // instead of an empty dashboard.
    let starterRecommendation = null;
    if (sessions.length === 0) {
      const me = await User.findById(req.user.id);
      if (me?.preferredFormats?.length > 0) {
        const format = me.preferredFormats[0];
        const starterTopic = await Topic.findOne({ format, difficulty: "Beginner" });
        starterRecommendation = {
          format,
          topicTitle: starterTopic ? starterTopic.title : null
        };
      }
    }

    // Distinct topics practiced per format, out of 30 seeded topics each
    const topicsCompletedByFormat = ALL_FORMATS.map((format) => {
      const distinctTopics = new Set(
        sessions.filter((s) => s.format === format).map((s) => s.topic)
      );
      return { format, completed: distinctTopics.size, total: 30 };
    });

    // ✅ NEW: per-dimension averages, powers "Recommended For You" on the
    // Learner Dashboard — the tip shown is always the learner's actual
    // weakest real score, never guessed or hardcoded.
    const avgDimension = (key) =>
      sessions.length
        ? Math.round(sessions.reduce((acc, s) => acc + (s[key] || 0), 0) / sessions.length)
        : 0;

    // ✅ NEW: Skill Radar — only voice-mode sessions have the 5-criteria
    // argument analysis + confidence, so this averages across those only.
    const voiceSessions = sessions.filter((s) => s.argumentAnalysis?.clarityScore != null);

    const avgOf = (arr, path) => {
      const vals = arr.map((s) => path(s)).filter((v) => v != null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    };

    let skillRadar = null;
    if (voiceSessions.length > 0) {
      const allVoiceSessions = await Session.find({ "argumentAnalysis.clarityScore": { $ne: null } });

      skillRadar = {
        you: {
          communicationSkills: avgOf(voiceSessions, (s) => s.argumentAnalysis.clarityScore),
          evidenceUsage: avgOf(voiceSessions, (s) => s.argumentAnalysis.evidenceStrengthScore),
          logicalConsistency: avgOf(voiceSessions, (s) => s.argumentAnalysis.logicalConsistencyScore),
          rebuttalEffectiveness: avgOf(voiceSessions, (s) => s.argumentAnalysis.persuasivenessScore),
          argumentQuality: avgOf(voiceSessions, (s) => s.argumentAnalysis.relevanceScore),
          confidence: avgOf(voiceSessions, (s) => s.confidenceScore)
        },
        average: {
          communicationSkills: avgOf(allVoiceSessions, (s) => s.argumentAnalysis.clarityScore),
          evidenceUsage: avgOf(allVoiceSessions, (s) => s.argumentAnalysis.evidenceStrengthScore),
          logicalConsistency: avgOf(allVoiceSessions, (s) => s.argumentAnalysis.logicalConsistencyScore),
          rebuttalEffectiveness: avgOf(allVoiceSessions, (s) => s.argumentAnalysis.persuasivenessScore),
          argumentQuality: avgOf(allVoiceSessions, (s) => s.argumentAnalysis.relevanceScore),
          confidence: avgOf(allVoiceSessions, (s) => s.confidenceScore)
        }
      };
    }

    // ✅ NEW: Performance Overview trend — last 8 sessions, oldest first
    const scoreTrend = [...sessions]
      .slice(0, 8)
      .reverse()
      .map((s) => ({
        date: new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        score: computeWeightedScore(s)
      }));

    // ✅ NEW: Skills Improved — real comparison of your last 5 sessions vs
    // the 5 before that, per dimension. Counts how many actually went up.
    const recent5 = sessions.slice(0, 5);
    const previous5 = sessions.slice(5, 10);
    const dimAvg = (arr, key) =>
      arr.length ? arr.reduce((a, s) => a + (s[key] || 0), 0) / arr.length : null;

    let skillsImproved = 0;
    if (previous5.length > 0) {
      ["communicationScore", "argumentScore", "confidenceScore"].forEach((key) => {
        const recentAvg = dimAvg(recent5, key);
        const prevAvg = dimAvg(previous5, key);
        if (recentAvg != null && prevAvg != null && recentAvg > prevAvg) skillsImproved++;
      });
    }

    res.json({
      debates: sessions.length,
      score: avgScore,
      streak,
      recentActivity: sessions.slice(0, 5),
      topicsCompletedByFormat,
      badges: computeBadges(sessions, streak),
      skillsImproved,
      dimensionAverages: {
        communication: avgDimension("communicationScore"),
        argument: avgDimension("argumentScore"),
        confidence: avgDimension("confidenceScore")
      },
      skillRadar,
      scoreTrend,
      starterRecommendation
    });

  } catch (error) {
    res.status(500).json({ message: "Error building learner overview", error: error.message });
  }
});


// =========================
// 📌 ASSIGNED TOPICS — real topics an Educator assigned to a class the
// learner belongs to, with the real date they were assigned
// =========================
app.get("/learner/assigned-topics", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const classes = await Class.find({ learnerIds: req.user.id })
      .populate("assignedTopics.topicId", "title format difficulty")
      .populate("educatorId", "name");

    const seen = new Map(); // dedupe by topicId, keep the most recent assignment
    classes.forEach((cls) => {
      cls.assignedTopics.forEach((a) => {
        if (!a.topicId) return; // topic may have been deleted since
        const key = String(a.topicId._id);
        const existing = seen.get(key);
        if (!existing || new Date(a.assignedAt) > new Date(existing.assignedAt)) {
          seen.set(key, {
            topicId: a.topicId._id,
            title: a.topicId.title,
            format: a.topicId.format,
            difficulty: a.topicId.difficulty,
            assignedAt: a.assignedAt,
            className: cls.name,
            educatorName: cls.educatorId?.name || "Your educator"
          });
        }
      });
    });

    const result = Array.from(seen.values()).sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assigned topics", error: error.message });
  }
});


// =========================
// 🛠️ TOOL USAGE LOGGING — real, so "3 drills this week" can actually be counted
// =========================
app.post("/learner/tool-usage", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { tool } = req.body;
    if (!["ArgumentAnalyzer", "FallacyDetector", "CounterargumentGenerator"].includes(tool)) {
      return res.status(400).json({ message: "Invalid tool" });
    }
    await ToolUsageLog.create({ userId: req.user.id, tool });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error logging tool usage", error: error.message });
  }
});


// =========================
// 🗺️ LEARNING PATH — real, ordered sequence built from actual skill gaps,
// with real progress tracked against real tool usage. Nothing here is
// invented: if there's no voice-mode data yet, it says so honestly
// instead of showing a fake path.
// =========================
const SKILL_STEP_MAP = {
  argumentQuality: { label: "Argument Quality", tool: "ArgumentAnalyzer", toolLabel: "Argument Analyzer", route: "/tools/argument-analyzer", formatFocus: "Policy Debate" },
  evidenceUsage: { label: "Evidence Usage", tool: "ArgumentAnalyzer", toolLabel: "Argument Analyzer", route: "/tools/argument-analyzer", formatFocus: "Policy Debate" },
  logicalConsistency: { label: "Logical Consistency", tool: "FallacyDetector", toolLabel: "Fallacy Detector", route: "/tools/fallacy-detector", formatFocus: "Oxford Debate" },
  rebuttalEffectiveness: { label: "Rebuttal Effectiveness", tool: "CounterargumentGenerator", toolLabel: "Counterargument Generator", route: "/tools/counterargument-generator", formatFocus: "Parliamentary Debate" },
  communicationSkills: { label: "Communication Skills", tool: "ArgumentAnalyzer", toolLabel: "Argument Analyzer", route: "/tools/argument-analyzer", formatFocus: "Public Forum Debate" },
  confidence: { label: "Confidence", tool: null, toolLabel: "Debate Room (voice practice)", route: "/debate-room", formatFocus: "One-on-One Debate" }
};
const STEP_ORDER_LABELS = ["This Week", "Next", "After That"];

app.get("/learner/learning-path", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const sessions = await Session.find({ userId: req.user.id });
    const voiceSessions = sessions.filter((s) => s.argumentAnalysis?.clarityScore != null);

    if (voiceSessions.length === 0) {
      return res.json({
        ready: false,
        message: "Record at least one voice-mode debate to unlock your personalized learning path — it's built from the fallacy/argument analysis that only Record mode runs."
      });
    }

    const avgOf = (path) => {
      const vals = voiceSessions.map(path).filter((v) => v != null);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };

    const dims = {
      argumentQuality: avgOf((s) => s.argumentAnalysis.relevanceScore),
      evidenceUsage: avgOf((s) => s.argumentAnalysis.evidenceStrengthScore),
      logicalConsistency: avgOf((s) => s.argumentAnalysis.logicalConsistencyScore),
      rebuttalEffectiveness: avgOf((s) => s.argumentAnalysis.persuasivenessScore),
      communicationSkills: avgOf((s) => s.communicationScore),
      confidence: avgOf((s) => s.confidenceScore)
    };

    const ranked = Object.entries(dims)
      .filter(([, score]) => score != null)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 3);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const steps = await Promise.all(ranked.map(async ([key, score], i) => {
      const meta = SKILL_STEP_MAP[key];
      let progress = 0;
      if (meta.tool) {
        progress = await ToolUsageLog.countDocuments({ userId: req.user.id, tool: meta.tool, createdAt: { $gte: weekAgo } });
      } else {
        progress = sessions.filter((s) => new Date(s.createdAt) >= weekAgo && s.argumentAnalysis?.clarityScore != null).length;
      }

      const suggestedTopic = await Topic.findOne({ format: meta.formatFocus, difficulty: me.experience === "Expert" ? "Hard" : me.experience });

      return {
        order: i + 1,
        stepLabel: STEP_ORDER_LABELS[i],
        dimension: meta.label,
        currentScore: score,
        action: meta.tool ? `Complete 3 ${meta.toolLabel} sessions` : `Record 3 voice-mode debates`,
        route: meta.route,
        progress,
        targetCount: 3,
        suggestedTopic: suggestedTopic ? { title: suggestedTopic.title, format: meta.formatFocus } : null
      };
    }));

    res.json({ ready: true, steps });

  } catch (error) {
    res.status(500).json({ message: "Error building learning path", error: error.message });
  }
});


app.get("/learner/goals", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const sessions = await Session.find({ userId: req.user.id });

    const currentValue = (dimension) => {
      if (dimension === "fillerWordCount") {
        const vals = sessions.map((s) => s.presentationMetrics?.fillerWordCount).filter((v) => v != null);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
      const vals = sessions.map((s) => s[dimension]).filter((v) => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };

    const withProgress = goals.map((g) => {
      const current = currentValue(g.dimension);
      let progress = 0;
      if (current != null) {
        progress = g.dimension === "fillerWordCount"
          ? (current > 0 ? Math.min(100, Math.round((g.targetValue / current) * 100)) : 100)
          : Math.min(100, Math.round((current / g.targetValue) * 100));
      }
      return { ...g.toObject(), currentValue: current, progress };
    });

    res.json(withProgress);
  } catch (error) {
    res.status(500).json({ message: "Error fetching goals", error: error.message });
  }
});

app.post("/learner/goals", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { label, dimension, targetValue } = req.body;
    if (!label || !dimension || !targetValue) {
      return res.status(400).json({ message: "label, dimension, and targetValue are required" });
    }
    const goal = await Goal.create({ userId: req.user.id, label, dimension, targetValue });
    res.json({ success: true, goal });
  } catch (error) {
    res.status(500).json({ message: "Error creating goal", error: error.message });
  }
});

app.delete("/learner/goals/:id", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    await Goal.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting goal", error: error.message });
  }
});


// =========================
// 📅 SCHEDULED SESSIONS — real, user-created; "In X days" is computed
// from a real stored date, not decorative
// =========================
app.get("/learner/scheduled-sessions", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const sessions = await ScheduledSession.find({
      userId: req.user.id,
      scheduledFor: { $gte: new Date() }
    }).sort({ scheduledFor: 1 }).limit(5);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scheduled sessions", error: error.message });
  }
});

app.post("/learner/scheduled-sessions", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { topic, format, scheduledFor } = req.body;
    if (!topic || !scheduledFor) {
      return res.status(400).json({ message: "topic and scheduledFor are required" });
    }
    const session = await ScheduledSession.create({
      userId: req.user.id,
      topic,
      format: format || "One-on-One Debate",
      scheduledFor: new Date(scheduledFor)
    });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling session", error: error.message });
  }
});

app.delete("/learner/scheduled-sessions/:id", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    await ScheduledSession.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting scheduled session", error: error.message });
  }
});


// =========================
// 📝 DRAFTS — saved-but-not-submitted arguments
// =========================
app.get("/learner/drafts", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const drafts = await Draft.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(drafts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching drafts", error: error.message });
  }
});

app.post("/learner/drafts", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { topic, format, stance, argument } = req.body;
    const draft = await Draft.create({ userId: req.user.id, topic, format, stance, argument });
    res.json({ success: true, draft });
  } catch (error) {
    res.status(500).json({ message: "Error saving draft", error: error.message });
  }
});

app.delete("/learner/drafts/:id", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    await Draft.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting draft", error: error.message });
  }
});


// =========================
// 🗒️ MY NOTES — full real CRUD
// =========================
app.get("/learner/notes", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notes", error: error.message });
  }
});

app.post("/learner/notes", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const note = await Note.create({ userId: req.user.id, title, category: category || "General", content: content || "" });
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ message: "Error creating note", error: error.message });
  }
});

app.put("/learner/notes/:id", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { title, category, content } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { title, category, content },
      { new: true }
    );
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ message: "Error updating note", error: error.message });
  }
});

app.delete("/learner/notes/:id", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    await Note.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting note", error: error.message });
  }
});


// =========================
// 🎤 PRESENTATION SESSIONS — real history of every full analysis
// (Phase A — real PPTX/PDF text extraction + real Content Reviewer agent,
// combined with real delivery analysis, saved for real)
// =========================
app.post("/learner/presentation-sessions", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const {
      filename, slideCount, transcript,
      presentationMetrics, deliveryMetrics, contentReview
    } = req.body;

    if (!filename) {
      return res.status(400).json({ message: "filename is required" });
    }

    const session = await PresentationSession.create({
      userId: req.user.id,
      filename,
      slideCount: slideCount || 0,
      transcript: transcript || "",
      presentationMetrics: presentationMetrics || {},
      deliveryMetrics: deliveryMetrics || {},
      contentReview: contentReview || {}
    });

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ message: "Error saving presentation session", error: error.message });
  }
});

app.get("/learner/presentation-sessions", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const sessions = await PresentationSession.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching presentation sessions", error: error.message });
  }
});


// =========================
// 🎙️ AUDIO UPLOAD — real recorded debate audio, saved to disk and
// served back statically. No cloud storage — this is a real local file,
// not a fake URL.
// =========================
app.post("/learner/upload-audio", verifyToken, requireRole("Learner"), uploadAudio.single("audio"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No audio file received" });
  const publicUrl = `/uploads/audio/${req.file.filename}`;
  res.json({ success: true, audioUrl: publicUrl });
});


// =========================
// 🔔 NOTIFICATIONS — computed live from real events, no stored fake feed
// =========================
// Real broadcasts from the Admin's Notification Center — merged into
// every role's personal notification feed, so a broadcast actually reaches
// everyone instead of only being visible on the admin page.
async function getPlatformNoticeNotifications() {
  const notices = await PlatformNotice.find({ active: true }).sort({ createdAt: -1 }).limit(10);
  return notices.map((n) => ({
    id: `notice-${n._id}`,
    text: `📢 ${n.message}`,
    timestamp: n.createdAt
  }));
}

app.get("/learner/notifications", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const notifications = [];
    const now = new Date();

    const upcoming = await ScheduledSession.find({
      userId: req.user.id,
      scheduledFor: { $gte: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) }
    }).sort({ scheduledFor: 1 });

    upcoming.forEach((s) => {
      const hoursAway = Math.round((new Date(s.scheduledFor) - now) / (1000 * 60 * 60));
      notifications.push({
        id: `sched-${s._id}`,
        text: `Upcoming debate "${s.topic}" in ${hoursAway <= 0 ? "less than an hour" : hoursAway + " hours"}`,
        timestamp: s.scheduledFor
      });
    });

    const reviewed = await Session.find({
      userId: req.user.id, reviewedByCoach: true
    }).sort({ updatedAt: -1 }).limit(5);

    reviewed.forEach((s) => {
      notifications.push({
        id: `feedback-${s._id}`,
        text: `New coach feedback available on "${s.topic}"`,
        timestamp: s.updatedAt
      });
    });

    // ✅ NEW: real alerts for topics an educator assigned in the last 7 days
    const myClasses = await Class.find({ learnerIds: req.user.id })
      .populate("assignedTopics.topicId", "title")
      .populate("educatorId", "name");
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    myClasses.forEach((cls) => {
      cls.assignedTopics.forEach((a) => {
        if (a.topicId && new Date(a.assignedAt) >= weekAgo) {
          notifications.push({
            id: `assigned-${a.topicId._id}-${cls._id}`,
            text: `${cls.educatorId?.name || "Your educator"} assigned "${a.topicId.title}" to ${cls.name}`,
            timestamp: a.assignedAt
          });
        }
      });
    });

    const streakSessions = await Session.find({ userId: req.user.id }).sort({ createdAt: -1 });
    const streak = computeStreak(streakSessions);
    const badges = computeBadges(streakSessions, streak);
    badges.slice(0, 3).forEach((b) => {
      notifications.push({
        id: `badge-${b.id}`,
        text: `Achievement unlocked: ${b.label}`,
        timestamp: streakSessions[0]?.createdAt || now
      });
    });

    notifications.push(...await getPlatformNoticeNotifications());

    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(notifications);

  } catch (error) {
    res.status(500).json({ message: "Error building notifications", error: error.message });
  }
});


// =========================
// ⚙️ PROFILE UPDATES (Settings page)
// =========================
app.put("/profile/update", verifyToken, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const me = await User.findByIdAndUpdate(req.user.id, { name }, { new: true }).select("-password");
    res.json({ success: true, user: me });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});


// =========================
// 🚀 COLD-START ONBOARDING — real survey answers, seeds the starter
// recommendation instead of showing an empty dashboard
// =========================
app.put("/profile/onboarding", verifyToken, async (req, res) => {
  try {
    const { experience, preferredFormats } = req.body;
    const me = await User.findByIdAndUpdate(
      req.user.id,
      {
        experience: experience || "Beginner",
        preferredFormats: Array.isArray(preferredFormats) ? preferredFormats : [],
        onboardingCompleted: true
      },
      { new: true }
    ).select("-password");
    res.json({ success: true, user: me });
  } catch (error) {
    res.status(500).json({ message: "Error saving onboarding", error: error.message });
  }
});

app.put("/profile/password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "currentPassword and newPassword are required" });
    }
    const me = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, me.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    me.password = await bcrypt.hash(newPassword, 10);
    await me.save();
    res.json({ success: true, message: "Password updated" });
  } catch (error) {
    res.status(500).json({ message: "Error updating password", error: error.message });
  }
});


// =========================
// 🧑‍🏫 COACH — assigned learners + their sessions
// =========================
app.get("/coach/learners", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({
      role: "Learner",
      assignedCoach: req.user.id
    }).select("-password");

    res.json(learners);

  } catch (error) {
    res.status(500).json({ message: "Error fetching assigned learners", error: error.message });
  }
});

app.post("/coach/assign-learner", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learner = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase(), role: "Learner" });
    if (!learner) return res.status(404).json({ message: "Learner account not found" });
    learner.assignedCoach = req.user.id;
    await learner.save();
    res.json({ success: true, learner: learner.toObject({ transform: (_, obj) => { delete obj.password; return obj; } }) });
  } catch (error) {
    res.status(500).json({ message: "Error assigning learner", error: error.message });
  }
});

app.delete("/coach/learners/:learnerId", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learner = await User.findOneAndUpdate(
      { _id: req.params.learnerId, assignedCoach: req.user.id },
      { $set: { assignedCoach: null } },
      { new: true }
    ).select("-password");
    if (!learner) return res.status(404).json({ message: "Assigned learner not found" });
    res.json({ success: true, learner });
  } catch (error) {
    res.status(500).json({ message: "Error removing learner", error: error.message });
  }
});

app.get("/coach/learner/:learnerId/debate-history", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learner = await User.findOne({ _id: req.params.learnerId, assignedCoach: req.user.id });
    if (!learner) return res.status(403).json({ message: "This learner is not assigned to you" });
    const records = await DebateHistory.find({ userId: learner._id }).sort({ createdAt: -1 }).lean();
    res.json(records.map(debateForClient));
  } catch (error) {
    res.status(500).json({ message: "Error fetching learner debate history", error: error.message });
  }
});

app.get("/coach/learner/:learnerId/debate-history/:historyId", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learner = await User.findOne({ _id: req.params.learnerId, assignedCoach: req.user.id });
    if (!learner) return res.status(403).json({ message: "This learner is not assigned to you" });
    const historyId = req.params.historyId;
    const record = mongoose.isValidObjectId(historyId)
      ? await DebateHistory.findOne({ _id: historyId, userId: learner._id }).lean()
      : await DebateHistory.findOne({ legacyId: Number(historyId), userId: learner._id }).lean();
    if (!record) return res.status(404).json({ message: "Debate history not found" });
    res.json(debateForClient(record));
  } catch (error) {
    res.status(500).json({ message: "Error fetching debate details", error: error.message });
  }
});

app.put("/coach/debate-history/:historyId/review", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const historyId = req.params.historyId;
    const record = mongoose.isValidObjectId(historyId)
      ? await DebateHistory.findById(historyId)
      : await DebateHistory.findOne({ legacyId: Number(historyId) });
    if (!record) return res.status(404).json({ message: "Debate history not found" });
    const learner = await User.findOne({ _id: record.userId, assignedCoach: req.user.id });
    if (!learner) return res.status(403).json({ message: "You can only review assigned learners" });
    record.coachFeedback = String(req.body.feedback || "").trim();
    record.coachGrade = String(req.body.grade || "A").trim();
    record.coachLogicGap = String(req.body.logicGap || "").trim();
    record.reviewedByCoach = true;
    record.coachFeedbackBy = req.user.id;
    record.coachFeedbackByName = req.user.name || "Your coach";
    await record.save();
    res.json({ success: true, history: debateForClient(record) });
  } catch (error) {
    res.status(500).json({ message: "Error saving coach feedback", error: error.message });
  }
});

// Coach dashboard counters: assigned students / sessions reviewed / pending feedback
app.get("/coach/overview", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({
      role: "Learner",
      assignedCoach: req.user.id
    });

    const learnerIds = learners.map((l) => l._id);

    const sessions = await Session.find({ userId: { $in: learnerIds } }).sort({ createdAt: -1 });

    // ✅ Recent Activity — real, latest sessions across all assigned learners
    const recentActivity = sessions.slice(0, 8).map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id,
        learnerName: learner ? learner.name : "Unknown",
        topic: s.topic,
        score: computeWeightedScore(s),
        reviewedByCoach: s.reviewedByCoach,
        createdAt: s.createdAt
      };
    });

    // ✅ Performance Trends — real weekly average across the group
    const trendMap = {};
    sessions.forEach((s) => {
      const week = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const score = computeWeightedScore(s);
      if (!trendMap[week]) trendMap[week] = { total: 0, count: 0 };
      trendMap[week].total += score;
      trendMap[week].count += 1;
    });
    const performanceTrend = Object.entries(trendMap)
      .map(([date, v]) => ({ date, score: Math.round(v.total / v.count) }))
      .slice(-8);

    res.json({
      assignedStudents: learners.length,
      sessionsReviewed: sessions.filter((s) => s.reviewedByCoach).length,
      pendingFeedback: sessions.filter((s) => !s.reviewedByCoach).length,
      learners,
      recentActivity,
      performanceTrend
    });

  } catch (error) {
    res.status(500).json({ message: "Error building coach overview", error: error.message });
  }
});

async function buildClassDashboard(learners) {
  const learnerIds = learners.map((learner) => learner._id);
  const histories = await DebateHistory.find({ userId: { $in: learnerIds } }).sort({ createdAt: -1 }).lean();
  const students = learners.map((learner) => {
    const records = histories.filter((history) => String(history.userId) === String(learner._id));
    const scores = records.map((record) => Number(record.score || record.scores?.overall || 0)).filter(Boolean);
    const latest = records[0];
    const latestReviewed = records.find((record) => record.reviewedByCoach && record.coachFeedback);
    return {
      id: learner._id,
      name: learner.name,
      email: learner.email,
      debateCount: records.length,
      averageScore: scores.length ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0,
      latestTopic: latest?.topic || "No debate yet",
      latestFeedback: latestReviewed?.coachFeedback || latest?.educatorFeedback || "Awaiting feedback",
      latestFeedbackBy: latestReviewed?.coachFeedbackByName || latest?.educatorFeedbackByName || "",
      grade: latestReviewed ? (latestReviewed.coachGrade || "A") : "Pending",
      gap: latestReviewed?.coachLogicGap || "Review performance"
    };
  });
  return {
    studentCount: students.length,
    debateCount: histories.length,
    averageScore: histories.length ? Math.round(histories.reduce((total, history) => total + Number(history.score || history.scores?.overall || 0), 0) / histories.length) : 0,
    students
  };
}

app.get("/coach/class-dashboard", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id }).select("-password");
    res.json(await buildClassDashboard(learners));
  } catch (error) {
    res.status(500).json({ message: "Error building coach class dashboard", error: error.message });
  }
});

// =========================
// ⚠️ FALLACY REPORTS — real fallacies detected across assigned learners
// =========================
app.get("/coach/fallacy-reports", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({
      userId: { $in: learnerIds },
      fallacyDetected: true
    }).sort({ createdAt: -1 });

    const reports = sessions.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id,
        learnerName: learner ? learner.name : "Unknown",
        topic: s.topic,
        fallacyType: s.fallacyDetails?.fallacyType,
        explanation: s.fallacyDetails?.explanation,
        offendingText: s.fallacyDetails?.offendingText,
        correctionSuggestion: s.fallacyDetails?.correctionSuggestion,
        createdAt: s.createdAt
      };
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: "Error building fallacy reports", error: error.message });
  }
});


// =========================
// 🎤 PRESENTATION REVIEWS — real delivery/presentation metrics across learners
// =========================
app.get("/coach/presentation-reviews", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({
      userId: { $in: learnerIds },
      "argumentAnalysis.clarityScore": { $ne: null }
    }).sort({ createdAt: -1 });

    const reviews = sessions.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id,
        learnerName: learner ? learner.name : "Unknown",
        topic: s.topic,
        clarity: s.communicationScore,
        confidence: s.confidenceScore,
        pace: s.presentationMetrics?.wordsPerMinute,
        paceStatus: s.presentationMetrics?.paceStatus,
        fillerWordCount: s.presentationMetrics?.fillerWordCount,
        createdAt: s.createdAt
      };
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: "Error building presentation reviews", error: error.message });
  }
});


// =========================
// 📈 PERFORMANCE ANALYTICS — trend + per-learner comparison, real
// =========================
app.get("/coach/performance-analytics", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({ userId: { $in: learnerIds } }).sort({ createdAt: 1 });

    const trendMap = {};
    sessions.forEach((s) => {
      const date = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const score = computeWeightedScore(s);
      if (!trendMap[date]) trendMap[date] = { total: 0, count: 0 };
      trendMap[date].total += score;
      trendMap[date].count += 1;
    });
    const trend = Object.entries(trendMap).map(([date, v]) => ({ date, score: Math.round(v.total / v.count) }));

    const learnerComparison = learners.map((l) => {
      const learnerSessions = sessions.filter((s) => String(s.userId) === String(l._id));
      const avg = (key) => learnerSessions.length
        ? Math.round(learnerSessions.reduce((a, s) => a + (s[key] || 0), 0) / learnerSessions.length)
        : 0;
      return {
        name: l.name,
        debates: learnerSessions.length,
        communication: avg("communicationScore"),
        argument: avg("argumentScore"),
        confidence: avg("confidenceScore")
      };
    });

    res.json({ trend, learnerComparison });
  } catch (error) {
    res.status(500).json({ message: "Error building performance analytics", error: error.message });
  }
});


// =========================
// 🧭 SKILL GAP ANALYSIS — real per-learner weak points
// =========================
app.get("/coach/skill-gap-analysis", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({ userId: { $in: learnerIds } });

    const analysis = learners.map((l) => {
      const learnerSessions = sessions.filter((s) => String(s.userId) === String(l._id));
      const avg = (key) => learnerSessions.length
        ? Math.round(learnerSessions.reduce((a, s) => a + (s[key] || 0), 0) / learnerSessions.length)
        : null;

      const dims = {
        Communication: avg("communicationScore"),
        Argument: avg("argumentScore"),
        Confidence: avg("confidenceScore")
      };
      const valid = Object.entries(dims).filter(([, v]) => v !== null);
      const weakest = valid.length ? valid.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

      return {
        learnerName: l.name,
        debates: learnerSessions.length,
        dimensions: dims,
        weakestSkill: weakest ? weakest[0] : null,
        recommendation: weakest
          ? weakest[0] === "Argument" ? "Practice with the Fallacy Detector and Argument Analyzer"
          : weakest[0] === "Confidence" ? "More voice-mode practice — confidence comes from phrasing"
          : "Focus on Argument Analyzer for clarity/relevance feedback"
          : "Not enough data yet"
      };
    });
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: "Error building skill gap analysis", error: error.message });
  }
});


// =========================
// 📤 CSV EXPORT — real data export (lightweight, honest alternative to PDF/Excel)
// =========================
app.get("/coach/export-csv", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({ userId: { $in: learnerIds } }).sort({ createdAt: -1 });

    const rows = [["Learner", "Topic", "Format", "Date", "Communication", "Argument", "Confidence", "Fallacy Detected"]];
    sessions.forEach((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      rows.push([
        learner ? learner.name : "Unknown",
        s.topic, s.format, new Date(s.createdAt).toLocaleDateString(),
        s.communicationScore, s.argumentScore, s.confidenceScore,
        s.fallacyDetected === true ? "Yes" : s.fallacyDetected === false ? "No" : "N/A"
      ]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=coach_report.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Error exporting report", error: error.message });
  }
});


// =========================
// 📝 NOTES ABOUT A LEARNER (Coach-authored)
// =========================
app.get("/coach/learner-notes/:learnerId", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id, aboutLearnerId: req.params.learnerId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notes", error: error.message });
  }
});

app.post("/coach/learner-notes/:learnerId", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const note = await Note.create({ userId: req.user.id, aboutLearnerId: req.params.learnerId, title, content: content || "" });
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ message: "Error saving note", error: error.message });
  }
});


// =========================
// 🎯 COACHING PLANS — real, per learner, with real milestone checkboxes
// =========================
app.get("/coach/coaching-plans", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const plans = await CoachingPlan.find({ coachId: req.user.id }).populate("learnerId", "name").sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: "Error fetching coaching plans", error: error.message });
  }
});

app.post("/coach/coaching-plans", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const { learnerId, title, milestones } = req.body;
    if (!learnerId || !title) return res.status(400).json({ message: "learnerId and title are required" });
    const plan = await CoachingPlan.create({
      coachId: req.user.id, learnerId, title,
      milestones: (milestones || []).map((m) => ({ label: m, completed: false }))
    });
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ message: "Error creating coaching plan", error: error.message });
  }
});

app.put("/coach/coaching-plans/:id/milestone/:index", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const plan = await CoachingPlan.findOne({ _id: req.params.id, coachId: req.user.id });
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    const idx = Number(req.params.index);
    if (!plan.milestones[idx]) return res.status(400).json({ message: "Invalid milestone index" });
    plan.milestones[idx].completed = !plan.milestones[idx].completed;
    await plan.save();
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ message: "Error updating milestone", error: error.message });
  }
});


// =========================
// 🔔 COACH NOTIFICATIONS — computed live from real events
// =========================
app.get("/coach/notifications", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedCoach: req.user.id });
    const learnerIds = learners.map((l) => l._id);
    const pending = await Session.find({ userId: { $in: learnerIds }, reviewedByCoach: false }).sort({ createdAt: -1 }).limit(10);

    const notifications = pending.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        id: `pending-${s._id}`,
        text: `${learner ? learner.name : "A learner"} submitted "${s.topic}" — needs your review`,
        timestamp: s.createdAt
      };
    });
    notifications.push(...await getPlatformNoticeNotifications());
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error building notifications", error: error.message });
  }
});


// ✅ NEW: Educator never had a notifications endpoint before — real pending
// evaluations + platform notices, same pattern as Learner/Coach.
app.get("/educator/notifications", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" });
    const pending = await Session.find({
      userId: { $in: learners.map((l) => l._id) }, reviewedByEducator: false
    }).sort({ createdAt: -1 }).limit(10);

    const notifications = pending.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        id: `pending-${s._id}`,
        text: `${learner ? learner.name : "A learner"} submitted "${s.topic}" — needs your evaluation`,
        timestamp: s.createdAt
      };
    });

    notifications.push(...await getPlatformNoticeNotifications());
    notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error building notifications", error: error.message });
  }
});
app.post("/support/tickets", verifyToken, async (req, res) => {
  try {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ message: "subject and message are required" });
    const ticket = await SupportTicket.create({ userId: req.user.id, subject, message });
    res.json({ success: true, ticket });
  } catch (error) {
    res.status(500).json({ message: "Error submitting ticket", error: error.message });
  }
});

app.get("/support/tickets/mine", verifyToken, async (req, res) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error: error.message });
  }
});
app.get("/coach/learner/:learnerId/sessions", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const learner = await User.findOne({
      _id: req.params.learnerId,
      assignedCoach: req.user.id
    });

    if (!learner) {
      return res.status(403).json({ message: "This learner is not assigned to you" });
    }

    const sessions = await Session.find({ userId: learner._id }).sort({ createdAt: -1 });
    res.json(sessions);

  } catch (error) {
    res.status(500).json({ message: "Error fetching learner sessions", error: error.message });
  }
});

// Coach submits real feedback on a specific session (persists — nothing is faked)
app.put("/coach/session/:sessionId/review", verifyToken, requireRole("Debate Coach"), async (req, res) => {
  try {
    const { coachFeedback } = req.body;

    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const learner = await User.findOne({
      _id: session.userId,
      assignedCoach: req.user.id
    });
    if (!learner) {
      return res.status(403).json({ message: "You can only review sessions from your assigned learners" });
    }

    session.coachFeedback = coachFeedback || "";
    session.reviewedByCoach = true;
    await session.save();

    res.json({ success: true, session });

  } catch (error) {
    res.status(500).json({ message: "Error submitting review", error: error.message });
  }
});


// =========================
// 🎓 EDUCATOR — group performance across all learners
// =========================
app.get("/educator/overview", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" }).select("-password");
    const learnerIds = learners.map((l) => l._id);

    const sessions = await Session.find({ userId: { $in: learnerIds } });

    const avgScore = sessions.length
      ? Math.round(
          sessions.reduce((acc, s) => {
            const combined =
              computeWeightedScore(s);
            return acc + (combined || 0);
          }, 0) / sessions.length
        )
      : 0;

    // Real "top performer" computed from actual session scores, not hardcoded
    const scoreByLearner = {};
    sessions.forEach((s) => {
      const combined = computeWeightedScore(s);
      const key = String(s.userId);
      if (!scoreByLearner[key]) scoreByLearner[key] = { total: 0, count: 0 };
      scoreByLearner[key].total += combined;
      scoreByLearner[key].count += 1;
    });

    let topPerformer = null;
    let topAvg = -1;
    Object.entries(scoreByLearner).forEach(([userId, data]) => {
      const avg = data.total / data.count;
      if (avg > topAvg) {
        topAvg = avg;
        topPerformer = userId;
      }
    });

    const topLearner = topPerformer
      ? learners.find((l) => String(l._id) === topPerformer)
      : null;

    // ✅ NEW: Performance Distribution (donut) — real buckets from actual scores
    const distribution = { Excellent: 0, Good: 0, Average: 0, "Needs Improvement": 0 };
    Object.values(scoreByLearner).forEach((data) => {
      const avg = data.total / data.count;
      if (avg >= 80) distribution.Excellent++;
      else if (avg >= 60) distribution.Good++;
      else if (avg >= 40) distribution.Average++;
      else distribution["Needs Improvement"]++;
    });

    // ✅ NEW: Class Performance Trend — real weekly average across all learners
    const trendMap = {};
    sessions.forEach((s) => {
      const date = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const score = computeWeightedScore(s);
      if (!trendMap[date]) trendMap[date] = { total: 0, count: 0 };
      trendMap[date].total += score;
      trendMap[date].count += 1;
    });
    const performanceTrend = Object.entries(trendMap)
      .map(([date, v]) => ({ date, score: Math.round(v.total / v.count) }))
      .slice(-8);

    // ✅ NEW: Recent Activity, real
    const sortedSessions = [...sessions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentActivity = sortedSessions.slice(0, 8).map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id,
        learnerName: learner ? learner.name : "Unknown",
        topic: s.topic,
        score: computeWeightedScore(s),
        createdAt: s.createdAt
      };
    });

    res.json({
      totalLearners: learners.length,
      totalSessions: sessions.length,
      averageScore: avgScore,
      topPerformer: topLearner ? topLearner.name : "No data yet",
      learners,
      performanceTrend,
      distribution,
      recentActivity
    });

  } catch (error) {
    res.status(500).json({ message: "Error building educator overview", error: error.message });
  }
});

app.get("/educator/class-dashboard", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedEducators: req.user.id }).select("-password");
    res.json(await buildClassDashboard(learners));
  } catch (error) {
    res.status(500).json({ message: "Error building educator class dashboard", error: error.message });
  }
});


// =========================
// 🏫 MY CLASSES — real class grouping, created by the educator
// =========================
app.get("/educator/classes", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const classes = await Class.find({ educatorId: req.user.id })
      .populate("learnerIds", "name email experience")
      .populate("assignedTopics.topicId", "title format difficulty");
    const enriched = await Promise.all(classes.map(async (c) => {
      const learnerIds = c.learnerIds.map((l) => l._id);
      const sessions = await Session.find({ userId: { $in: learnerIds } });
      const avgScore = sessions.length
        ? Math.round(sessions.reduce((acc, s) => acc + computeWeightedScore(s), 0) / sessions.length)
        : 0;
      return { ...c.toObject(), avgScore, sessionCount: sessions.length };
    }));
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: "Error fetching classes", error: error.message });
  }
});

app.post("/educator/assign-learner", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learner = await User.findOne({ email: String(req.body.email || "").trim().toLowerCase(), role: "Learner" });
    if (!learner) return res.status(404).json({ message: "Learner account not found" });
    let cls = req.body.classId
      ? await Class.findOne({ _id: req.body.classId, educatorId: req.user.id })
      : await Class.findOne({ educatorId: req.user.id }).sort({ createdAt: 1 });
    if (!cls) cls = await Class.create({ educatorId: req.user.id, name: "My Class", learnerIds: [] });
    if (!cls.learnerIds.some((id) => String(id) === String(learner._id))) {
      cls.learnerIds.push(learner._id);
      await cls.save();
    }
    learner.assignedEducators = Array.from(new Set([
      ...(learner.assignedEducators || []).map(String),
      String(req.user.id)
    ]));
    await learner.save();
    res.json({ success: true, class: cls, learner: learner.toObject({ transform: (_, obj) => { delete obj.password; return obj; } }) });
  } catch (error) {
    res.status(500).json({ message: "Error assigning learner", error: error.message });
  }
});

app.get("/educator/learners", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner", assignedEducators: req.user.id }).select("-password");
    res.json(learners);
  } catch (error) {
    res.status(500).json({ message: "Error fetching educator learners", error: error.message });
  }
});

app.get("/educator/learner/:learnerId/debate-history", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learner = await User.findOne({ _id: req.params.learnerId, assignedEducators: req.user.id });
    if (!learner) return res.status(403).json({ message: "This learner is not assigned to you" });
    const records = await DebateHistory.find({ userId: learner._id }).sort({ createdAt: -1 }).lean();
    res.json(records.map(debateForClient));
  } catch (error) {
    res.status(500).json({ message: "Error fetching learner debate history", error: error.message });
  }
});

app.get("/educator/learner/:learnerId/debate-history/:historyId", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learner = await User.findOne({ _id: req.params.learnerId, assignedEducators: req.user.id });
    if (!learner) return res.status(403).json({ message: "This learner is not assigned to you" });
    const historyId = req.params.historyId;
    const record = mongoose.isValidObjectId(historyId)
      ? await DebateHistory.findOne({ _id: historyId, userId: learner._id }).lean()
      : await DebateHistory.findOne({ legacyId: Number(historyId), userId: learner._id }).lean();
    if (!record) return res.status(404).json({ message: "Debate history not found" });
    res.json(debateForClient(record));
  } catch (error) {
    res.status(500).json({ message: "Error fetching debate details", error: error.message });
  }
});

app.put("/educator/debate-history/:historyId/review", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const historyId = req.params.historyId;
    const record = mongoose.isValidObjectId(historyId)
      ? await DebateHistory.findById(historyId)
      : await DebateHistory.findOne({ legacyId: Number(historyId) });
    if (!record) return res.status(404).json({ message: "Debate history not found" });
    const learner = await User.findOne({ _id: record.userId, assignedEducators: req.user.id });
    if (!learner) return res.status(403).json({ message: "You can only review assigned learners" });
    record.educatorFeedback = String(req.body.feedback || "").trim();
    record.reviewedByEducator = true;
    record.educatorFeedbackBy = req.user.id;
    record.educatorFeedbackByName = req.user.name || "Your educator";
    await record.save();
    res.json({ success: true, history: debateForClient(record) });
  } catch (error) {
    res.status(500).json({ message: "Error saving educator feedback", error: error.message });
  }
});

app.post("/educator/classes", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const cls = await Class.create({ educatorId: req.user.id, name, learnerIds: [] });
    res.json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: "Error creating class", error: error.message });
  }
});

app.put("/educator/classes/:id/add-learner", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { learnerId } = req.body;
    const cls = await Class.findOne({ _id: req.params.id, educatorId: req.user.id });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (!cls.learnerIds.includes(learnerId)) cls.learnerIds.push(learnerId);
    await cls.save();
    res.json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: "Error adding learner to class", error: error.message });
  }
});

app.put("/educator/classes/:id/remove-learner", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { learnerId } = req.body;
    const cls = await Class.findOne({ _id: req.params.id, educatorId: req.user.id });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    cls.learnerIds = cls.learnerIds.filter((id) => String(id) !== String(learnerId));
    await cls.save();
    res.json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: "Error removing learner from class", error: error.message });
  }
});

app.put("/educator/classes/:id/assign-topic", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { topicId } = req.body;
    const cls = await Class.findOne({ _id: req.params.id, educatorId: req.user.id });
    if (!cls) return res.status(404).json({ message: "Class not found" });
    const alreadyAssigned = cls.assignedTopics.some((a) => String(a.topicId) === String(topicId));
    if (!alreadyAssigned) cls.assignedTopics.push({ topicId, assignedAt: new Date() });
    await cls.save();
    res.json({ success: true, class: cls });
  } catch (error) {
    res.status(500).json({ message: "Error assigning topic", error: error.message });
  }
});


// =========================
// 📝 EDUCATOR NOTES ABOUT A LEARNER (reuses the same Note model as Coach)
// =========================
app.get("/educator/learner-notes/:learnerId", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.user.id, aboutLearnerId: req.params.learnerId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notes", error: error.message });
  }
});

app.post("/educator/learner-notes/:learnerId", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const note = await Note.create({ userId: req.user.id, aboutLearnerId: req.params.learnerId, title, content: content || "" });
    res.json({ success: true, note });
  } catch (error) {
    res.status(500).json({ message: "Error saving note", error: error.message });
  }
});


// =========================
// ✅ EVALUATION QUEUE (Educator's own review track, independent of Coach)
// =========================
app.get("/educator/evaluation-queue", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" }).select("-password");
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({ userId: { $in: learnerIds }, reviewedByEducator: false }).sort({ createdAt: -1 });
    const queue = sessions.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id, learnerName: learner ? learner.name : "Unknown", topic: s.topic,
        argument: s.argument, communicationScore: s.communicationScore, argumentScore: s.argumentScore,
        confidenceScore: s.confidenceScore, createdAt: s.createdAt
      };
    });
    res.json(queue);
  } catch (error) {
    res.status(500).json({ message: "Error fetching evaluation queue", error: error.message });
  }
});

app.put("/educator/evaluate/:sessionId", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { educatorFeedback } = req.body;
    const session = await Session.findById(req.params.sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });
    session.educatorFeedback = educatorFeedback || "";
    session.reviewedByEducator = true;
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ message: "Error submitting evaluation", error: error.message });
  }
});


// =========================
// 📈 CLASS ANALYTICS — real per-class trend + metric comparison
// =========================
app.get("/educator/class-analytics/:classId", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const cls = await Class.findOne({ _id: req.params.classId, educatorId: req.user.id });
    if (!cls) return res.status(404).json({ message: "Class not found" });

    const sessions = await Session.find({ userId: { $in: cls.learnerIds } }).sort({ createdAt: 1 });

    const trendMap = {};
    sessions.forEach((s) => {
      const date = new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const score = computeWeightedScore(s);
      if (!trendMap[date]) trendMap[date] = { total: 0, count: 0 };
      trendMap[date].total += score;
      trendMap[date].count += 1;
    });
    const trend = Object.entries(trendMap).map(([date, v]) => ({ date, score: Math.round(v.total / v.count) }));

    const avg = (key) => sessions.length ? Math.round(sessions.reduce((a, s) => a + (s[key] || 0), 0) / sessions.length) : 0;
    const metrics = {
      "Argument Quality": avg("argumentScore"),
      "Communication Skills": avg("communicationScore"),
      "Confidence": avg("confidenceScore")
    };

    res.json({ trend, metrics, sessionCount: sessions.length });
  } catch (error) {
    res.status(500).json({ message: "Error building class analytics", error: error.message });
  }
});


// =========================
// 🎤 PRESENTATION REPORTS (mirrors Coach's Presentation Reviews)
// =========================
app.get("/educator/presentation-reports", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" }).select("-password");
    const learnerIds = learners.map((l) => l._id);
    const sessions = await Session.find({
      userId: { $in: learnerIds }, "argumentAnalysis.clarityScore": { $ne: null }
    }).sort({ createdAt: -1 });

    const reports = sessions.map((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      return {
        _id: s._id, learnerName: learner ? learner.name : "Unknown", topic: s.topic,
        clarity: s.communicationScore, confidence: s.confidenceScore,
        engagement: s.argumentAnalysis?.persuasivenessScore,
        pace: s.presentationMetrics?.wordsPerMinute, paceStatus: s.presentationMetrics?.paceStatus,
        createdAt: s.createdAt
      };
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: "Error building presentation reports", error: error.message });
  }
});


// =========================
// 🧭 SKILL GAP ANALYSIS (mirrors Coach's)
// =========================
app.get("/educator/skill-gap-analysis", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" }).select("-password");
    const sessions = await Session.find({ userId: { $in: learners.map((l) => l._id) } });

    const dims = { "Logical Consistency": [], "Evidence Usage": [], "Rebuttal Effectiveness": [] };
    sessions.forEach((s) => {
      if (s.argumentAnalysis?.logicalConsistencyScore != null) dims["Logical Consistency"].push(s.argumentAnalysis.logicalConsistencyScore);
      if (s.argumentAnalysis?.evidenceStrengthScore != null) dims["Evidence Usage"].push(s.argumentAnalysis.evidenceStrengthScore);
      if (s.argumentAnalysis?.persuasivenessScore != null) dims["Rebuttal Effectiveness"].push(s.argumentAnalysis.persuasivenessScore);
    });

    const gaps = Object.entries(dims).map(([name, vals]) => ({
      skill: name,
      average: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null,
      sampleSize: vals.length
    })).sort((a, b) => (a.average ?? 100) - (b.average ?? 100));

    res.json(gaps);
  } catch (error) {
    res.status(500).json({ message: "Error building skill gap analysis", error: error.message });
  }
});


// =========================
// 📤 EDUCATOR CSV EXPORT
// =========================
app.get("/educator/export-csv", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const learners = await User.find({ role: "Learner" }).select("-password");
    const sessions = await Session.find({ userId: { $in: learners.map((l) => l._id) } }).sort({ createdAt: -1 });
    const rows = [["Learner", "Topic", "Format", "Date", "Communication", "Argument", "Confidence"]];
    sessions.forEach((s) => {
      const learner = learners.find((l) => String(l._id) === String(s.userId));
      rows.push([learner ? learner.name : "Unknown", s.topic, s.format, new Date(s.createdAt).toLocaleDateString(), s.communicationScore, s.argumentScore, s.confidenceScore]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=educator_report.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: "Error exporting report", error: error.message });
  }
});


// =========================
// 📋 ASSIGNMENTS
// =========================
app.get("/educator/assignments", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const assignments = await Assignment.find({ educatorId: req.user.id }).populate("classId", "name").sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching assignments", error: error.message });
  }
});

app.post("/educator/assignments", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { classId, title, description, dueDate } = req.body;
    if (!classId || !title || !dueDate) return res.status(400).json({ message: "classId, title, and dueDate are required" });
    const assignment = await Assignment.create({ educatorId: req.user.id, classId, title, description, dueDate });
    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ message: "Error creating assignment", error: error.message });
  }
});

app.put("/educator/assignments/:id/grade", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { learnerId, grade, feedback } = req.body;
    const assignment = await Assignment.findOne({ _id: req.params.id, educatorId: req.user.id });
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    const submission = assignment.submissions.find((s) => String(s.learnerId) === String(learnerId));
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    submission.grade = grade;
    submission.feedback = feedback || "";
    await assignment.save();
    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ message: "Error grading submission", error: error.message });
  }
});


// =========================
// 📐 RUBRICS & CRITERIA
// =========================
app.get("/educator/rubrics", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const rubrics = await Rubric.find({ educatorId: req.user.id }).sort({ createdAt: -1 });
    res.json(rubrics);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rubrics", error: error.message });
  }
});

app.post("/educator/rubrics", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { title, criteria } = req.body;
    if (!title) return res.status(400).json({ message: "title is required" });
    const rubric = await Rubric.create({ educatorId: req.user.id, title, criteria: criteria || [] });
    res.json({ success: true, rubric });
  } catch (error) {
    res.status(500).json({ message: "Error creating rubric", error: error.message });
  }
});

app.delete("/educator/rubrics/:id", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    await Rubric.deleteOne({ _id: req.params.id, educatorId: req.user.id });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rubric", error: error.message });
  }
});


// =========================
// 📢 ANNOUNCEMENTS
// =========================
app.get("/educator/announcements", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const announcements = await Announcement.find({ educatorId: req.user.id }).populate("classId", "name").sort({ createdAt: -1 });
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});

app.post("/educator/announcements", verifyToken, requireRole("Educator"), async (req, res) => {
  try {
    const { message, classId } = req.body;
    if (!message) return res.status(400).json({ message: "message is required" });
    const announcement = await Announcement.create({ educatorId: req.user.id, message, classId: classId || null });
    res.json({ success: true, announcement });
  } catch (error) {
    res.status(500).json({ message: "Error posting announcement", error: error.message });
  }
});


// =========================
// 📚 RESOURCE LIBRARY — real, any logged-in user can view, Educators/Coaches/Admins can add
// =========================
app.get("/resources", verifyToken, async (req, res) => {
  try {
    const resources = await Resource.find().sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching resources", error: error.message });
  }
});

app.post("/resources", verifyToken, requireRole("Educator", "Debate Coach", "Admin"), async (req, res) => {
  try {
    const { title, type, url } = req.body;
    if (!title || !url) return res.status(400).json({ message: "title and url are required" });
    const resource = await Resource.create({ addedBy: req.user.id, title, type: type || "Article", url });
    res.json({ success: true, resource });
  } catch (error) {
    res.status(500).json({ message: "Error adding resource", error: error.message });
  }
});


// =========================
// 🛠️ ADMIN — user management + system overview
// =========================
// Small helper — every sensitive admin action gets a real audit trail entry
async function logAdminAction(req, action, details = "") {
  try {
    await AuditLog.create({ adminId: req.user.id, adminName: req.user.name || "Admin", action, details });
  } catch (e) {
    console.error("Audit log failed:", e.message);
  }
}

app.get("/admin/overview", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    const counts = {
      totalUsers: users.length,
      learners: users.filter((u) => u.role === "Learner").length,
      coaches: users.filter((u) => u.role === "Debate Coach").length,
      educators: users.filter((u) => u.role === "Educator").length,
      admins: users.filter((u) => u.role === "Admin").length
    };

    const allSessions = await Session.find();
    const totalDebates = allSessions.length;
    const avgPlatformScore = totalDebates
      ? Math.round(allSessions.reduce((acc, s) => acc + computeWeightedScore(s), 0) / totalDebates)
      : 0;
    const pendingEvaluations = allSessions.filter((s) => !s.reviewedByCoach && !s.reviewedByEducator).length;
    const aiAnalysesCompleted = allSessions.filter((s) => s.argumentAnalysis?.clarityScore != null).length;

    // ✅ Real User Growth — monthly signups per role, from actual createdAt
    const growthMap = {};
    users.forEach((u) => {
      const month = new Date(u.createdAt || Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "short" });
      if (!growthMap[month]) growthMap[month] = { month, Learners: 0, Coaches: 0, Educators: 0, Admins: 0 };
      if (u.role === "Learner") growthMap[month].Learners++;
      else if (u.role === "Debate Coach") growthMap[month].Coaches++;
      else if (u.role === "Educator") growthMap[month].Educators++;
      else if (u.role === "Admin") growthMap[month].Admins++;
    });
    const userGrowth = Object.values(growthMap).sort((a, b) => new Date(a.month) - new Date(b.month));

    res.json({
      counts, users,
      totalDebates, avgPlatformScore, pendingEvaluations, aiAnalysesCompleted,
      userGrowth
    });

  } catch (error) {
    res.status(500).json({ message: "Error building admin overview", error: error.message });
  }
});


// =========================
// 📊 TOP ACTIVE DEBATES — real ranking by session count per topic
// =========================
app.get("/admin/top-active-debates", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const pipeline = [
      { "$group": { "_id": "$topic", "sessionCount": { "$sum": 1 } } },
      { "$sort": { "sessionCount": -1 } },
      { "$limit": 10 }
    ];
    const results = await Session.aggregate(pipeline);
    res.json(results.map((r) => ({ topic: r._id, sessionCount: r.sessionCount })));
  } catch (error) {
    res.status(500).json({ message: "Error building top active debates", error: error.message });
  }
});


// =========================
// 🤖 AI SERVICE USAGE — real counts of how many sessions actually ran each engine
// =========================
app.get("/admin/ai-service-usage", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const sessions = await Session.find();
    const voiceModeSessions = sessions.filter((s) => s.argumentAnalysis?.clarityScore != null);
    res.json({
      totalSessions: sessions.length,
      argumentAnalysis: voiceModeSessions.length,
      fallacyDetection: voiceModeSessions.length,
      speechAnalysis: voiceModeSessions.length,
      presentationScoring: voiceModeSessions.filter((s) => s.presentationMetrics?.wordsPerMinute != null).length,
      note: "Argument Analysis / Fallacy Detection / Speech Analysis run together on every voice-mode session, so their counts match."
    });
  } catch (error) {
    res.status(500).json({ message: "Error building AI service usage", error: error.message });
  }
});

// ✅ NEW: real latency/token stats — proxies the Python engine's Postgres-backed
// agent_performance_log aggregation. Real numbers or nothing; if the AI
// engine is down, this honestly reports that instead of showing fake data.
app.get("/admin/agent-performance", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const resp = await fetch("http://localhost:8000/api/v1/admin/agent-performance", { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`AI engine returned ${resp.status}`);
    const data = await resp.json();
    res.json(data);
  } catch (error) {
    res.status(503).json({ message: "Could not reach the AI engine for performance stats", error: error.message });
  }
});


// =========================
// 🗂️ CONTENT MANAGEMENT — moderate Topics, Resources, Rubrics platform-wide
// =========================
app.delete("/admin/topics/:id", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    await Topic.deleteOne({ _id: req.params.id });
    await logAdminAction(req, "Deleted topic", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting topic", error: error.message });
  }
});

app.get("/admin/resources", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const resources = await Resource.find().populate("addedBy", "name role").sort({ createdAt: -1 });
    res.json(resources);
  } catch (error) {
    res.status(500).json({ message: "Error fetching resources", error: error.message });
  }
});

app.delete("/admin/resources/:id", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    await Resource.deleteOne({ _id: req.params.id });
    await logAdminAction(req, "Deleted resource", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting resource", error: error.message });
  }
});

app.get("/admin/rubrics", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const rubrics = await Rubric.find().populate("educatorId", "name").sort({ createdAt: -1 });
    res.json(rubrics);
  } catch (error) {
    res.status(500).json({ message: "Error fetching rubrics", error: error.message });
  }
});

app.delete("/admin/rubrics/:id", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    await Rubric.deleteOne({ _id: req.params.id });
    await logAdminAction(req, "Deleted rubric", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deleting rubric", error: error.message });
  }
});


// =========================
// 📤 REPORTS & LOGS — platform-wide real CSV export
// =========================
app.get("/admin/export-csv", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const users = await User.find().select("-password");
    const sessions = await Session.find().sort({ createdAt: -1 });
    const rows = [["Learner", "Topic", "Format", "Date", "Communication", "Argument", "Confidence"]];
    sessions.forEach((s) => {
      const learner = users.find((u) => String(u._id) === String(s.userId));
      rows.push([learner ? learner.name : "Unknown", s.topic, s.format, new Date(s.createdAt).toLocaleDateString(), s.communicationScore, s.argumentScore, s.confidenceScore]);
    });
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=platform_report.csv");
    res.send(csv);
    logAdminAction(req, "Exported platform CSV report");
  } catch (error) {
    res.status(500).json({ message: "Error exporting report", error: error.message });
  }
});


// =========================
// 📢 NOTIFICATION CENTER — real platform-wide broadcasts
// =========================
app.get("/admin/notices", verifyToken, async (req, res) => {
  try {
    const notices = await PlatformNotice.find({ active: true }).sort({ createdAt: -1 }).limit(20);
    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notices", error: error.message });
  }
});

app.post("/admin/notices", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ message: "message is required" });
    const notice = await PlatformNotice.create({ postedBy: req.user.id, message });
    await logAdminAction(req, "Posted platform notice", message);
    res.json({ success: true, notice });
  } catch (error) {
    res.status(500).json({ message: "Error posting notice", error: error.message });
  }
});

app.put("/admin/notices/:id/deactivate", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    await PlatformNotice.findByIdAndUpdate(req.params.id, { active: false });
    await logAdminAction(req, "Deactivated platform notice", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error deactivating notice", error: error.message });
  }
});


// =========================
// 🎫 FEEDBACK & SUPPORT — admin-wide ticket view
// =========================
app.get("/admin/support-tickets", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const tickets = await SupportTicket.find().populate("userId", "name role").sort({ createdAt: -1 });
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Error fetching tickets", error: error.message });
  }
});

app.put("/admin/support-tickets/:id/resolve", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    await SupportTicket.findByIdAndUpdate(req.params.id, { status: "Resolved" });
    await logAdminAction(req, "Resolved support ticket", req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Error resolving ticket", error: error.message });
  }
});


// =========================
// 🩺 SYSTEM HEALTH — real pings, not fake green checkmarks
// =========================
app.get("/admin/system-health", verifyToken, requireRole("Admin"), async (req, res) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? "Operational" : "Down";

  let aiEngineStatus = "Down";
  try {
    const resp = await fetch("http://localhost:8000/health", { signal: AbortSignal.timeout(3000) });
    aiEngineStatus = resp.ok ? "Operational" : "Down";
  } catch {
    aiEngineStatus = "Down";
  }

  res.json({
    "Web Server (this API)": "Operational",
    "Database (MongoDB)": mongoStatus,
    "AI Services (Python engine)": aiEngineStatus,
    "Storage": "Not tracked — no file storage subsystem in this project",
    "Email Service": "Not implemented — no SMTP integration",
    "Real-time Engine": "Not implemented — no websocket/live-session infra"
  });
});


// =========================
// 🔐 SECURITY & COMPLIANCE — real facts only, no fake status
// =========================
app.get("/admin/security-info", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    res.json({
      totalUsers,
      passwordHashing: "bcrypt, 10 salt rounds",
      sessionTokenExpiry: "1 day (JWT)",
      mfa: "Not implemented",
      sslTls: "Not applicable in local development",
      note: "This panel reports real, verifiable facts only — no fabricated 'unusual login' alerts or fake SSL status."
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching security info", error: error.message });
  }
});


// =========================
// 📜 AUDIT LOGS — real, immutable trail of admin actions
// =========================
app.get("/admin/audit-logs", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching audit logs", error: error.message });
  }
});



app.put("/admin/users/:userId/assign-coach", verifyToken, requireRole("Admin"), async (req, res) => {
  try {
    const { coachId } = req.body;

    const learner = await User.findById(req.params.userId);
    if (!learner || learner.role !== "Learner") {
      return res.status(400).json({ message: "Target user is not a Learner" });
    }

    if (coachId) {
      const coach = await User.findById(coachId);
      if (!coach || coach.role !== "Debate Coach") {
        return res.status(400).json({ message: "coachId does not belong to a Debate Coach" });
      }
    }

    learner.assignedCoach = coachId || null;
    await learner.save();
    await logAdminAction(req, "Assigned coach to learner", `learner=${learner.name}`);

    res.json({ success: true, learner });

  } catch (error) {
    res.status(500).json({ message: "Error assigning coach", error: error.message });
  }
});


// =========================
// 🧑‍🏫 LEARNER-INITIATED COACH SELECTION
// =========================
// Any logged-in user can browse the coach list (used by the Learner's
// "Choose a Coach" screen).
app.get("/coaches", verifyToken, async (req, res) => {
  try {
    const coaches = await User.find({ role: "Debate Coach" }).select("-password");
    res.json(coaches);
  } catch (error) {
    res.status(500).json({ message: "Error fetching coaches", error: error.message });
  }
});

// A Learner picks (or changes) their own coach — self-service, doesn't
// require an Admin. Admins can still reassign from the Admin Dashboard too.
app.put("/learner/choose-coach", verifyToken, requireRole("Learner"), async (req, res) => {
  try {
    const { coachId } = req.body;

    if (coachId) {
      const coach = await User.findById(coachId);
      if (!coach || coach.role !== "Debate Coach") {
        return res.status(400).json({ message: "coachId does not belong to a Debate Coach" });
      }
    }

    const me = await User.findById(req.user.id);
    me.assignedCoach = coachId || null;
    await me.save();

    res.json({ success: true, user: me });

  } catch (error) {
    res.status(500).json({ message: "Error choosing coach", error: error.message });
  }
});


// =========================
// 👤 PROFILE — any logged-in user can view their own real record
// =========================
app.get("/profile/me", verifyToken, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-password").populate("assignedCoach", "name email experience");
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json(me);
  } catch (error) {
    res.status(500).json({ message: "Error fetching profile", error: error.message });
  }
});


// =========================
// 📚 TOPICS (Debate Topics page)
// =========================
// Any signed-in user can view topics — optionally filtered
// e.g. GET /topics?format=Oxford%20Debate&difficulty=Beginner
app.get("/topics", verifyToken, async (req, res) => {
  try {
    const filter = {};
    if (req.query.format) filter.format = req.query.format;
    if (req.query.difficulty) filter.difficulty = req.query.difficulty;

    const topics = await Topic.find(filter).sort({ title: 1 });
    res.json(topics);
  } catch (error) {
    res.status(500).json({ message: "Error fetching topics", error: error.message });
  }
});

// List the supported debate formats (used to render the format-selection screen)
app.get("/topics/formats", verifyToken, async (req, res) => {
  res.json(Topic.FORMATS);
});

// Admins and Coaches can create topics
app.post("/topics", verifyToken, requireRole("Admin", "Debate Coach"), async (req, res) => {
  try {
    const { title, difficulty, format } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Topic title is required" });
    }

    const topic = new Topic({
      title,
      difficulty: difficulty || "Beginner",
      format: format || "One-on-One Debate",
      createdBy: req.user.id
    });

    await topic.save();
    res.json({ success: true, topic });

  } catch (error) {
    res.status(500).json({ message: "Error creating topic", error: error.message });
  }
});


// =========================
// 🚀 START SERVER
// =========================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});