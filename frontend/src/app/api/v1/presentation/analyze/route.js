import { NextResponse } from "next/server";
import { transcribeAudioWithGemini } from "@/lib/geminiHelper";
import { getAuthUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function POST(request) {
  try {
    let durationSeconds = 30;
    let transcript = "";
    let audioBuffer = null;
    let audioMimeType = "audio/webm";

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const dur = formData.get("duration_seconds");
      if (dur) durationSeconds = parseFloat(dur.toString()) || 30;
      const trans = formData.get("transcript") || formData.get("speech_text");
      if (trans) transcript = trans.toString().trim();

      const audioFile = formData.get("audio");
      if (audioFile && typeof audioFile.arrayBuffer === "function") {
        const ab = await audioFile.arrayBuffer();
        audioBuffer = Buffer.from(ab);
        audioMimeType = audioFile.type || "audio/webm";

        try {
          const backendFormData = new FormData();
          backendFormData.append("audio", new Blob([audioBuffer], { type: audioMimeType }), "speech.webm");
          backendFormData.append("duration_seconds", durationSeconds.toString());

          const backendRes = await fetch(`${BACKEND_URL}/api/v1/presentation/analyze`, {
            method: "POST",
            body: backendFormData,
            signal: AbortSignal.timeout(8000)
          });

          if (backendRes.ok) {
            const data = await backendRes.json();
            if (data.transcript) {
              transcript = data.transcript;
            }
          }
        } catch (bErr) {
          // Backend not reachable, use Gemini
        }

        if (!transcript && audioBuffer) {
          const gemTranscript = await transcribeAudioWithGemini({
            audioBuffer,
            mimeType: audioMimeType
          });
          if (gemTranscript) {
            transcript = gemTranscript;
          }
        }
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (body.duration_seconds) durationSeconds = parseFloat(body.duration_seconds) || 30;
      if (body.transcript) transcript = body.transcript;
      if (body.speech_text && !transcript) transcript = body.speech_text;
    }

    transcript = (transcript || "Clear vocal presentation without registered speech artifacts.").trim();
    const duration = Math.max(1, durationSeconds);
    const words = transcript.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const minutes = duration / 60.0;
    const wpm = wordCount > 0 ? Math.round(wordCount / minutes) : 0;

    const fillerWords = ["um", "uh", "uhh", "like", "you know", "actually", "basically", "literally", "sort of", "kind of"];
    const fillerFound = {};
    let fillerCount = 0;
    const lowerText = transcript.toLowerCase();
    fillerWords.forEach((fw) => {
      const regex = new RegExp(`\\b${fw}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches && matches.length > 0) {
        fillerFound[fw] = matches.length;
        fillerCount += matches.length;
      }
    });

    const fillerWordsList = Object.entries(fillerFound)
      .map(([word, count]) => `${word}:${count}`)
      .join(", ") || "None";

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

    const fillerPenalty = fillerCount * 3.5;
    const hedgePenalty = hedgeCount * 4.0;
    const paceBonus = paceStatus === "Optimal" ? 5 : -10;

    const clarityScore = Math.min(98, Math.max(45, Math.round(92 - fillerPenalty + (wordCount > 15 ? 4 : 0))));
    const confidenceScore = Math.min(97, Math.max(40, Math.round(88 - hedgePenalty - (fillerCount * 2) + paceBonus)));
    const engagementScore = Math.min(96, Math.max(50, Math.round(85 + (wordCount > 30 ? 6 : 0) + (paceStatus === "Optimal" ? 4 : -5))));

    const authUser = getAuthUser(request);

    const presentationRecord = {
      user_id: authUser?.id || authUser?.user_id || 1,
      user_email: authUser?.email || null,
      user_name: authUser?.name || "Speaker",
      title: transcript.length > 35 ? transcript.slice(0, 35) + "..." : "Speech Practice",
      transcript,
      duration: `${Math.round(duration)}s`,
      duration_seconds: duration,
      wpm,
      fillerWords: fillerCount,
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
      if (!saveResponse.ok) throw new Error("Presentation save failed.");
      savedRecord = await saveResponse.json();
    }

    return NextResponse.json({
      success: true,
      transcript,
      clarity_score: clarityScore,
      confidence_score: confidenceScore,
      engagement_score: engagementScore,
      words_per_minute: wpm,
      speech_pace_wpm: wpm,
      pace_status: paceStatus,
      filler_words_count: fillerCount,
      filler_word_count: fillerCount,
      filler_words_list: fillerWordsList,
      duration_seconds: duration,
      presentationRecord: savedRecord,
      metrics: {
        wpm,
        fillerCount,
        clarityScore,
        confidenceScore,
        engagementScore,
        paceStatus,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to analyze presentation speech" },
      { status: 500 }
    );
  }
}

