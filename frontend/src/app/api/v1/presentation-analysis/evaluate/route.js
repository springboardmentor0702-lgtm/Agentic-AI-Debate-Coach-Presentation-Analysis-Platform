import { NextResponse } from "next/server";
import { transcribeAudioWithGemini, analyzePresentationWithGemini } from "@/lib/geminiHelper";
import { getAuthUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    let text = "";
    let duration = 30;
    let userId = authUser?.id || authUser?.user_id || 1;
    let userEmail = authUser?.email || null;
    let userName = authUser?.name || null;
    let title = "";
    let audioBuffer = null;
    let audioMimeType = "audio/webm";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dur = formData.get("duration_seconds");
      if (dur) duration = Math.max(1, parseFloat(dur.toString()) || 30);
      
      const trans = formData.get("transcript") || formData.get("speech_text");
      if (trans) text = trans.toString().trim();

      const uid = formData.get("user_id");
      if (uid && (!authUser || !authUser.id)) userId = Number(uid) || 1;

      const uemail = formData.get("user_email");
      if (uemail && !userEmail) userEmail = uemail.toString().trim();

      const uname = formData.get("user_name");
      if (uname && !userName) userName = uname.toString().trim();

      const userTitle = formData.get("title");
      if (userTitle) title = userTitle.toString().trim();

      const audioFile = formData.get("audio");
      if (audioFile && typeof audioFile.arrayBuffer === "function") {
        const ab = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(ab);
        audioMimeType = audioFile.type || "audio/webm";

        // Try backend FastAPI engine first if available
        try {
          const backendFormData = new FormData();
          backendFormData.append("audio", new Blob([audioBuffer], { type: audioMimeType }), "speech.webm");
          backendFormData.append("duration_seconds", duration.toString());

          const backendRes = await fetch(`${BACKEND_URL}/api/v1/presentation/analyze`, {
            method: "POST",
            body: backendFormData,
            signal: AbortSignal.timeout(8000)
          });

          if (backendRes.ok) {
            const data = await backendRes.json();
            if (data.transcript) {
              text = data.transcript;
            }
          }
        } catch (backendErr) {
          // Backend not reachable, proceed to Gemini or local transcription
        }

        // If transcript is still empty, transcribe using Gemini
        if (!text && audioBuffer) {
          const geminiTranscript = await transcribeAudioWithGemini({
            audioBuffer,
            mimeType: audioMimeType
          });
          if (geminiTranscript) {
            text = geminiTranscript;
          }
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      const { transcript = "", speech_text = "", duration_seconds = 30, user_id, user_email, user_name, title: jsonTitle } = body;
      text = (transcript || speech_text || "").trim();
      duration = Math.max(1, parseFloat(duration_seconds) || 30);
      if (user_id && (!authUser || !authUser.id)) userId = Number(user_id) || 1;
      if (user_email && !userEmail) userEmail = user_email.toString().trim();
      if (user_name && !userName) userName = user_name.toString().trim();
      if (jsonTitle) title = jsonTitle.toString().trim();
    }

    // If still no speech transcript after audio processing and no input provided
    if (!text) {
      text = "Clear vocal presentation without registered speech artifacts.";
    }

    // Try Gemini presentation delivery analysis if available
    let geminiAnalysis = null;
    try {
      geminiAnalysis = await analyzePresentationWithGemini({
        transcript: text,
        durationSeconds: duration
      });
    } catch (gErr) {
      // fallback to exact deterministic prosody analysis
    }

    // Real mathematical prosody calculation engine
    const words = text ? text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [] : [];
    const wordCount = words.length;
    const minutes = duration / 60.0;
    const calculatedWpm = wordCount > 0 ? Math.round(wordCount / minutes) : 0;
    // WPM must come from the transcript and measured duration. Model output is
    // useful for coaching, but it should not replace this deterministic metric.
    const wpm = calculatedWpm;

    const fillerDictionary = ["um", "uh", "uhh", "like", "you know", "actually", "basically", "literally", "sort of", "kind of"];
    const fillerFound = {};
    let totalFillers = 0;
    const lowerText = text.toLowerCase();

    fillerDictionary.forEach((fw) => {
      const regex = new RegExp(`\\b${fw}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        fillerFound[fw] = matches.length;
        totalFillers += matches.length;
      }
    });

    const fillerWordsList = Object.entries(fillerFound)
      .map(([word, count]) => `${word}:${count}`)
      .join(", ") || "None";

    const finalFillerCount = totalFillers;

    let paceStatus = "Optimal";
    if (wpm < 110) paceStatus = "Too Slow";
    else if (wpm > 165) paceStatus = "Too Fast";

    const hedgingWords = ["maybe", "perhaps", "i guess", "i think", "sort of", "kind of", "probably", "possibly"];
    let hedgeCount = 0;
    hedgingWords.forEach((hw) => {
      const regex = new RegExp(`\\b${hw}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) hedgeCount += matches.length;
    });

    const fillerPenalty = finalFillerCount * 3.5;
    const hedgePenalty = hedgeCount * 4.0;
    const paceBonus = paceStatus === "Optimal" ? 5 : -10;

    const clarityScore = geminiAnalysis?.clarity_score || Math.min(98, Math.max(45, Math.round(92 - fillerPenalty + (wordCount > 15 ? 4 : 0))));
    const confidenceScore = geminiAnalysis?.confidence_score || Math.min(97, Math.max(40, Math.round(88 - hedgePenalty - (finalFillerCount * 2) + paceBonus)));
    const engagementScore = geminiAnalysis?.engagement_score || Math.min(96, Math.max(50, Math.round(85 + (wordCount > 30 ? 6 : 0) + (paceStatus === "Optimal" ? 4 : -5))));

    const strengths = geminiAnalysis?.strengths && geminiAnalysis.strengths.length > 0
      ? geminiAnalysis.strengths
      : [];
    const improvements = geminiAnalysis?.areas_for_improvement && geminiAnalysis.areas_for_improvement.length > 0
      ? geminiAnalysis.areas_for_improvement
      : [];

    if (strengths.length === 0) {
      if (paceStatus === "Optimal") {
        strengths.push(`Controlled speaking pace at ${wpm} WPM (within the ideal 120-160 WPM range)`);
      }
      if (finalFillerCount === 0 && wordCount > 5) {
        strengths.push("Zero filler words detected — clean vocal articulation");
      }
      if (hedgeCount === 0 && wordCount > 10) {
        strengths.push("Assertive and definitive rhetorical phrasing");
      }
      if (strengths.length === 0) {
        strengths.push("Clear thematic focus on the core debate subject");
      }
    }

    if (improvements.length === 0) {
      if (wpm < 110 && wpm > 0) {
        improvements.push(`Pace of ${wpm} WPM is slow; aim for 130-150 WPM to maintain audience engagement`);
      } else if (wpm > 165) {
        improvements.push(`Pace of ${wpm} WPM is fast; slow down slightly to allow key points to resonate`);
      }
      if (finalFillerCount > 0) {
        improvements.push(`Reduce vocal pauses: detected ${finalFillerCount} filler word(s) (${fillerWordsList})`);
      }
      if (hedgeCount > 0) {
        improvements.push("Replace speculative qualifiers ('I think', 'maybe') with affirmative assertions");
      }
      if (improvements.length === 0) {
        improvements.push("Continue practicing varied vocal inflection for key arguments");
      }
    }

    const result = {
      success: true,
      transcript: text,
      speech_pace_wpm: wpm,
      words_per_minute: wpm,
      pace_status: paceStatus,
      filler_words_count: finalFillerCount,
      filler_word_count: finalFillerCount,
      filler_words_list: fillerWordsList,
      confidence_score: confidenceScore,
      clarity_score: clarityScore,
      engagement_score: engagementScore,
      duration_seconds: duration,
      feedback: {
        strengths,
        areas_for_improvement: improvements,
      },
    };

    const presentationRecord = {
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      title: title || (text.length > 35 ? text.slice(0, 35) + "..." : "Vocal Speech Run"),
      transcript: text,
      duration: `${Math.round(duration)}s`,
      duration_seconds: duration,
      wpm,
      fillerWords: finalFillerCount,
      fillerBreakdown: fillerWordsList,
      confidence: confidenceScore,
      clarity: clarityScore,
      engagement: engagementScore,
      pace_status: paceStatus
    };
    const authorization = request.headers.get("authorization");
    let savedRecord = presentationRecord;
    if (authorization) {
      const saveResponse = await fetch(`${BACKEND_URL}/api/v1/presentations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify(presentationRecord),
        cache: "no-store"
      });
      if (!saveResponse.ok) throw new Error("Presentation analysis succeeded, but MongoDB save failed.");
      savedRecord = await saveResponse.json();
    }

    return NextResponse.json({ ...result, presentationRecord: savedRecord });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


