import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

/**
 * A small, self-contained mic button for any text input across the
 * app - Argument Analysis, Fallacy Detection, Counterarguments, Case
 * Review, anywhere text can be typed can also be spoken instead.
 *
 * Reuses the exact same browser Web Speech API already working in
 * PresentationAnalysis.jsx - no new dependency, no new risk. That
 * page needed a full recording+timer flow for scoring delivery; this
 * is the simpler case - just turn speech into text and hand it back,
 * the same way typing would.
 *
 * Transcribed text is APPENDED to whatever's already there via
 * onTranscript, never silently replacing something already typed.
 */
export default function VoiceInputButton({ onTranscript, className = "" }) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        }
      }
      if (finalText.trim()) onTranscript(finalText.trim());
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    return () => recognition.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? "Stop recording" : "Start voice input"}
      className={
        className ||
        `inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-colors ${
          isListening
            ? "border-danger text-danger"
            : "border-line text-faint hover:border-accent hover:text-accent"
        }`
      }
    >
      {isListening ? <Square size={12} /> : <Mic size={12} />}
      {isListening ? "Stop Recording" : "Start Recording"}
    </button>
  );
}
