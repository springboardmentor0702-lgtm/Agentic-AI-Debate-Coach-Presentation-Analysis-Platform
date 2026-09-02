"use client";

import { useState, useEffect, useRef } from 'react';
import AuthModal from '../../components/AuthModal';

const authHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('logos_ai_jwt') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

const SAMPLE_SPEECHES = [
  {
    title: "⚠️ High Filler Words Sample (Needs Coaching)",
    duration: 25,
    text: "Um, so basically, we believe that AI policy, you know, must be strictly enforced. Uh, without proper controls, like, risks could increase, and actually, literally no one is prepared."
  },
  {
    title: "⚡ Rapid Pace Oxford Debate Sample",
    duration: 15,
    text: "The affirmative premise collapses because sovereign compute governance cannot be decoupled from international trade law without triggering severe retaliatory economic sanctions."
  },
  {
    title: "🏆 Masterclass Keynote Speech (Optimal 145 WPM)",
    duration: 35,
    text: "True rhetoric is not about shouting down your opponent. It is the deliberate art of discovering the available means of persuasion in any given case. When we construct clear premises backed by empirical truth, we elevate democratic discourse."
  }
];

export default function PresentationPage() {
  const [speechText, setSpeechText] = useState(SAMPLE_SPEECHES[0].text);
  const [duration, setDuration] = useState(SAMPLE_SPEECHES[0].duration);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(false);

  // Refs for Web Audio API & MediaRecorder
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const recognitionRef = useRef(null);

  const checkAuth = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('logos_ai_jwt') : null;
    if (!token) {
      setIsAuthModalOpen(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    // Check Speech Recognition Support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechRecognitionSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + ' ';
          }
          if (fullTranscript.trim()) {
            setSpeechText(fullTranscript.trim());
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Visualizer Animation
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyserRef.current.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0E0E12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.85;
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#D90429');
        gradient.addColorStop(1, '#FF4D6D');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    render();
  };

  // Start Live Microphone Recording
  const startRecording = async () => {
    if (!checkAuth()) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];

      // Audio Context for Live Visualizer
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser.fftSize = 128;
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      drawWaveform();

      // Media Recorder for saving audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;

      // Start Speech Recognition
      if (recognitionRef.current) {
        setSpeechText("");
        try {
          recognitionRef.current.start();
        } catch (e) {}
      }

      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);
      setUploadedFileName("");

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          const next = prev + 1;
          setDuration(next);
          return next;
        });
      }, 1000);

    } catch (err) {
      alert("Microphone access denied or not available. Please allow microphone permissions in your browser.");
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsRecording(false);
  };

  // Handle Audio File Upload
  const handleFileUpload = (e) => {
    if (!checkAuth()) {
      e.target.value = "";
      return;
    }
    const file = e.target.files[0];
    if (!file) return;

    setUploadedFileName(file.name);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioBlob(file);

    // Calculate duration from audio file
    const audio = new Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      const calculatedDuration = Math.round(audio.duration) || 30;
      setDuration(calculatedDuration);
    };
  };

  // Analyze Speech Metrics via API
  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!checkAuth()) return;
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/v1/presentation-analysis/evaluate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          speech_text: speechText || "Test speech presentation without text",
          audio_duration_seconds: parseFloat(duration) || 30.0
        })
      });

      if (!res.ok) throw new Error('Unable to analyze speech.');
      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      // Local fallback calculation
      const words = (speechText || "").trim().split(/\s+/).length;
      const calcDuration = Math.max(1, parseFloat(duration) || 30);
      const wpm = Math.round((words / (calcDuration / 60)) * 10) / 10;
      
      const fillerMatches = (speechText || "").match(/\b(um|uh|like|basically|actually|you know|literally|so)\b/gi) || [];
      const fillerCount = fillerMatches.length;

      setMetrics({
        speech_pace_wpm: wpm,
        filler_words_count: fillerCount,
        filler_words_list: fillerMatches.length > 0 ? fillerMatches.join(', ') : "None",
        confidence_score: Math.max(30, Math.min(98, 95 - fillerCount * 8)),
        clarity_score: Math.max(35, Math.min(99, wpm >= 130 && wpm <= 160 ? 92 : 75)),
        engagement_score: Math.max(40, Math.min(96, 85 - fillerCount * 4))
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onAuthSuccess={() => setIsAuthModalOpen(false)}
      />

      <div className="watermark-container">
        <div className="watermark-text" style={{ bottom: '2rem', right: '2rem', left: 'auto', opacity: 0.05, zIndex: -1 }}>RHETORIC</div>
        <div className="section-container" style={{ position: 'relative', zIndex: 1, maxWidth: '1200px', margin: '0 auto', paddingTop: '2.5rem' }}>
          
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="badge-red-pill">PROSODY & SPEECH INTELLIGENCE ENGINE</div>
            <h1 className="font-display" style={{ fontSize: '2.8rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.75rem', letterSpacing: '-0.5px' }}>
              VOCAL METRICS & PRESENTATION STUDIO
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', maxWidth: '800px', lineHeight: '1.6' }}>
              Record live speech from your microphone or upload audio files. The prosody engine computes real-time speaking pace (WPM), detects filler words, and audits vocal delivery clarity.
            </p>
          </div>

          {/* Audio Recording & Upload Control Bar */}
          <div style={{ background: '#0E0E12', color: '#FFF', padding: '1.75rem 2rem', borderRadius: '16px', border: '1px solid var(--dark-border)', marginBottom: '2rem', boxShadow: '0 12px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
              
              {/* Left: Recording Controls & Timer */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {!isRecording ? (
                  <button 
                    onClick={startRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: 'var(--accent-red)',
                      color: '#FFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.75rem 1.4rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 14px rgba(217, 4, 41, 0.4)'
                    }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFF' }}></span>
                    START LIVE RECORDING
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      background: '#111827',
                      color: '#FFF',
                      border: '1px solid var(--accent-red)',
                      borderRadius: '8px',
                      padding: '0.75rem 1.4rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: 'var(--accent-red)', animation: 'pulse 1s infinite' }}></span>
                    STOP RECORDING ({formatTimer(recordingTime)})
                  </button>
                )}

                {/* Timer Display */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-mono)', fontSize: '1.2rem', fontWeight: 800, color: isRecording ? 'var(--accent-red)' : '#A0A0B0' }}>
                  <span>⏱️</span>
                  <span>{isRecording ? formatTimer(recordingTime) : `${duration}s`}</span>
                </div>
              </div>

              {/* Middle / Right: Audio File Upload */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <label 
                  onClick={(e) => {
                    if (!checkAuth()) {
                      e.preventDefault();
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    background: '#18181B',
                    color: '#E4E4E7',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  📁 UPLOAD AUDIO FILE (.wav, .mp3, .m4a)
                  <input 
                    type="file" 
                    accept="audio/*" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>

                {uploadedFileName && (
                  <span style={{ fontSize: '0.8rem', color: '#10B981', fontFamily: 'var(--font-mono)' }}>
                    ✓ {uploadedFileName}
                  </span>
                )}
              </div>
            </div>

            {/* Live Waveform Canvas / Audio Player */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #1F1F26' }}>
              {isRecording && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--accent-red)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)' }}></span>
                    LIVE MICROPHONE STREAM AUDIO ACTIVE...
                  </div>
                  <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={70} 
                    style={{ width: '100%', height: '70px', borderRadius: '8px', background: '#09090B' }}
                  />
                </div>
              )}

              {audioUrl && !isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', background: '#18181B', padding: '0.85rem 1.25rem', borderRadius: '10px' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#A0A0B0' }}>
                    AUDIO PLAYBACK:
                  </div>
                  <audio controls src={audioUrl} style={{ height: '36px', flex: 1 }} />
                </div>
              )}
            </div>
          </div>

          {/* Preset Sample Selector */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>
              PRESET SPEECH SAMPLES:
            </span>
            {SAMPLE_SPEECHES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSpeechText(sample.text);
                  setDuration(sample.duration);
                  setAudioUrl(null);
                  setUploadedFileName("");
                }}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-light)',
                  background: speechText === sample.text ? '#18181B' : '#FFFFFF',
                  color: speechText === sample.text ? '#FFFFFF' : '#374151',
                  fontSize: '0.78rem',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {sample.title}
              </button>
            ))}
          </div>

          {/* 2-Column Grid: Form & Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* Left Side: Speech Input & Controls */}
            <form onSubmit={handleAnalyze} style={{ background: '#FFF', padding: '2rem', border: '1px solid var(--border-light)', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label className="font-mono" style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#111827' }}>
                  SPEECH TRANSCRIPT / SPOKEN TEXT:
                </label>
                {speechRecognitionSupported && isRecording && (
                  <span style={{ fontSize: '0.75rem', color: '#10B981', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    🎙️ Live Voice Transcribing...
                  </span>
                )}
              </div>

              <textarea
                rows={7}
                required
                value={speechText}
                onChange={(e) => setSpeechText(e.target.value)}
                className="font-mono"
                placeholder="Speak into microphone or type your speech here in English..."
                style={{
                  width: '100%',
                  padding: '1rem',
                  border: '1px solid var(--border-light)',
                  borderRadius: '10px',
                  fontSize: '0.88rem',
                  outline: 'none',
                  marginBottom: '1.25rem',
                  boxSizing: 'border-box',
                  lineHeight: '1.6',
                  background: '#F9FAFB'
                }}
              />

              <div style={{ marginBottom: '1.5rem' }}>
                <label className="font-mono" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.4rem' }}>
                  SPEECH DURATION (SECONDS):
                </label>
                <input
                  type="number"
                  min={1}
                  max={3600}
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="font-mono"
                  style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.3rem', display: 'block' }}>
                  Auto-calculated from microphone/audio playback duration or manually editable.
                </span>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-red" 
                style={{ width: '100%', padding: '0.9rem', fontSize: '0.9rem', borderRadius: '8px', letterSpacing: '0.5px', cursor: 'pointer' }}
              >
                {loading ? 'COMPUTING PROSODY METRICS...' : 'ANALYZE SPEECH METRICS'}
              </button>
            </form>

            {/* Right Side: Prosody & Vocal Metrics Dashboard */}
            <div>
              {metrics ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Speaking Pace Card */}
                  <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '14px', background: '#FFF', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="font-mono text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>SPEECH PACE (WPM)</div>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', padding: '0.2rem 0.6rem', borderRadius: '9999px', background: metrics.speech_pace_wpm >= 130 && metrics.speech_pace_wpm <= 160 ? '#ECFDF5' : '#FEF2F2', color: metrics.speech_pace_wpm >= 130 && metrics.speech_pace_wpm <= 160 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                        {metrics.speech_pace_wpm >= 130 && metrics.speech_pace_wpm <= 160 ? '✓ Optimal Range (130-160 WPM)' : '⚡ Adjust Cadence'}
                      </span>
                    </div>
                    <div className="font-display" style={{ fontSize: '2.8rem', fontWeight: '900', color: 'var(--text-primary)', margin: '0.4rem 0' }}>
                      {metrics.speech_pace_wpm} <span style={{ fontSize: '1rem', color: '#6B7280', fontWeight: 600 }}>Words Per Minute</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {metrics.speech_pace_wpm < 120 ? 'Your pace is slightly slow. Pick up cadence to maintain audience engagement.' : metrics.speech_pace_wpm > 165 ? 'Your pace is rapid. Introduce pauses between main points.' : 'Excellent speaking cadence! Clear and well-articulated.'}
                    </div>
                  </div>

                  {/* Filler Words Card */}
                  <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', borderRadius: '14px', background: '#FFF', boxShadow: '0 8px 20px rgba(0,0,0,0.03)' }}>
                    <div className="font-mono text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>FILLER WORDS DETECTED</div>
                    <div className="font-display" style={{ fontSize: '2.8rem', fontWeight: '900', color: metrics.filler_words_count > 3 ? 'var(--accent-red)' : '#10B981', margin: '0.4rem 0' }}>
                      {metrics.filler_words_count}
                    </div>
                    <div className="font-mono" style={{ fontSize: '0.825rem', color: '#4B5563', lineHeight: '1.4' }}>
                      <strong>Breakdown:</strong> {metrics.filler_words_list || 'None detected'}
                    </div>
                  </div>

                  {/* Confidence & Vocal Clarity Dual Meters */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '1.25rem', border: '1px solid var(--border-light)', borderRadius: '14px', background: '#FFF' }}>
                      <div className="font-mono text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>CONFIDENCE</div>
                      <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900', color: metrics.confidence_score >= 80 ? '#10B981' : 'var(--accent-red)', marginTop: '0.25rem' }}>
                        {metrics.confidence_score}%
                      </div>
                    </div>
                    <div style={{ padding: '1.25rem', border: '1px solid var(--border-light)', borderRadius: '14px', background: '#FFF' }}>
                      <div className="font-mono text-muted" style={{ fontSize: '0.75rem', fontWeight: 700 }}>VOCAL CLARITY</div>
                      <div className="font-display" style={{ fontSize: '2.2rem', fontWeight: '900', color: metrics.clarity_score >= 80 ? '#10B981' : '#F59E0B', marginTop: '0.25rem' }}>
                        {metrics.clarity_score}%
                      </div>
                    </div>
                  </div>

                  {/* Tactical Coaching Advice Card */}
                  <div style={{ background: '#111827', color: '#FFF', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--dark-border)' }}>
                    <div className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 800, marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                      PROSODY COACHING DRILL:
                    </div>
                    <p style={{ fontSize: '0.88rem', color: '#D1D5DB', lineHeight: '1.5' }}>
                      {metrics.filler_words_count > 3 
                        ? 'Practice the "3-Second Silence Rule". Whenever you feel the urge to say "um" or "like", take a silent breath instead. Silence projects executive presence.'
                        : metrics.speech_pace_wpm < 120 
                        ? 'Incorporate rhythmic cadence changes to emphasize rhetorical pivots.' 
                        : 'Superb prosody balance! Your pacing and minimal filler density project command over the debate motion.'}
                    </p>
                  </div>

                </div>
              ) : (
                <div style={{ padding: '3.5rem 2rem', border: '2px dashed var(--border-light)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', background: '#FAFAFC' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎙️</div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#374151', marginBottom: '0.5rem' }}>Audio & Speech Ready</div>
                  <p style={{ fontSize: '0.88rem', maxWidth: '340px', margin: '0 auto' }}>
                    Click <strong>"Start Live Recording"</strong>, upload an audio file, or choose a preset sample to compute real-time prosody analytics.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </>
  );
}
