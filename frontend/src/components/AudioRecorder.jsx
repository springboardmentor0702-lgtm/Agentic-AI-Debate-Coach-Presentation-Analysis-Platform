import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Volume2, AlertCircle, Sparkles, Check } from 'lucide-react';

export default function AudioRecorder({ 
  value = "", 
  onChange, 
  onTranscriptReady, 
  placeholder = "Speak into microphone or type your counter-speech here..." 
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");
  const [micVolume, setMicVolume] = useState(0); // 0 to 100
  const [interimText, setInterimText] = useState("");

  const recognitionRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const timerRef = useRef(null);
  const animFrameRef = useRef(null);

  // Quick speech sample suggestions for easy testing
  const sampleSpeeches = [
    "Independent studies demonstrate that algorithmic systems reduce human cognitive fatigue and eliminate municipal corrupt diversion by 42%.",
    "However, this assumes correlation equals causation. When black-box systems fail, citizens have zero democratic or constitutional recourse.",
    "Our framework enforces mathematically verifiable constraint boundaries with open-source cryptographic audit trails."
  ];

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setStatusMessage("");
    setInterimText("");
    setIsRecording(true);
    setRecordingSeconds(0);

    // 1. Start timer
    timerRef.current = setInterval(() => {
      setRecordingSeconds(prev => prev + 1);
    }, 1000);

    // 2. Request user microphone via getUserMedia for REAL live audio monitoring
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        // Set up AudioContext & Analyser to measure real sound volume
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolume(normalized);
            animFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      }
    } catch (err) {
      console.warn("getUserMedia error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setStatusMessage("⚠️ Microphone permission denied. Please click the camera/lock icon in your browser URL bar and choose 'Allow'.");
      } else {
        setStatusMessage("⚠️ Could not access microphone hardware. Please check your mic connection.");
      }
    }

    // 3. Set up SpeechRecognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let accumulated = value ? value + " " : "";

        recognition.onresult = (event) => {
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              accumulated += transcriptChunk + ' ';
            } else {
              currentInterim += transcriptChunk;
            }
          }

          const combined = (accumulated + currentInterim).trim();
          setInterimText(currentInterim);
          
          if (onChange) onChange(combined);
          if (onTranscriptReady) onTranscriptReady(combined, recordingSeconds || 15);
        };

        recognition.onerror = (event) => {
          console.warn("Speech recognition error:", event.error);
          if (event.error === 'not-allowed') {
            setStatusMessage("⚠️ Browser blocked speech recognition. Please allow microphone permissions.");
          } else if (event.error === 'network') {
            setStatusMessage("⚠️ Browser speech recognition network error. You can type or paste directly below.");
          } else if (event.error === 'no-speech') {
            // Normal silence timeout, keep going
          }
        };

        recognition.onend = () => {
          // If still marked as recording, restart to keep listening continuously
          if (recognitionRef.current && isRecording) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setStatusMessage("🔴 Listening... Speak clearly into your microphone");
      } catch (err) {
        console.warn("SpeechRecognition start failed:", err);
        setStatusMessage("⚠️ Speech recognition engine busy. Type or paste your arguments directly below.");
      }
    } else {
      setStatusMessage("⚠️ Web Speech Recognition is not supported in this browser. You can type or paste your speech text directly into the box.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    stopAllAudio();
    setMicVolume(0);
    setInterimText("");
    setStatusMessage("✓ Recording stopped. You can edit your speech below before submitting.");
    
    if (onTranscriptReady && value) {
      onTranscriptReady(value.trim(), Math.max(5, recordingSeconds));
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const handleInsertSample = (sample) => {
    const updated = value ? `${value.trim()} ${sample}` : sample;
    if (onChange) onChange(updated);
    if (onTranscriptReady) onTranscriptReady(updated, 30);
    setStatusMessage("✓ Sample argument inserted!");
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg space-y-3">
      
      {/* Top Controls Row */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Record Button & Status */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={toggleRecording}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl ${
              isRecording 
                ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/40" 
                : "bg-blue-600 hover:bg-blue-500 text-white hover:scale-105"
            }`}
            title={isRecording ? "Click to Stop Recording" : "Click to Speak"}
          >
            {isRecording ? <Square className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRecording ? "bg-rose-500 animate-ping" : "bg-slate-600"}`} />
              <span className="text-xs uppercase font-bold tracking-wider text-slate-300">
                {isRecording ? "Live Recording & Listening" : "Microphone Ready"}
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-white mt-0.5 flex items-center gap-3">
              <span>{formatTime(recordingSeconds)}</span>
              {isRecording && (
                <span className="text-xs font-normal text-rose-400 animate-pulse">
                  ● REC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Audio Visualizer / Volume Level Meter */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {isRecording ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800">
              <Volume2 className={`w-4 h-4 ${micVolume > 5 ? "text-emerald-400" : "text-slate-500"}`} />
              <div className="flex items-end gap-1 h-6">
                {[12, 24, 36, 48, 60, 72, 84, 96].map((threshold, i) => {
                  const active = micVolume >= (threshold * 0.4);
                  return (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        active 
                          ? (i > 5 ? "bg-rose-500" : (i > 3 ? "bg-amber-400" : "bg-emerald-400"))
                          : "bg-slate-800"
                      }`}
                      style={{ height: `${(i + 1) * 3}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[10px] font-mono text-slate-400 ml-1">
                {micVolume > 5 ? "Sound Detected" : "Speak Now..."}
              </span>
            </div>
          ) : (
            <div className="text-xs text-slate-400 hidden sm:block">
              Click <strong className="text-white">Blue Mic</strong> to record speech
            </div>
          )}
        </div>

      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 border ${
          statusMessage.startsWith("⚠️") 
            ? "bg-amber-950/30 border-amber-800/40 text-amber-300"
            : (statusMessage.startsWith("🔴") 
                ? "bg-rose-950/20 border-rose-800/40 text-rose-300"
                : "bg-emerald-950/30 border-emerald-800/40 text-emerald-300")
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Transcript Textarea (Live Speech or Manual Typing) */}
      <div>
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-1">
          <span>{isRecording ? "Live Speech Stream (Transcribing in real-time):" : "Speech Transcript / Argument Input:"}</span>
          <span className="text-[11px] text-slate-500">{value ? `${value.split(/\s+/).filter(Boolean).length} words` : "0 words"}</span>
        </div>
        <textarea
          rows={3}
          value={value}
          onChange={(e) => {
            if (onChange) onChange(e.target.value);
            if (onTranscriptReady) onTranscriptReady(e.target.value, recordingSeconds || 30);
          }}
          placeholder={placeholder}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-none font-sans leading-relaxed"
        />
      </div>

      {/* Quick Argument Suggestions (Guarantees Instant Testing Even Without Mic!) */}
      <div className="pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Quick Debate Arguments (Click to insert):</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {sampleSpeeches.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleInsertSample(sample)}
              className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition text-left line-clamp-1 max-w-xs"
              title={sample}
            >
              "{sample.slice(0, 45)}..."
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
