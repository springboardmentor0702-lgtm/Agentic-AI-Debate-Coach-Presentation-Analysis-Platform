import { useCallback, useRef, useState } from "react";

/**
 * Wraps the browser's built-in Web Speech API (SpeechRecognition) -
 * free, no server round-trip needed for speech-to-text. Supported in
 * Chrome and Edge on desktop; NOT supported in Firefox, and only
 * partially in Safari. Check `supported` before showing the recording
 * UI.
 *
 * Deliberately does NOT auto-restart on unexpected `onend` (some
 * browsers stop recognition after a long pause) - keeping that logic
 * out avoids restart-loop bugs. If recognition stops early, `isRecording`
 * flips back to false and the person can just start again.
 */
export function useSpeechRecording() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState(null);
  const [supported] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );

  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);
  const finalTranscriptRef = useRef("");

  const start = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    setError(null);
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    finalTranscriptRef.current = "";
    setTranscript("");

    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscriptRef.current += chunk + " ";
        } else {
          interim += chunk;
        }
      }
      setTranscript((finalTranscriptRef.current + interim).trim());
    };

    recognition.onerror = (event) => {
      setError(event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    startTimeRef.current = Date.now();
    recognition.start();
    setIsRecording(true);
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    const durationSeconds = startTimeRef.current
      ? (Date.now() - startTimeRef.current) / 1000
      : 0;
    if (recognition) {
      recognition.stop();
    }
    setIsRecording(false);
    return { transcript: finalTranscriptRef.current.trim(), durationSeconds };
  }, []);

  return { supported, isRecording, transcript, error, start, stop };
}
