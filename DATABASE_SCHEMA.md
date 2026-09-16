# Database Schema Documentation

This document provides a comprehensive specification of the databases used in the **AI Debate Coach & Presentation Analysis Platform**: **PostgreSQL** (relational database for debate performance metrics and per-agent telemetry) and **MongoDB** (document database for users, debate sessions, coaching, LMS educator tools, support tickets, knowledge base, and conversational logs).

---

## 1. Architecture Overview & Cross-Database Mapping

```text
┌────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                   │
└───────────────────────────┬────────────────────────────┘
                            │ (REST / SSE)
┌───────────────────────────▼────────────────────────────┐
│               Backend (Node.js / Express)              │
│       - Authentication (JWT & bcrypt)                  │
│       - File Uploads (Multer)                          │
│       - Role-based Access Control (Learner, Coach,     │
│         Educator, Admin)                               │
└─────────────┬──────────────────────────┬───────────────┘
              │                          │
              ▼                          ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│      MongoDB Database     │ │   AI Engine (FastAPI)    │
│ (debate_platform_database)│ │ - MultiAgentDebateEngine │
│ - User records & profiles │ │ - Fallacy & Argument     │
│ - Session histories       │ │ - Delivery Coach         │
│ - Coaching plans & notes  │ │ - Presentation Analysis  │
│ - Classes & Assignments   │ └──────────┬───────────────┘
│ - Knowledge base documents│            │
│ - Assistant chat logs     │            ▼
└───────────────────────────┘ ┌──────────────────────────┐
                              │    PostgreSQL Database   │
                              │       (debate_db)        │
                              │ - debate_performance     │
                              │ - agent_performance_log  │
                              └──────────────────────────┘
```

### Cross-Database Relationships
* **`session_id` Mapping:**
  * In **MongoDB (`sessions` collection)**: `_id` (ObjectId) or custom session ID represents the debate or presentation session.
  * In **PostgreSQL (`debate_performance` table)**: `session_id` (`TEXT`) references the session `_id` string from MongoDB.
  * In **PostgreSQL (`agent_performance_log` table)**: `session_id` (`TEXT`) links LLM agent execution telemetry directly to that session.
  * In **MongoDB (`session_transcripts` collection)**: `session_id` (`String`) stores raw transcripts and multi-agent evaluation payloads.
* **`user_id` Mapping:**
  * In **MongoDB (`users` collection)**: `_id` (`ObjectId`) is the primary user identifier.
  * In **MongoDB collections (`sessions`, `goals`, `notes`, `coachingplans`, `classes`, `assignments`, `auditlogs`, `toolusagelogs`, `supporttickets`, `assistant_messages`)**: `userId` / `user_id` refers directly to `User._id`.

---

## 2. PostgreSQL Schema (`debate_db`)

PostgreSQL stores structured relational performance metrics and real-time LLM telemetry.

### Table: `debate_performance`
Tracks numerical debate performance metrics generated across debate turns and presentation evaluations.

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing primary key |
| `session_id` | `TEXT` | `NOT NULL` | Session reference identifier (links to Mongo Session) |
| `debate_format` | `TEXT` | `NOT NULL` | Debate format name (e.g. "Oxford Debate", "Policy Debate") |
| `words_per_minute` | `INTEGER` | `NULLABLE` | Speaking pace in WPM (NULL for typed mode) |
| `pace_status` | `TEXT` | `NOT NULL` | "Optimal", "Too Fast", "Too Slow", or "N/A" |
| `filler_word_count` | `INTEGER` | `NOT NULL` | Count of filler words detected (um, uh, like, etc.) |
| `fallacy_detected` | `BOOLEAN` | `NOT NULL` | Whether any logical fallacy was flagged |
| `fallacy_type` | `TEXT` | `NULLABLE` | Type of fallacy identified (e.g. "Ad Hominem", "Strawman") |
| `confidence_score` | `INTEGER` | `NULLABLE` | Delivery Coach confidence metric (0–100) |
| `clarity_score` | `INTEGER` | `NULLABLE` | Speech delivery clarity metric (0–100) |
| `grammar_issue_count` | `INTEGER` | `NULLABLE` | Count of grammar issues identified |
| `arg_clarity_score` | `INTEGER` | `NULLABLE` | Argument Analyst reasoning clarity (0–100) |
| `relevance_score` | `INTEGER` | `NULLABLE` | Topic relevance score (0–100) |
| `evidence_strength_score`| `INTEGER`| `NULLABLE` | Strength and quality of cited evidence (0–100) |
| `logical_consistency_score`| `INTEGER`| `NULLABLE` | Formal logical coherence (0–100) |
| `persuasiveness_score` | `INTEGER` | `NULLABLE` | Rhetorical persuasiveness (0–100) |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Record creation timestamp |

### Table: `agent_performance_log`
Real-time per-call telemetry logging for AI agents (Agent 1 Opponent, Agent 2 Fallacy, Agent 3 Delivery, Agent 4 Argument).

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing primary key |
| `session_id` | `TEXT` | `NULLABLE` | Session reference if called within a debate |
| `agent_name` | `TEXT` | `NOT NULL` | Name of the agent (e.g., "Opponent", "FallacyDetector") |
| `model` | `TEXT` | `NOT NULL` | LLM model alias/name (e.g., "gemini-flash-latest") |
| `latency_ms` | `INTEGER` | `NOT NULL` | Execution duration in milliseconds |
| `input_tokens` | `INTEGER` | `NULLABLE` | Prompt tokens used |
| `output_tokens` | `INTEGER` | `NULLABLE` | Completion tokens generated |
| `total_tokens` | `INTEGER` | `NULLABLE` | Total token count |
| `created_at` | `TIMESTAMP` | `DEFAULT NOW()` | Timestamp of invocation |

---

## 3. MongoDB Schema (`debate_platform_database`)

MongoDB stores documents and nested structures across user accounts, debates, educational assignments, resources, and live assistance.

### Collection: `users`
* **Purpose:** User authentication, profiles, role-based access control, onboarding settings.
* **Fields:**
  * `_id` (`ObjectId`): Unique identifier.
  * `name` (`String`): Full display name.
  * `email` (`String`, Unique): User email address.
  * `password` (`String`): Bcrypt-hashed password.
  * `role` (`String`): Role enum: `"Learner"`, `"Debate Coach"`, `"Educator"`, `"Admin"`.
  * `experience` (`String`): Experience level: `"Beginner"`, `"Intermediate"`, `"Expert"`. Default: `"Beginner"`.
  * `assignedCoach` (`ObjectId`, Ref: `User`, Default: `null`): Assigned coach for the learner.
  * `preferredFormats` (`[String]`): List of preferred debate formats chosen during onboarding.
  * `onboardingCompleted` (`Boolean`): Status flag for onboarding survey.
  * `createdAt` (`Date`), `updatedAt` (`Date`): Standard timestamps.

### Collection: `sessions`
* **Purpose:** Core debate records containing argument submissions, audio URL references, AI evaluations, scores, and coach/educator reviews.
* **Fields:**
  * `_id` (`ObjectId`): Session ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Owner learner.
  * `topic` (`String`, Required): Debate topic title.
  * `format` (`String`): Debate format (e.g. `"One-on-One Debate"`, `"Oxford Debate"`).
  * `stance` (`String`): Position taken (`"Affirmative"`, `"Negative"`, `"Not selected"`).
  * `argument` (`String`, Required): User transcript or submitted argument.
  * `feedback` (`String`): AI-generated rebuttal or overall feedback.
  * `communicationScore` (`Number`, Default: 0): Communication quality score (0–100).
  * `argumentScore` (`Number`, Default: 0): Argument quality score (0–100).
  * `confidenceScore` (`Number`, Default: 0): Confidence score (0–100).
  * `engagementScore` (`Number`, Nullable): Engagement score (0–100).
  * `audioUrl` (`String`, Nullable): Path to recorded audio file if voice-mode.
  * `fallacyDetected` (`Boolean`, Nullable): Flag indicating logical fallacy detection.
  * `presentationMetrics` (`Object`, Embedded):
    * `wordsPerMinute` (`Number`): Calculated speaking speed.
    * `paceStatus` (`String`): Pace category.
    * `fillerWordCount` (`Number`): Total filler words.
  * `argumentAnalysis` (`Object`, Embedded):
    * `clarityScore` (`Number`)
    * `relevanceScore` (`Number`)
    * `evidenceStrengthScore` (`Number`)
    * `logicalConsistencyScore` (`Number`)
    * `persuasivenessScore` (`Number`)
    * `strengths` (`[String]`): List of argumentative strengths.
    * `weaknesses` (`[{ issue: String, strongerVersion: String }]`): Actionable improvements.
  * `fallacyDetails` (`Object`, Embedded):
    * `fallacyType` (`String`)
    * `offendingText` (`String`)
    * `explanation` (`String`)
    * `correctionSuggestion` (`String`)
  * `grammarIssues` (`[{ originalText: String, correctedText: String, explanation: String }]`): Grammatical corrections.
  * `deliveryOverallFeedback` (`String`): Coach-style feedback on vocal delivery.
  * `reviewedByCoach` (`Boolean`): Flag if reviewed by coach.
  * `coachFeedback` (`String`): Feedback submitted by coach.
  * `reviewedByEducator` (`Boolean`): Flag if evaluated by educator.
  * `educatorFeedback` (`String`): Evaluation comments by educator.
  * `createdAt` (`Date`), `updatedAt` (`Date`): Standard timestamps.

### Collection: `presentationsessions`
* **Purpose:** Multi-modal presentation analysis records (deck slides + vocal speech).
* **Fields:**
  * `_id` (`ObjectId`): Presentation session ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Owner.
  * `filename` (`String`, Required): Uploaded presentation document name.
  * `slideCount` (`Number`, Default: 0): Total slides/pages extracted.
  * `transcript` (`String`): Transcribed speech.
  * `presentationMetrics` (`Object`): `{ wordsPerMinute, paceStatus, fillerWordCount }`.
  * `deliveryMetrics` (`Object`): `{ confidenceScore, clarityScore, engagementScore, overallFeedback, grammarIssues }`.
  * `contentReview` (`Object`): `{ structureScore, clarityScore, claimSupportScore, flowScore, slideFeedback: [{ slideNumber, feedback }], overallContentFeedback }`.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `topics`
* **Purpose:** Library of pre-built and custom debate motions with difficulty ratings and format classifications.
* **Fields:**
  * `_id` (`ObjectId`): Topic ID.
  * `title` (`String`, Required): Motion text.
  * `format` (`String`, Required): Recommended format.
  * `difficulty` (`String`): `"Beginner"`, `"Intermediate"`, `"Hard"`.
  * `createdBy` (`ObjectId`, Ref: `User`): Author/Creator.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `goals`
* **Purpose:** Custom learner skill goals and targets.
* **Fields:**
  * `_id` (`ObjectId`): Goal ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Target learner.
  * `label` (`String`, Required): Goal title (e.g. "Achieve 85+ Argument Score").
  * `dimension` (`String`, Enum): `"communicationScore"`, `"argumentScore"`, `"confidenceScore"`, `"fillerWordCount"`.
  * `targetValue` (`Number`, Required): Target metric threshold.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `scheduledsessions`
* **Purpose:** Scheduled upcoming debate events.
* **Fields:**
  * `_id` (`ObjectId`): Scheduled session ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Learner.
  * `topic` (`String`, Required): Topic title.
  * `format` (`String`): Debate format.
  * `scheduledFor` (`Date`, Required): Scheduled date and time.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `drafts`
* **Purpose:** Autosaved debate preparation drafts.
* **Fields:**
  * `_id` (`ObjectId`): Draft ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Owner.
  * `topic` (`String`), `format` (`String`), `stance` (`String`), `argument` (`String`).
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `notes`
* **Purpose:** General and learner-specific notes authored by Coaches and Educators.
* **Fields:**
  * `_id` (`ObjectId`): Note ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Author.
  * `aboutLearnerId` (`ObjectId`, Ref: `User`, Default: `null`): Target learner if authored by coach/educator.
  * `title` (`String`, Required): Note title.
  * `category` (`String`, Default: `"General"`): Note category.
  * `content` (`String`): Body text.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `coachingplans`
* **Purpose:** Action plans created by coaches for specific learners with trackable milestones.
* **Fields:**
  * `_id` (`ObjectId`): Coaching plan ID.
  * `coachId` (`ObjectId`, Ref: `User`, Required): Coach.
  * `learnerId` (`ObjectId`, Ref: `User`, Required): Learner.
  * `title` (`String`, Required): Plan name.
  * `milestones` (`[{ label: String, completed: Boolean }]`): Ordered milestone checklist.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `classes`
* **Purpose:** Educator classroom cohorts, enrolled learners, and assigned topics.
* **Fields:**
  * `_id` (`ObjectId`): Class ID.
  * `educatorId` (`ObjectId`, Ref: `User`, Required): Educator instructor.
  * `name` (`String`, Required): Class/Section name.
  * `learnerIds` (`[ObjectId]`, Ref: `User`): Enrolled students.
  * `assignedTopics` (`[{ topicId: ObjectId (Ref: Topic), assignedAt: Date }]`): Assigned curriculum topics.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `assignments`
* **Purpose:** Homework and structured debate tasks assigned to classes with grading and submissions.
* **Fields:**
  * `_id` (`ObjectId`): Assignment ID.
  * `educatorId` (`ObjectId`, Ref: `User`, Required): Educator.
  * `classId` (`ObjectId`, Ref: `Class`, Required): Target class.
  * `title` (`String`, Required): Assignment title.
  * `description` (`String`): Task instructions.
  * `dueDate` (`Date`, Required): Submission deadline.
  * `submissions` (`[{ learnerId: ObjectId, content: String, submittedAt: Date, grade: Number, feedback: String }]`): Student submissions.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `rubrics`
* **Purpose:** Grading rubrics and evaluation criteria created by Educators.
* **Fields:**
  * `_id` (`ObjectId`): Rubric ID.
  * `educatorId` (`ObjectId`, Ref: `User`, Required): Creator.
  * `title` (`String`, Required): Rubric title.
  * `criteria` (`[{ name: String, maxScore: Number }]`): Scoring dimensions.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `resources`
* **Purpose:** Shared debate library (articles, guides, videos, PDFs).
* **Fields:**
  * `_id` (`ObjectId`): Resource ID.
  * `addedBy` (`ObjectId`, Ref: `User`, Required): Submitter.
  * `title` (`String`, Required): Resource title.
  * `type` (`String`, Enum: `"Article"`, `"Video"`, `"PDF"`, `"Other"`): Media type.
  * `url` (`String`, Required): Resource link.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `platformnotices`
* **Purpose:** System-wide announcements and alerts published by Admins.
* **Fields:**
  * `_id` (`ObjectId`): Notice ID.
  * `postedBy` (`ObjectId`, Ref: `User`, Required): Admin.
  * `message` (`String`, Required): Announcement body.
  * `active` (`Boolean`, Default: `true`): Visibility state.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `auditlogs`
* **Purpose:** Immutable audit trail of sensitive administrative actions.
* **Fields:**
  * `_id` (`ObjectId`): Audit log ID.
  * `adminId` (`ObjectId`, Ref: `User`, Required): Performing admin.
  * `adminName` (`String`): Admin display name.
  * `action` (`String`, Required): Action name (e.g., `"Deleted topic"`).
  * `details` (`String`): Additional metadata or target IDs.
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `toolusagelogs`
* **Purpose:** Tracking standalone tool utilization (Argument Analyzer, Fallacy Detector, Counterargument Generator).
* **Fields:**
  * `_id` (`ObjectId`): Usage log ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): User invoking the tool.
  * `tool` (`String`, Enum: `"ArgumentAnalyzer"`, `"FallacyDetector"`, `"CounterargumentGenerator"`).
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `supporttickets`
* **Purpose:** User support requests and issue resolution tracking.
* **Fields:**
  * `_id` (`ObjectId`): Ticket ID.
  * `userId` (`ObjectId`, Ref: `User`, Required): Submitting user.
  * `subject` (`String`, Required): Issue summary.
  * `message` (`String`, Required): Detailed description.
  * `status` (`String`, Enum: `"Open"`, `"Resolved"`, Default: `"Open"`).
  * `createdAt` (`Date`), `updatedAt` (`Date`).

### Collection: `session_transcripts` (AI Engine Engine Persistence)
* **Purpose:** Complete multi-turn transcripts and structured multi-agent evaluation payloads.
* **Fields:**
  * `_id` (`ObjectId`): Record ID.
  * `session_id` (`String`): Referenced session ID.
  * `debate_format` (`String`): Debate format.
  * `user_transcript` (`String`): User speech content.
  * `ai_rebuttal` (`String`): AI Opponent rebuttal.
  * `fallacy_metrics` (`Object`): Fallacy report.
  * `presentation_metrics` (`Object`): Presentation audio & speed metrics.
  * `delivery_metrics` (`Object`): Delivery & grammar metrics.
  * `argument_analysis` (`Object`): In-depth argument scoring and feedback.
  * `mode` (`String`): `"voice"` | `"typed"` | `"multiturn"`.

### Collection: `knowledge_documents` (RAG Vector Store / Grounding)
* **Purpose:** Grounding documents indexed with embeddings for anti-hallucination evidence retrieval.
* **Fields:**
  * `_id` (`ObjectId`): Record ID.
  * `doc_id` (`String`, UUID): Document identifier.
  * `title` (`String`): Document title.
  * `content_preview` (`String`): Snippet preview.
  * `created_at` (`ISODate`): Timestamp.

### Collection: `assistant_messages` & `assistant_conversations` (Global Floating AI Chatbot)
* **Purpose:** Contextual multi-turn chat history for the global floating assistant.
* **Fields:**
  * `assistant_messages`: `{ user_id: String, conversation_id: String, page: String, role: "user"|"assistant", content: String, created_at: ISODate }`
  * `assistant_conversations`: `{ user_id: String, conversation_id: String, title: String }`

---

## 4. Summary of Constraints & Indexes

1. **MongoDB Unique Indexes:**
   * `users.email`: `{ unique: true }`
2. **MongoDB Foreign Reference Validation:**
   * Mongoose `ref` population on `assignedCoach`, `userId`, `educatorId`, `classId`, `topicId`, `adminId`.
3. **PostgreSQL Primary Keys & Constraints:**
   * `debate_performance.id`: `SERIAL PRIMARY KEY`
   * `agent_performance_log.id`: `SERIAL PRIMARY KEY`
   * `debate_performance.session_id`: Index recommended for fast aggregation by session.
   * `agent_performance_log.agent_name`: Index recommended for fast performance reporting.
