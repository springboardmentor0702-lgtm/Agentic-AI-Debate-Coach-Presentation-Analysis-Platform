# MindArena AI - Comprehensive Test Plan

## 1. Scope
The test suite ensures end-to-end reliability of the MindArena AI platform across all 4 Agentic AI workflows, REST endpoints, JWT authorization, RBAC role gating, and database relationships.

---

## 2. Test Targets & Checklist (50+ Verifications)

### A. Authentication & User Management
1. `POST /api/auth/register` with valid learner payload -> `201 Created` with JWT token & profile
2. `POST /api/auth/register` with duplicate email -> `409 Conflict`
3. `POST /api/auth/login` with valid credentials -> `200 OK` with session JWT
4. `POST /api/auth/login` with invalid password -> `401 Unauthorized`
5. `GET /api/auth/me` with valid JWT -> `200 OK` returning profile & role
6. `GET /api/auth/me` with missing/expired JWT -> `401 Unauthorized`
7. `GET /api/profiles` with Admin token -> `200 OK` (list users)
8. `GET /api/profiles` with Learner token -> `403 Forbidden` (RBAC test)
9. `PATCH /api/profiles/:id` update experience_level & comparison preference -> `200 OK`

### B. Fixed AI Pipeline (Argument Analysis)
10. `POST /api/arguments/analyze` with valid debate proposition -> `200 OK`
11. Verification: Claim extraction structure contains claims, premise, conclusion
12. Verification: Evidence quality score (0-100) and rationale returned
13. Verification: Logical strength score (0-100) returned
14. Verification: Fallacies detected array (name, explanation, severity)
15. Verification: Counterarguments array with refutation strategies
16. Verification: Overall weighted score returned
17. `POST /api/fallacies/detect` standalone test -> `200 OK` with credibility score
18. `POST /api/counterarguments/generate` standalone test -> `200 OK`
19. `POST /api/case-reviews/synthesize` holistic review -> `200 OK`
20. `GET /api/arguments/history` returns saved analyses for current user

### C. Multi-Agent Debate Simulation (Opponent + Judge)
21. `POST /api/debates/create` mode="ai" -> `201 Created` with initial topic & stance
22. `POST /api/debates/:id/round` Round 1 user argument -> Opponent node generates rebuttal
23. Verification: Judge node evaluates Round 1 on 6 metrics (relevance, evidence, logic, rebuttal, clarity, persuasiveness)
24. `POST /api/debates/:id/round` Round 2 execution with context memory
25. `POST /api/debates/:id/round` Round 3 completion -> Final Verdict produced
26. `POST /api/debates/create` mode="human" -> creates pending invite for Opponent
27. `POST /api/debates/:id/respond-invite` accept invitation -> status becomes 'active'
28. Participant authorization test: Non-participant cannot submit rounds (`403 Forbidden`)

### D. Self-Directed ReAct Research Agent
29. `POST /api/research/brief` with complex debate topic
30. Verification: Wikipedia tool called autonomously
31. Verification: Agent performs iterative search decisions
32. Verification: Search iterations logged in state metadata
33. Verification: Stopping condition terminates safely (max iterations respected)
34. Verification: Sources include actual Wikipedia titles & URLs without hallucination
35. `GET /api/research/history` lists user's research dossiers

### E. Tool-Calling Coaching Agent (Ask Your Coach)
36. `POST /api/coaching-agent/ask` query: "How is my presentation pacing?"
37. Verification: Agent selects only `get_presentation_analysis()` tool
38. `POST /api/coaching-agent/ask` query: "Where do I lose debate points?"
39. Verification: Agent selects `get_recent_debate_results()` and `get_performance_history()`
40. Verification: Session stored in `coaching_agent_sessions` with tool list and proposed goal

### F. RAG Coaching & Semantic Search
41. `POST /api/coaching/plan` generates personalized curriculum grounded in knowledge base
42. `GET /api/coaching/knowledge` returns curated debate & rhetoric categories

### G. Presentation Analysis & Speech
43. `POST /api/presentations/analyze` with transcript & duration
44. Verification: Words-per-minute (WPM) calculated accurately
45. Verification: Filler words identified (um, uh, like, you know) with frequency counts
46. Verification: Clarity, confidence, and structure scores returned
47. `GET /api/presentations/history` returns past recorded speeches

### H. Performance, Goals, Classes, and Export
48. `GET /api/performance/summary` returns KPI scores and practice streak
49. `GET /api/performance/peer-comparison` returns aggregated anonymized percentiles
50. `POST /api/goals` creates new measurable target
51. `PATCH /api/goals/:id` marks goal completed
52. `POST /api/classes` (Educator) creates class
53. `POST /api/classes/:id/members` adds learner
54. `GET /api/notifications` returns unread alerts
55. `GET /api/export?format=json` exports authorized user records
56. `GET /api/export?format=csv` exports user debate summaries
57. Health check: `GET /health` -> `200 OK` `{"status":"ok"}`
