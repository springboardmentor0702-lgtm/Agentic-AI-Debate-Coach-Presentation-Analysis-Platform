import { GoogleGenAI } from "@google/genai";

let genAIClient = null;

export function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!genAIClient && apiKey) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return genAIClient;
}

// Helper to call Gemini with automatic fallback between fast models
async function generateWithGeminiFallback(client, { prompt, inlineData = null, isJson = false }) {
  const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];
  for (const model of modelsToTry) {
    try {
      const contents = [];
      if (inlineData) {
        contents.push({ inlineData });
      }
      contents.push(typeof prompt === "string" ? { text: prompt } : prompt);

      const config = {};
      if (isJson) {
        config.responseMimeType = "application/json";
      }

      const response = await client.models.generateContent({
        model,
        contents,
        config,
      });

      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      // If 503/429/model error, continue to next model candidate
      console.warn(`Gemini model ${model} call notice:`, err?.message || err);
    }
  }
  return null;
}

export async function generateDebateResponse({
  topic,
  userInput,
  history = [],
  opponentPersona = "The Contrarian",
  format = "Oxford Debate",
  userPosition = "Affirmative",
  opponentPosition = null,
  difficulty = "Intermediate",
}) {
  const effectiveTopic = (topic || "Autonomous AI Systems should be held legally liable for unintended damages.").trim();
  const effectiveUserPos = userPosition === "Negative" ? "Negative" : "Affirmative";
  const effectiveOpponentPos = opponentPosition || (effectiveUserPos === "Affirmative" ? "Negative" : "Affirmative");
  const client = getGemini();

  if (client) {
    try {
      const historyContext = history.length > 0
        ? history.map((h) => `${h.speaker || h.sender || h.role || "User"}: ${h.text || h.content || ""}`).slice(-6).join("\n")
        : "Debate opening round.";

      const prompt = `You are an elite competitive debater and speech coach playing the role of an AI Opponent in a structured debate.

DEBATE SPECIFICATIONS:
- Motion / Topic: "${effectiveTopic}"
- Debate Format: "${format}"
- User's Position: ${effectiveUserPos}
- YOUR Assigned Position (AI Opponent): ${effectiveOpponentPos} (You MUST argue FOR the ${effectiveOpponentPos} perspective and AGAINST the ${effectiveUserPos} perspective!)
- Your Persona: "${opponentPersona}"
- Difficulty Level: "${difficulty}"

FORMAT CONVENTIONS:
- If Parliamentary Debate: Use formal address ("The Honorable Member", "Mr./Madam Speaker"), emphasize government policy, mandates, and societal welfare.
- If Oxford Debate: Focus on the binary motion, structured cross-examination, and direct empirical refutations.
- If Policy Debate: Emphasize solvency, feasibility, advantages vs. disadvantages, and realistic implementation mechanisms.
- If Public Forum / Lincoln-Douglas / 1-on-1: Deliver sharp, engaging, impactful arguments with clear philosophical principles or quantifiable impacts.

PERSONA GUIDELINES:
- "The Contrarian": Skeptical, reframing core assumptions, exposing hidden trade-offs.
- "The Academic": Scholarly, citing structural studies, methodological flaws, and systemic counter-arguments.
- "The Strategist": Tactical, pointing out unintended consequences, operational failures, and incentive misalignments.
- "Socratic Questioner": Probing premises with piercing rhetorical and analytical cross-examination questions.
- "Aggressive Opponent": High rhetorical momentum, directly challenging the integrity of the user's claims.

USER'S LATEST ARGUMENT:
"${userInput}"

RECENT CONTEXT:
${historyContext}

TASKS REQUIRED:
1. FALLACY DETECTION & LOGIC AUDIT:
Analyze the user's latest argument with precision for any logical fallacies:
- Ad Hominem (personal attacks, questioning motives instead of substance)
- Straw Man (exaggerating or distorting the opposing stance)
- False Dilemma (forcing an artificial binary choice when nuances exist)
- Slippery Slope (unsubstantiated chain reaction leading to catastrophe)
- Appeal to Popularity / Bandwagon (claiming truth because "everyone knows" or "most people agree")
- Appeal to Authority (citing prestige rather than valid evidence)
- Circular Reasoning (assuming the conclusion within the premise)
- Hasty Generalization (sweeping conclusions from anecdotal or tiny samples)
- False Cause / Post Hoc (confusing correlation or sequence with causation)
- Red Herring (introducing an irrelevant side-topic to evade the core issue)

If a fallacy is detected:
- fallacyDetected: true
- fallacyType: exact name from the list above
- offendingText: the exact quote from the user's argument
- explanation: crisp 1-2 sentence breakdown of the logical failure
- severity: "High" | "Moderate" | "Low"
- confidence: integer (82 to 99)

If NO fallacy is detected:
- fallacyDetected: false
- fallacyType: "None"
- offendingText: null
- explanation: null
- severity: "None"
- confidence: 95

2. AI OPPONENT REBUTTAL:
Deliver a persuasive 2-4 sentence counterargument arguing the ${effectiveOpponentPos} position on "${effectiveTopic}".
- Directly rebut the user's specific points.
- Stay 100% on the exact topic: "${effectiveTopic}".
- Adopt the tone of '${opponentPersona}' adhering to '${format}'.

3. METRICS & COACHING TIP:
- argScore (0-100): quality and clarity of user's argument
- evidenceScore (0-100): use of facts/data vs unbacked assertions
- consistencyScore (0-100): logical validity (penalize if fallacy detected)
- rebuttalScore (0-100): resistance to opponent's previous points
- coachingTip: 1 targeted tactical tip for how the user can improve their next turn on "${effectiveTopic}".

Respond strictly with valid JSON:
{
  "fallacyDetected": boolean,
  "fallacyType": string,
  "offendingText": string or null,
  "explanation": string or null,
  "severity": "High" | "Moderate" | "Low" | "None",
  "confidence": number,
  "rebuttal": string,
  "argScore": number,
  "evidenceScore": number,
  "consistencyScore": number,
  "rebuttalScore": number,
  "coachingTip": string
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        const parsed = JSON.parse(rawText.replace(/```json|```/g, "").trim());
        const hasFallacy = Boolean(parsed.fallacyDetected && parsed.fallacyType && parsed.fallacyType !== "None");
        const fallacyType = hasFallacy ? parsed.fallacyType : "None";
        const offendingText = hasFallacy ? (parsed.offendingText || userInput) : null;
        const explanation = hasFallacy ? (parsed.explanation || `Argument exhibits ${fallacyType}.`) : null;
        const severity = hasFallacy ? (parsed.severity || "Moderate") : "None";
        const confidence = hasFallacy ? (parsed.confidence || 92) : 95;

        const primaryFallacy = hasFallacy ? {
          fallacy_type: fallacyType,
          offending_text: offendingText,
          explanation: explanation,
          severity: severity,
          confidence: confidence,
        } : null;

        const audit = hasFallacy
          ? `[AUDIT] Fallacy Flagged: ${fallacyType} — "${offendingText}"`
          : `[AUDIT] No fallacy detected: Argument structure is logically coherent.`;

        return {
          opponentResponse: parsed.rebuttal || `Regarding "${effectiveTopic}": your argument for ${effectiveUserPos} fails to overcome the key ${effectiveOpponentPos} counter-evidence.`,
          fallacy_detected: hasFallacy,
          fallacy_type: fallacyType,
          offending_text: offendingText,
          explanation: explanation,
          severity: severity,
          confidence: confidence,
          fallacies: primaryFallacy ? [primaryFallacy] : [],
          fallacyDetected: primaryFallacy,
          audit: audit,
          scores: {
            argQuality: parsed.argScore || (hasFallacy ? 68 : 88),
            evidence: parsed.evidenceScore || 80,
            consistency: parsed.consistencyScore || (hasFallacy ? 62 : 92),
            rebuttal: parsed.rebuttalScore || 85,
            communication: 88,
          },
          coachingTip: parsed.coachingTip || `To strengthen your ${effectiveUserPos} stance on "${effectiveTopic}", introduce concrete empirical benchmarks and avoid rhetorical shortcuts.`,
        };
      }
    } catch (err) {
      console.warn("Gemini simulation parse or request notice, utilizing rule engine:", err?.message || err);
    }
  }

  // Comprehensive rule-based engine fallback strictly adhering to topic, format, and positions
  const inputLower = (userInput || "").toLowerCase();

  let hasFallacy = false;
  let fallacyType = "None";
  let offendingText = "";
  let explanation = "";
  let severity = "Low";
  let confidence = 90;

  // 1. Ad Hominem
  if (
    inputLower.includes("you are stupid") ||
    inputLower.includes("you're stupid") ||
    inputLower.includes("you are naive") ||
    inputLower.includes("you're naive") ||
    inputLower.includes("you are blind") ||
    inputLower.includes("corrupt") ||
    inputLower.includes("ignorant") ||
    inputLower.includes("you clearly know nothing") ||
    inputLower.includes("clueless")
  ) {
    hasFallacy = true;
    fallacyType = "Ad Hominem";
    offendingText = userInput.match(/(you are [^.!?]*|you're [^.!?]*|corrupt[^.!?]*|ignorant[^.!?]*|clueless[^.!?]*)/i)?.[0] || userInput;
    explanation = "Direct personal attack on the opponent rather than addressing the substance of the motion.";
    severity = "High";
    confidence = 96;
  }
  // 2. Appeal to Popularity (Bandwagon)
  else if (
    inputLower.includes("everyone knows") ||
    inputLower.includes("everybody knows") ||
    inputLower.includes("everyone agrees") ||
    inputLower.includes("most people agree") ||
    inputLower.includes("all normal people") ||
    inputLower.includes("no one in their right mind") ||
    inputLower.includes("common sense dictates everyone")
  ) {
    hasFallacy = true;
    fallacyType = "Appeal to Popularity";
    offendingText = userInput.match(/(everyone (?:knows|agrees)[^.!?]*|everybody (?:knows|agrees)[^.!?]*|most people agree[^.!?]*)/i)?.[0] || userInput;
    explanation = "Premises that an assertion is inherently correct solely because it is widely believed.";
    severity = "Moderate";
    confidence = 94;
  }
  // 3. Slippery Slope
  else if (
    inputLower.includes("if we allow") ||
    inputLower.includes("if we let") ||
    inputLower.includes("next thing you know") ||
    inputLower.includes("will inevitably lead to total") ||
    inputLower.includes("will destroy everything") ||
    inputLower.includes("will trigger the complete collapse") ||
    inputLower.includes("inevitably result in catastrophe")
  ) {
    hasFallacy = true;
    fallacyType = "Slippery Slope";
    offendingText = userInput.match(/(if we (?:allow|let)[^.!?]*|next thing[^.!?]*|inevitably lead[^.!?]*)/i)?.[0] || userInput;
    explanation = "Unsubstantiated claim that a single initial step will inevitably cause an extreme catastrophic chain of events.";
    severity = "High";
    confidence = 93;
  }
  // 4. False Dilemma
  else if (
    inputLower.includes("either we") ||
    inputLower.includes("only two choices") ||
    inputLower.includes("only two options") ||
    inputLower.includes("you are either with us or") ||
    inputLower.includes("if you don't support this you want")
  ) {
    hasFallacy = true;
    fallacyType = "False Dilemma";
    offendingText = userInput.match(/(either (?:we|you)[^.!?]*or[^.!?]*|only two (?:choices|options)[^.!?]*)/i)?.[0] || userInput;
    explanation = "Presents only two mutually exclusive alternatives while ignoring viable intermediary options.";
    severity = "Moderate";
    confidence = 92;
  }
  // 5. Straw Man
  else if (
    inputLower.includes("they just want to destroy") ||
    inputLower.includes("advocating for the total collapse") ||
    inputLower.includes("want to eliminate all") ||
    inputLower.includes("you want to ban all") ||
    inputLower.includes("so you think people should just suffer")
  ) {
    hasFallacy = true;
    fallacyType = "Straw Man";
    offendingText = userInput.match(/(they just want to[^.!?]*|advocating for total[^.!?]*|you want to ban all[^.!?]*)/i)?.[0] || userInput;
    explanation = "Exaggerates and misrepresents the opponent's position into an indefensible extreme.";
    severity = "Moderate";
    confidence = 91;
  }
  // 6. Circular Reasoning
  else if (
    inputLower.includes("is right because it is right") ||
    inputLower.includes("true because it is a fact") ||
    inputLower.includes("valid because it is valid") ||
    inputLower.includes("because it is common sense that it is")
  ) {
    hasFallacy = true;
    fallacyType = "Circular Reasoning";
    offendingText = userInput;
    explanation = "Restates the conclusion as a premise rather than offering independent evidence.";
    severity = "Moderate";
    confidence = 93;
  }
  // 7. Hasty Generalization
  else if (
    inputLower.includes("always fails without exception") ||
    inputLower.includes("every single time") ||
    inputLower.includes("not a single person ever") ||
    inputLower.includes("all politicians are")
  ) {
    hasFallacy = true;
    fallacyType = "Hasty Generalization";
    offendingText = userInput.match(/(every single time[^.!?]*|always fails[^.!?]*|all [a-z]+ are[^.!?]*)/i)?.[0] || userInput;
    explanation = "Draws a universal, absolute conclusion based on isolated or unrepresentative evidence.";
    severity = "Moderate";
    confidence = 90;
  }

  const primaryFallacy = hasFallacy ? {
    fallacy_type: fallacyType,
    offending_text: offendingText,
    explanation: explanation,
    severity: severity,
    confidence: confidence,
  } : null;

  const audit = hasFallacy
    ? `[AUDIT] Fallacy Flagged: ${fallacyType} — "${offendingText}"`
    : `[AUDIT] No fallacy detected: Argument structure is logically coherent.`;

  // Tailor opponent counterargument to format, positions, and persona
  const userSnippet = userInput.length > 50 ? `${userInput.slice(0, 50)}...` : userInput;
  let opponentResponse = "";

  if (format === "Parliamentary Debate") {
    opponentResponse = `Mr. Speaker, the ${effectiveUserPos} case rests on an untenable foundation. Regarding "${effectiveTopic}", the claim that "${userSnippet}" ignores the adverse policy consequences and regulatory burdens. From the ${effectiveOpponentPos} bench, we submit that this motion creates more harm than solvency.`;
  } else if (opponentPersona === "The Academic") {
    opponentResponse = `Regarding "${effectiveTopic}": your assertion that "${userSnippet}" overlooks foundational empirical literature. When examining this motion from the ${effectiveOpponentPos} perspective, comparative analyses indicate that unilateral assumptions fail under variable baseline conditions. What verifiable data substantiates your core premise?`;
  } else if (opponentPersona === "The Strategist") {
    opponentResponse = `Your ${effectiveUserPos} stance on "${effectiveTopic}" introduces a strategic contradiction. If we concede that "${userSnippet}", we simultaneously trigger structural trade-offs that directly undermine long-term stability. The ${effectiveOpponentPos} position resolves this conflict by addressing systemic root causes.`;
  } else if (opponentPersona === "Socratic Questioner") {
    opponentResponse = `On the motion "${effectiveTopic}": if your assertion that "${userSnippet}" is taken to its logical conclusion, does that not necessitate outcomes that violate your own stated ethical premise? How does the ${effectiveUserPos} reconcile this internal friction?`;
  } else {
    // The Contrarian / Default
    opponentResponse = `While the ${effectiveUserPos} position on "${effectiveTopic}" may appear intuitive, claiming that "${userSnippet}" conflates good intentions with proven real-world outcomes. The ${effectiveOpponentPos} perspective demonstrates that alternative mechanisms provide superior solvency without these collateral risks.`;
  }

  return {
    opponentResponse,
    fallacy_detected: hasFallacy,
    fallacy_type: fallacyType,
    offending_text: offendingText,
    explanation: explanation,
    severity: severity,
    confidence: confidence,
    fallacies: primaryFallacy ? [primaryFallacy] : [],
    fallacyDetected: primaryFallacy,
    audit,
    scores: {
      argQuality: hasFallacy ? 68 : 87,
      evidence: hasFallacy ? 65 : 82,
      consistency: hasFallacy ? 60 : 91,
      rebuttal: 84,
      communication: 88,
    },
    coachingTip: hasFallacy
      ? `Avoid ${fallacyType}. Anchor your next ${effectiveUserPos} turn on "${effectiveTopic}" with verifiable evidence and causal links.`
      : `To counter ${opponentPersona} on "${effectiveTopic}", present specific real-world case studies to reinforce your claim.`,
  };
}

export async function generateDebateEndingReport({
  topic,
  format = "Parliamentary Debate",
  userPosition = "Affirmative",
  opponentPersona = "The Contrarian",
  transcript = [],
  fallacies = [],
  finalScores = null,
}) {
  const effectiveTopic = (topic || "Autonomous AI Systems should be held liable for damages").trim();
  const client = getGemini();

  const userRounds = transcript.filter((t) => t.speaker === "User" || t.speaker?.includes("You"));

  if (client && userRounds.length > 0) {
    try {
      const summaryContext = transcript
        .map((t) => `[${t.speaker}]: ${t.text}`)
        .slice(-8)
        .join("\n");

      const prompt = `You are a Chief Debate Adjudicator and Master Rhetoric Coach.
Debate Summary to Evaluate:
- Topic / Motion: "${effectiveTopic}"
- Format: ${format}
- Debater Position: ${userPosition}
- AI Opponent Persona: ${opponentPersona}
- Total Rounds: ${userRounds.length}
- Logged Fallacies: ${fallacies.length > 0 ? JSON.stringify(fallacies) : "None recorded"}

TRANSCRIPT OF DEBATE:
${summaryContext}

Generate a rigorous, comprehensive Adjudication and Coaching Assessment. Return strictly valid JSON:
{
  "executive_summary": "2-3 sentences synthesizing the debater's overall performance and clash on this motion.",
  "verdict": "e.g. 'Affirmative Ballot Awarded' | 'Negative Ballot Awarded' | 'Competitive Split Decision - Narrow Win'",
  "strengths": [
    "Specific strength with quotation or reference to their points",
    "Second key rhetorical or strategic strength"
  ],
  "areas_for_improvement": [
    "Specific weakness, fallacy, or vulnerability in their argumentation",
    "Second tactical area to sharpen"
  ],
  "coaching_review": "Comprehensive paragraph of coach's tactical advice, strategic framing, and advanced techniques for upcoming debate rounds.",
  "scores": {
    "argQuality": 88,
    "consistency": 85,
    "evidence": 82,
    "rebuttal": 86,
    "communication": 90,
    "overall": 86
  }
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
      }
    } catch (err) {
      console.warn("Gemini debate ending report generation notice, utilizing rule engine:", err?.message || err);
    }
  }

  // Fallback comprehensive adjudication
  const hasFallacyIssues = fallacies.length > 0;
  const computedOverall = hasFallacyIssues ? 78 : 88;

  return {
    executive_summary: `Throughout this ${format} round on "${effectiveTopic}", the debater sustained an articulate ${userPosition} defense against ${opponentPersona}. ${hasFallacyIssues ? `However, ${fallacies.length} rhetorical vulnerability was identified during cross-examination.` : "The logical consistency of the arguments remained solid across all exchanges."}`,
    verdict: hasFallacyIssues ? "Competitive Split Decision - Commended Effort" : `${userPosition} Ballot Awarded - Master Distinction`,
    strengths: [
      `Maintained consistent thematic focus on "${effectiveTopic}" throughout the clash.`,
      `Demonstrated strong responsiveness to ${opponentPersona}'s counter-arguments without ceding core ground.`,
      `Applied effective rhetorical pacing aligned with ${format} guidelines.`
    ],
    areas_for_improvement: [
      hasFallacyIssues
        ? `Remediate identified ${fallacies[0]?.fallacy_type || "rhetorical shortcuts"} by providing explicit empirical data rather than speculative assumptions.`
        : `Introduce more statistical citations and quantifiable precedent to eliminate subjective ambiguity.`,
      `Anticipate opponent's secondary trade-off points earlier in the constructive speech.`
    ],
    coaching_review: `Master Coach Review: In debate formats like ${format}, controlling the metric of evaluation is critical. When defending ${userPosition} on "${effectiveTopic}", always define the decision criterion in your opening turn. By framing whether the debate hinges on pragmatic solvency or rights-based ethics, you force ${opponentPersona} to debate on your chosen terrain rather than allowing them to shift the burden of proof. Continue refining your evidentiary citations.`,
    scores: finalScores || {
      argQuality: hasFallacyIssues ? 76 : 89,
      consistency: hasFallacyIssues ? 72 : 91,
      evidence: hasFallacyIssues ? 74 : 84,
      rebuttal: 85,
      communication: 88,
      overall: computedOverall
    }
  };
}

export async function transcribeAudioWithGemini({ audioBuffer, mimeType = "audio/webm" }) {
  const client = getGemini();
  if (!client || !audioBuffer) return null;
  try {
    const base64Data = Buffer.from(audioBuffer).toString("base64");
    const textPrompt = "You are a high-accuracy speech-to-text engine. Transcribe the spoken words in this audio exactly as uttered word-for-word. Capture all natural speech characteristics, including filler words like 'um', 'uh', 'uhh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of', 'kind of'. Return ONLY the exact transcript as plain text with no quotes, commentary, or markdown framing.";
    const resultText = await generateWithGeminiFallback(client, {
      prompt: textPrompt,
      inlineData: {
        mimeType: mimeType || "audio/webm",
        data: base64Data,
      },
      isJson: false,
    });
    return resultText ? resultText.trim() : null;
  } catch (err) {
    console.warn("Gemini audio transcription notice:", err?.message || err);
    return null;
  }
}

export async function analyzePresentationWithGemini({ transcript, durationSeconds }) {
  const client = getGemini();
  if (!client || !transcript) return null;
  try {
    const prompt = `You are an elite speech & presentation prosody coach analyzing spoken delivery.
Spoken Transcript: "${transcript}"
Recorded Audio Duration: ${durationSeconds} seconds

Perform a thorough delivery assessment and calculate:
1. "words_per_minute": calculate (wordCount / (durationSeconds / 60)).
2. "pace_status": "Optimal" (120-160 WPM), "Too Slow" (< 110 WPM), or "Too Fast" (> 165 WPM).
3. "filler_words_count": integer count of all vocal pauses (um, uh, like, you know, actually, basically, etc).
4. "filler_words_list": comma separated list with counts (e.g. "um:2, like:1").
5. "confidence_score": 0-100 score based on vocal certainty vs hedging.
6. "clarity_score": 0-100 score based on articulation and sentence flow.
7. "engagement_score": 0-100 score based on dynamic cadence and persuasion.
8. "strengths": 1-2 bullet points highlighting real speaking strengths.
9. "areas_for_improvement": 1-2 bullet points highlighting actionable coaching advice.

Return strictly valid JSON:
{
  "speech_pace_wpm": 142,
  "words_per_minute": 142,
  "pace_status": "Optimal",
  "filler_words_count": 3,
  "filler_words_list": "um:2, like:1",
  "confidence_score": 88,
  "clarity_score": 90,
  "engagement_score": 87,
  "strengths": ["..."],
  "areas_for_improvement": ["..."]
}`;

    const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
    if (rawText) {
      return JSON.parse(rawText.replace(/```json|```/g, "").trim());
    }
  } catch (err) {
    console.warn("Gemini presentation analysis notice:", err?.message || err);
  }
  return null;
}

// Module 4: Argument Analysis Engine
export async function analyzeArgumentWithGemini({ text, topic = "General Debate Motion", position = "Affirmative" }) {
  const client = getGemini();
  const safeText = (text || "").trim();
  const safeTopic = (topic || "Autonomous AI Systems Liability").trim();

  if (client && safeText) {
    try {
      const prompt = `You are a Senior Rhetorical Analyst and Argument Mining Model.
Evaluate the following argument on the topic "${safeTopic}" advocating the ${position} position:
Argument: "${safeText}"

Perform comprehensive evaluation across the 5 standard criteria:
1. Clarity (articulation, structure, conciseness)
2. Relevance (direct connection to the topic "${safeTopic}")
3. Evidence Strength (citations, verifiable empirical backing vs assertion)
4. Logical Consistency (deductive/inductive validity, lack of contradictions)
5. Persuasiveness (rhetorical impact, solvency, credibility)

Extract:
- Key claims identified
- Evidence evaluated
- Reasoning quality assessment
- Overall argument strength score (0-100)

Return strictly valid JSON:
{
  "claims": ["Claim 1", "Claim 2"],
  "evidence_evaluation": "Detailed evaluation of empirical backing and citations.",
  "reasoning_quality": "Detailed assessment of inferential steps and premises.",
  "scores": {
    "clarity": 88,
    "relevance": 92,
    "evidence_strength": 80,
    "logical_consistency": 85,
    "persuasiveness": 86,
    "overall_strength": 86
  },
  "tactical_feedback": "Actionable coaching suggestions to elevate this argument."
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
      }
    } catch (err) {
      console.warn("Gemini argument analysis notice, using heuristic fallback:", err?.message || err);
    }
  }

  // Heuristic rule-based argument analysis fallback
  const sentences = safeText.split(/[.!?]+/).filter(Boolean);
  const wordCount = safeText.split(/\s+/).filter(Boolean).length;
  const hasCitation = /according to|study|data|evidence|percent|research|report|statistics|citations/i.test(safeText);
  const hasReasoning = /because|therefore|hence|consequently|as a result|due to|demonstrates/i.test(safeText);

  const clarity = Math.min(96, Math.max(60, 75 + (sentences.length >= 2 ? 10 : 0)));
  const relevance = 88;
  const evidenceStrength = hasCitation ? 86 : 68;
  const logicalConsistency = hasReasoning ? 87 : 74;
  const persuasiveness = Math.round((clarity + relevance + evidenceStrength + logicalConsistency) / 4);
  const overallStrength = Math.round((clarity * 0.2) + (relevance * 0.2) + (evidenceStrength * 0.25) + (logicalConsistency * 0.2) + (persuasiveness * 0.15));

  return {
    claims: sentences.length > 0 ? sentences.slice(0, 3).map((s) => s.trim()) : [safeText],
    evidence_evaluation: hasCitation
      ? "Argument integrates empirical references and substantive evidentiary citations."
      : "Relies primarily on unverified premise assertions; bolster with published studies or verifiable metrics.",
    reasoning_quality: hasReasoning
      ? "Demonstrates clear causal connectors (e.g. 'because', 'therefore') linking claims to conclusions."
      : "Inferential leap requires explicit warrants connecting the premise to the declared impact.",
    scores: {
      clarity,
      relevance,
      evidence_strength: evidenceStrength,
      logical_consistency: logicalConsistency,
      persuasiveness,
      overall_strength: overallStrength
    },
    tactical_feedback: `To maximize persuasion for the ${position} stance on "${safeTopic}", supply statistical corroboration and establish the specific solvency mechanism.`
  };
}

// Module 5: Logical Fallacy Detection Engine (Supports all 8 PDF Fallacies)
export async function detectFallaciesWithGemini({ text, topic = "Debate Motion" }) {
  const client = getGemini();
  const safeText = (text || "").trim();

  if (client && safeText) {
    try {
      const prompt = `You are an elite Logic Engine specializing in fallacy identification, explanation generation, and correction suggestions.
Argument to audit: "${safeText}"
Motion Context: "${topic}"

Check strictly for these 8 formal and informal fallacies:
1. Ad Hominem (attacking person/character rather than argument)
2. Straw Man (distorting/exaggerating opponent's position)
3. False Dilemma (forcing false either/or binary choice)
4. Slippery Slope (unsubstantiated chain reaction to extreme outcome)
5. Appeal to Authority (relying on prestige rather than substantive evidence)
6. Circular Reasoning (assuming conclusion in premise)
7. Hasty Generalization (broad conclusion from insufficient evidence)
8. Red Herring (introducing irrelevant topic to distract)

Return strictly valid JSON:
{
  "fallacies": [
    {
      "fallacy_type": "Ad Hominem | Straw Man | False Dilemma | Slippery Slope | Appeal to Authority | Circular Reasoning | Hasty Generalization | Red Herring",
      "offending_text": "quoted passage",
      "explanation": "Why this reasoning is invalid.",
      "correction": "How to reframe this argument validly.",
      "severity": "High" | "Moderate" | "Low",
      "confidence": 94
    }
  ],
  "credibility_score": 85,
  "reasoning_analysis": "Comprehensive assessment of the logical validity and premise strength."
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
      }
    } catch (err) {
      console.warn("Gemini fallacy engine notice, using heuristic rules:", err?.message || err);
    }
  }

  // Heuristic rule-based detection for all 8 fallacies
  const inputLower = safeText.toLowerCase();
  const fallacies = [];

  // 1. Ad Hominem
  if (/you are stupid|you're stupid|naive|corrupt|ignorant|you know nothing|clueless|bad person|incompetent/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Ad Hominem",
      offending_text: safeText.match(/(?:you are|you're|corrupt|ignorant|clueless)[^.!?]*/i)?.[0] || safeText,
      explanation: "Directly questions the opponent's character or intelligence rather than addressing the argument.",
      correction: "Refocus entirely on the empirical warrants and policy implications of the motion.",
      severity: "High",
      confidence: 96
    });
  }
  // 2. Straw Man
  if (/they just want to destroy|ban all|advocating for the total collapse|eliminate all|hate all/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Straw Man",
      offending_text: safeText.match(/(?:they just want to|ban all|advocating for total)[^.!?]*/i)?.[0] || safeText,
      explanation: "Distorts the opposition's position into an exaggerated, radical extreme.",
      correction: "Contend with the strongest version of the opponent's claim (steel-manning).",
      severity: "Moderate",
      confidence: 93
    });
  }
  // 3. False Dilemma
  if (/either we|only two choices|only two options|you are either with us or/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "False Dilemma",
      offending_text: safeText.match(/(?:either we|only two choices|only two options)[^.!?]*/i)?.[0] || safeText,
      explanation: "Reduces a multifaceted challenge into two mutually exclusive extremes.",
      correction: "Acknowledge hybrid solutions, graduated timelines, and nuanced alternatives.",
      severity: "Moderate",
      confidence: 91
    });
  }
  // 4. Slippery Slope
  if (/if we allow|next thing you know|inevitably lead to total|will trigger the complete collapse/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Slippery Slope",
      offending_text: safeText.match(/(?:if we allow|next thing|inevitably lead)[^.!?]*/i)?.[0] || safeText,
      explanation: "Asserts an unchecked chain reaction without proving each causal link.",
      correction: "Demonstrate verified intermediate thresholds and institutional guardrails.",
      severity: "High",
      confidence: 94
    });
  }
  // 5. Appeal to Authority
  if (/expert says so and that is final|because the president said so|because the celebrity said/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Appeal to Authority",
      offending_text: safeText,
      explanation: "Asserts truth solely based on the identity of the speaker without corroborating evidence.",
      correction: "Cite the underlying empirical methodology rather than relying on authority prestige.",
      severity: "Moderate",
      confidence: 88
    });
  }
  // 6. Circular Reasoning
  if (/is right because it is right|true because it is true|valid because it is valid|because it is obvious that it is/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Circular Reasoning",
      offending_text: safeText,
      explanation: "Restates the claim as its own justification without introducing external premises.",
      correction: "Introduce external evidentiary criteria that prove the validity of the premise.",
      severity: "Moderate",
      confidence: 92
    });
  }
  // 7. Hasty Generalization
  if (/always fails without exception|every single time|not a single person ever|all of them always/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Hasty Generalization",
      offending_text: safeText.match(/(?:every single time|always fails|all of them always)[^.!?]*/i)?.[0] || safeText,
      explanation: "Draws universal conclusions from isolated or anecdotal observations.",
      correction: "Qualify assertions using probabilistic language and representative sample data.",
      severity: "Moderate",
      confidence: 90
    });
  }
  // 8. Red Herring
  if (/what about|why are we talking about this when|that is nothing compared to/i.test(inputLower)) {
    fallacies.push({
      fallacy_type: "Red Herring",
      offending_text: safeText.match(/(?:what about|why are we talking about this when)[^.!?]*/i)?.[0] || safeText,
      explanation: "Introduces an irrelevant or tangentially related side-issue to divert attention.",
      correction: "Anchor response strictly to the core burden of proof outlined in the motion.",
      severity: "Moderate",
      confidence: 89
    });
  }

  const credibilityScore = Math.max(45, 95 - fallacies.length * 15);
  return {
    fallacies,
    credibility_score: credibilityScore,
    reasoning_analysis: fallacies.length > 0
      ? `Flagged ${fallacies.length} rhetorical vulnerability. Premise contains structural deductions that undermine validity.`
      : "Argument structure adheres to valid inductive and deductive standards with no overt fallacies."
  };
}

// Module 6: Counterargument Generation Engine (Supports all 5 PDF Rebuttal Types)
export async function generateCounterargumentsWithGemini({ argument, topic = "Debate Motion", position = "Affirmative", format = "Oxford Debate" }) {
  const client = getGemini();
  const safeArg = (argument || "").trim();
  const targetPos = position === "Affirmative" ? "Negative" : "Affirmative";

  if (client && safeArg) {
    try {
      const prompt = `You are a World Champion Debate Strategist.
Given this ${position} argument on "${topic}" (${format}):
"${safeArg}"

Generate:
1. Rebuttal (direct, razor-sharp refutation representing the ${targetPos} position)
2. Five Counterargument Types:
   - Logical Rebuttal (expose deductive or inductive flaw)
   - Evidence-Based Rebuttal (counter with data, studies, or empirical precedent)
   - Ethical Counterargument (moral obligations, equity, unintended human costs)
   - Practical Counterargument (implementation hurdles, budget constraints, enforcement)
   - Policy Counterargument (regulatory friction, legal precedent, jurisdictional conflicts)
3. Alternative Perspectives (2 distinct alternative viewpoints)
4. Challenge Questions (3 sharp cross-examination questions)
5. Debate Strategy Suggestions (2 tactical tips)

Return strictly valid JSON:
{
  "rebuttal": "Direct 2-sentence refutation.",
  "counterarguments": {
    "logical_rebuttal": "...",
    "evidence_based_rebuttal": "...",
    "ethical_counterargument": "...",
    "practical_counterargument": "...",
    "policy_counterargument": "..."
  },
  "alternative_perspectives": ["Perspective A", "Perspective B"],
  "challenge_questions": ["Question 1?", "Question 2?", "Question 3?"],
  "debate_strategy_suggestions": ["Tip 1", "Tip 2"]
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
      }
    } catch (err) {
      console.warn("Gemini counterargument generation notice, using strategic fallback:", err?.message || err);
    }
  }

  // Fallback multi-type counterarguments
  const snippet = safeArg.length > 60 ? `${safeArg.slice(0, 60)}...` : safeArg;
  return {
    rebuttal: `While the ${position} contends that "${snippet}", this position conflates theoretical solvency with real-world outcomes. From the ${targetPos} bench, the secondary externalities far outweigh the proposed advantages.`,
    counterarguments: {
      logical_rebuttal: `The assertion assumes that causation directly flows from this single intervention, committing an unverified inferential leap.`,
      evidence_based_rebuttal: `Empirical precedents across analogous policy trials show that compliance mandates without verified incentives result in a 34% drop in efficacy.`,
      ethical_counterargument: `Prioritizing centralized enforcement disproportionately penalizes vulnerable stakeholders who bear the brunt of unintended systemic shifts.`,
      practical_counterargument: `The operational infrastructure required to enforce this mechanism creates prohibitive fiscal overhead and bottlenecks.`,
      policy_counterargument: `Current legal and regulatory frameworks restrict unilateral mandates of this scope without explicit legislative codification.`
    },
    alternative_perspectives: [
      `A market-based decentralized incentive model rather than a top-down mandate.`,
      `A staged sunset-clause pilot program to evaluate quantifiable harm before broad enactment.`
    ],
    challenge_questions: [
      `How does the ${position} address the immediate operational bottlenecks when scaling this policy?`,
      `What empirical benchmarks prove that this intervention will not trigger unintended negative consequences?`,
      `If your core premise fails under variable market conditions, what is your secondary solvency mechanism?`
    ],
    debate_strategy_suggestions: [
      `Shift the burden of proof to the opposition by challenging them to define measurable solvency criteria.`,
      `Frame your rebuttal around rights-based principles to neutralize the opponent's utilitarian statistics.`
    ]
  };
}

// Module 10: Recommendation & Coaching Engine
export async function generateCoachingRecommendationsWithGemini({ userStats = {}, debateCount = 0, avgScore = 85, fallaciesFlagged = [] }) {
  const client = getGemini();

  if (client) {
    try {
      const prompt = `You are a Master Speech and Debate Coach.
Analyze the user's progress:
- Total Debates Completed: ${debateCount}
- Overall Score: ${avgScore}
- Flagged Fallacies: ${JSON.stringify(fallaciesFlagged)}
- Current Skills Matrix: ${JSON.stringify(userStats)}

Generate:
1. Debate Improvement Recommendations (3 specific actionable tactics)
2. Presentation Improvement Suggestions (3 specific vocal/delivery tips)
3. Skill Development Plans (3 target goals with milestones)
4. Personalized Coaching Feedback (1 cohesive coaching review paragraph)
5. Learning Path Generation (4-step progression roadmap)

Return strictly valid JSON:
{
  "debate_recommendations": ["Tactic 1", "Tactic 2", "Tactic 3"],
  "presentation_recommendations": ["Vocal tip 1", "Vocal tip 2", "Vocal tip 3"],
  "skill_development_plans": [
    { "skill": "Logical Shield", "current": 78, "target": 95, "action": "Identify and neutralize false dilemmas" },
    { "skill": "Evidentiary Backing", "current": 72, "target": 90, "action": "Integrate two empirical citations per turn" }
  ],
  "personalized_feedback": "Coaching review paragraph...",
  "learning_path": [
    { "phase": "Phase 1", "focus": "Foundational Refutation", "duration": "Week 1-2" },
    { "phase": "Phase 2", "focus": "Fallacy Immunity & Warrants", "duration": "Week 3-4" },
    { "phase": "Phase 3", "focus": "Cross-Examination & Pacing", "duration": "Week 5-6" },
    { "phase": "Phase 4", "focus": "Master Adjudication Prep", "duration": "Week 7-8" }
  ]
}`;

      const rawText = await generateWithGeminiFallback(client, { prompt, isJson: true });
      if (rawText) {
        return JSON.parse(rawText.replace(/```json|```/g, "").trim());
      }
    } catch (err) {
      console.warn("Gemini coaching recommendations notice, using rule fallback:", err?.message || err);
    }
  }

  // Fallback coaching recommendations
  return {
    debate_recommendations: [
      "Define explicit evaluation criteria in your constructive speech to constrain opponent clash.",
      "Anchor every central assertion with a verifiable statistic or historical precedent.",
      "Anticipate opposition's strongest counterarguments rather than targeting weak straw-man variations."
    ],
    presentation_recommendations: [
      "Regulate speaking cadence into the 135-150 WPM pocket for optimal cognitive processing.",
      "Replace vocal pauses ('um', 'like', 'you know') with deliberate 1-second silent pauses.",
      "Vary vocal pitch inflection when transitioning from premise introduction to evidentiary proof."
    ],
    skill_development_plans: [
      { skill: "Logical Fallacy Shield", current: 80, target: 95, action: "Neutralize Ad Hominem and False Dilemma traps in cross-examination" },
      { skill: "Evidence Weight", current: 75, target: 90, action: "Incorporate dual-source verifiable citations in debate turns" },
      { skill: "Speech Pacing & Cadence", current: 82, target: 92, action: "Maintain vocal clarity within 140 WPM during live rebuttals" }
    ],
    personalized_feedback: `Your rhetorical trajectory demonstrates disciplined thematic focus. To ascend into elite adjudication brackets, concentrate on evidentiary substantiation and proactive counterargument defense during multi-turn clashes.`,
    learning_path: [
      { phase: "Phase 1", focus: "Premise Isolation & Structural Claims", duration: "Week 1-2" },
      { phase: "Phase 2", focus: "Fallacy Neutralization & Cross-Examination", duration: "Week 3-4" },
      { phase: "Phase 3", focus: "Prosody Calibration (Pacing & Fillers)", duration: "Week 5-6" },
      { phase: "Phase 4", focus: "Competitive Simulation & Master Adjudication", duration: "Week 7-8" }
    ]
  };
}

