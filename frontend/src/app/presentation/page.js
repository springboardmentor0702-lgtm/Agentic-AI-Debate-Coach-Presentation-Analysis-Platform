'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';

export default function PresentationPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  
  // Input Mode: 'mic' | 'upload' | 'text'
  const [inputMode, setInputMode] = useState('mic');

  // Text / Upload state
  const [speechText, setSpeechText] = useState('The debate between Generative AI and Agentic AI raises an important question about the future of technology. Will Generative AI remain the dominant force because of its creative capabilities, or will Agentic AI become more influential by enabling machines to think, plan, and act autonomously?');
  const [duration, setDuration] = useState(30);
  const [audioFile, setAudioFile] = useState(null);

  // Live Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [speechRecognitionSupported, setSpeechRecognitionSupported] = useState(true);

  // Analytics & UI state
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Refs for recording
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);

  const loadSessions = async () => {
    try {
      const items = await apiFetch('/sessions/user/me');
      const list = items || [];
      setSessions(list);
      if (!sessionId && list[0]?.id) {
        setSessionId(String(list[0].id));
      }
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        router.push('/login');
      } else {
        setError(err.message || 'Unable to load sessions.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getStoredUser()?.access_token) {
      router.push('/login');
      return;
    }
    loadSessions();

    // Check Speech Recognition API support
    const SpeechRecognition = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) {
      setSpeechRecognitionSupported(false);
    }

    return () => {
      stopRecordingCleanup();
    };
  }, [router]);

  const selectedSession = sessions.find((s) => String(s.id) === String(sessionId));

  const stopRecordingCleanup = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // --- START LIVE RECORDING ---
  const startRecording = async () => {
    setError('');
    setSuccessMsg('');
    setMetrics(null);
    setRecordedAudioBlob(null);
    setRecordedAudioUrl(null);
    setLiveTranscript('');
    setRecordingSeconds(0);
    audioChunksRef.current = [];

    if (!sessionId) {
      setError('Please select or create a debate session first.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250); // slice every 250ms
      setIsRecording(true);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // Start Live Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let accumulatedFinal = '';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              accumulatedFinal += event.results[i][0].transcript + ' ';
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          setLiveTranscript((accumulatedFinal + interim).trim());
        };

        recognition.onerror = () => {};
        recognition.onend = () => {
          // If still recording, restart recognition
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
              recognition.start();
            } catch {}
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }
    } catch (err) {
      setError('Microphone access was denied or is unavailable. Please check your browser microphone permissions.');
      setIsRecording(false);
    }
  };

  // --- STOP LIVE RECORDING & TRIGGER ANALYSIS ---
  const stopRecordingAndAnalyze = async () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recordedDuration = Math.max(1, recordingSeconds);

    mediaRecorderRef.current.onstop = async () => {
      const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);

      setRecordedAudioBlob(audioBlob);
      setRecordedAudioUrl(audioUrl);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Automatically send recorded audio to analysis
      await submitAudioBlobForAnalysis(audioBlob, liveTranscript, recordedDuration);
    };

    mediaRecorderRef.current.stop();
  };

  // Submit recorded audio blob to backend
  const submitAudioBlobForAnalysis = async (blob, transcriptText, durationSec) => {
    setAnalyzing(true);
    setError('');
    setMetrics(null);

    try {
      const fileExt = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
      const audioFileObj = new File([blob], `speech_recording_${Date.now()}.${fileExt}`, { type: blob.type });

      const form = new FormData();
      form.append('session_id', sessionId);
      form.append('transcript', transcriptText.trim());
      form.append('audio_file', audioFileObj);

      const data = await apiFetch('/presentation-analysis/analyze-audio', {
        method: 'POST',
        body: form,
      });

      setMetrics(data);
      setSuccessMsg('Live speech recorded and analyzed successfully!');
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        router.push('/login');
      } else {
        // Fallback: If ffmpeg/audio decoding fails, evaluate using live transcript
        if (transcriptText.trim()) {
          try {
            const fallbackData = await apiFetch('/presentation-analysis/evaluate', {
              method: 'POST',
              body: JSON.stringify({
                session_id: Number(sessionId),
                speech_text: transcriptText.trim(),
                audio_duration_seconds: Number(durationSec),
              }),
            });
            setMetrics(fallbackData);
            setSuccessMsg('Analyzed speech metrics from live transcript.');
            return;
          } catch {}
        }
        setError(err.message || 'Unable to analyze the recorded speech.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // --- MANUAL / UPLOAD FORM ANALYZE ---
  const handleAnalyze = async (e) => {
    e.preventDefault();
    setAnalyzing(true);
    setError('');
    setSuccessMsg('');
    setMetrics(null);

    try {
      if (!sessionId) throw new Error('Create or select a debate session before analyzing a presentation.');
      let data;
      if (inputMode === 'upload' && audioFile) {
        const form = new FormData();
        form.append('session_id', sessionId);
        form.append('transcript', speechText);
        form.append('audio_file', audioFile);
        data = await apiFetch('/presentation-analysis/analyze-audio', { method: 'POST', body: form });
      } else {
        data = await apiFetch('/presentation-analysis/evaluate', {
          method: 'POST',
          body: JSON.stringify({ session_id: Number(sessionId), speech_text: speechText, audio_duration_seconds: Number(duration) }),
        });
      }
      setMetrics(data);
      setSuccessMsg('Presentation analysis completed successfully!');
    } catch (err) {
      if (err.status === 401) {
        clearAuth();
        router.push('/login');
      } else {
        setError(err.message || 'Unable to analyze the presentation.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleSessionStatus = async (newStatus) => {
    if (!sessionId) return;
    setUpdatingStatus(true);
    setError('');
    setSuccessMsg('');
    try {
      await apiFetch(`/sessions/${sessionId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessMsg(`Session #${sessionId} marked as ${newStatus}!`);
      setSessions((prev) => prev.map((s) => (String(s.id) === String(sessionId) ? { ...s, status: newStatus } : s)));
    } catch (err) {
      setError(err.message || `Unable to mark session as ${newStatus}.`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
  };

  return (
    <main className="watermark-container">
      <div className="section-container" style={{ position: 'relative', zIndex: 1, paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        <div className="badge-red-pill">PROSODY & SPEECH ENGINE</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Vocal Metrics & Presentation Suite
            </h1>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '750px' }}>
              Evaluate speaking pace, filler-word density, vocal confidence, clarity, pauses, silence, and volume in <strong>Real-Time Speech</strong>, uploaded audio, or transcripts with instant AI coaching feedback.
            </p>
          </div>
          {selectedSession && (
            <div style={{ background: '#fff', border: '1px solid var(--border-light)', padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div className="font-mono text-muted" style={{ fontSize: '0.7rem' }}>SESSION #{selectedSession.id}</div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{selectedSession.title}</div>
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.25rem 0.65rem',
                  borderRadius: '4px',
                  background: selectedSession.status === 'Completed' || selectedSession.status === 'Ended' ? '#ecfdf5' : '#fff7ed',
                  color: selectedSession.status === 'Completed' || selectedSession.status === 'Ended' ? '#15803d' : '#c2410c',
                  border: `1px solid ${selectedSession.status === 'Completed' || selectedSession.status === 'Ended' ? '#bbf7d0' : '#fed7aa'}`,
                }}
              >
                {selectedSession.status}
              </span>
              {selectedSession.status === 'Active' ? (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleToggleSessionStatus('Completed')}
                  className="btn btn-dark"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                >
                  {updatingStatus ? 'UPDATING…' : 'END SESSION'}
                </button>
              ) : (
                <button
                  disabled={updatingStatus}
                  onClick={() => handleToggleSessionStatus('Active')}
                  className="btn btn-dark"
                  style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', cursor: 'pointer' }}
                >
                  {updatingStatus ? 'UPDATING…' : 'REOPEN SESSION'}
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div role="alert" style={{ marginBottom: '1.25rem', padding: '.8rem 1rem', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div role="status" style={{ marginBottom: '1.25rem', padding: '.8rem 1rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', fontWeight: 600 }}>
            {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 1fr)', gap: '2rem', alignItems: 'start' }}>
          {/* Left Panel: Mode Selector & Input */}
          <div style={{ background: 'var(--bg-secondary)', padding: '2rem', border: '1px solid var(--border-light)' }}>
            {/* Session selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
              <label className="font-mono" style={{ fontSize: '.85rem', fontWeight: 700 }}>SELECT DEBATE SESSION</label>
              <Link href="/dashboard" style={{ fontSize: '.75rem', color: 'var(--accent-red)', fontWeight: 700, textDecoration: 'underline' }}>
                + Create in Analytics
              </Link>
            </div>
            <select
              required
              disabled={loading || sessions.length === 0 || isRecording}
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              style={{ width: '100%', padding: '.75rem', marginBottom: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}
            >
              <option value="">{loading ? 'Loading sessions…' : sessions.length ? 'Select a session' : 'No sessions available'}</option>
              {sessions.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id}: {item.title} [{item.status}]
                </option>
              ))}
            </select>

            {/* Input Mode Tabs */}
            <div style={{ display: 'flex', gap: '0.4rem', borderBottom: '2px solid #e5e7eb', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => setInputMode('mic')}
                disabled={isRecording}
                style={{
                  padding: '0.65rem 1rem',
                  border: 'none',
                  borderBottom: inputMode === 'mic' ? '3px solid var(--accent-red)' : '3px solid transparent',
                  background: inputMode === 'mic' ? '#fff' : 'transparent',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: inputMode === 'mic' ? 'var(--accent-red)' : '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                🎙️ Real-Time Speech (Live Mic)
              </button>
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                disabled={isRecording}
                style={{
                  padding: '0.65rem 1rem',
                  border: 'none',
                  borderBottom: inputMode === 'upload' ? '3px solid var(--accent-red)' : '3px solid transparent',
                  background: inputMode === 'upload' ? '#fff' : 'transparent',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: inputMode === 'upload' ? 'var(--accent-red)' : '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                📁 Upload Audio File
              </button>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                disabled={isRecording}
                style={{
                  padding: '0.65rem 1rem',
                  border: 'none',
                  borderBottom: inputMode === 'text' ? '3px solid var(--accent-red)' : '3px solid transparent',
                  background: inputMode === 'text' ? '#fff' : 'transparent',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  color: inputMode === 'text' ? 'var(--accent-red)' : '#6b7280',
                  textTransform: 'uppercase',
                }}
              >
                ✍️ Paste Transcript
              </button>
            </div>

            {/* 1. REAL-TIME SPEECH (LIVE MIC) MODE */}
            {inputMode === 'mic' && (
              <div>
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1.5rem', textAlign: 'center', marginBottom: '1.25rem' }}>
                  {isRecording ? (
                    <div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#fee2e2', color: '#dc2626', padding: '0.3rem 0.8rem', borderRadius: '20px', fontWeight: 800, fontSize: '0.75rem', marginBottom: '1rem' }}>
                        <span style={{ width: '10px', height: '10px', background: '#dc2626', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1s infinite' }} />
                        RECORDING LIVE SPEECH
                      </div>
                      <div className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 900, color: '#111827', margin: '0.5rem 0' }}>
                        {formatTimer(recordingSeconds)}
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                        Speak naturally into your microphone. Words are transcribed and vocal signals measured in real-time.
                      </p>

                      <button
                        type="button"
                        onClick={stopRecordingAndAnalyze}
                        className="btn btn-dark"
                        style={{ padding: '0.85rem 2rem', fontSize: '0.9rem', cursor: 'pointer', background: '#dc2626', color: '#fff', border: 'none', fontWeight: 800 }}
                      >
                        ⏹️ STOP RECORDING & ANALYZE SPEECH
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎙️</div>
                      <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem', fontWeight: 800 }}>Real-Time Live Speech Recording</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6b7280', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                        Click below to start speaking. The platform captures your live audio prosody, speaking pace (WPM), and filler words simultaneously.
                      </p>

                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={loading || analyzing || !sessionId}
                        className="btn btn-red"
                        style={{ padding: '0.9rem 2.2rem', fontSize: '0.9rem', cursor: 'pointer' }}
                      >
                        🎙️ START LIVE RECORDING
                      </button>
                    </div>
                  )}
                </div>

                {/* Live Real-Time Transcribed Preview */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label className="font-mono" style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151' }}>
                      {isRecording ? 'LIVE REAL-TIME TRANSCRIPT STREAMING' : 'CAPTURED TRANSCRIPT PREVIEW'}
                    </label>
                    {isRecording && <span className="font-mono text-red animate-pulse" style={{ fontSize: '0.72rem' }}>Listening…</span>}
                  </div>
                  <textarea
                    rows={4}
                    value={liveTranscript}
                    onChange={(e) => setLiveTranscript(e.target.value)}
                    placeholder={speechRecognitionSupported ? "Your spoken words will appear here in real-time as you speak..." : "Live transcript preview (manual editing available)..."}
                    className="font-mono"
                    style={{ width: '100%', padding: '0.85rem', border: '1px solid #d4d4d8', background: '#fff', fontSize: '0.85rem', boxSizing: 'border-box' }}
                  />
                </div>

                {/* Audio Playback of Recorded Speech */}
                {recordedAudioUrl && !isRecording && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1rem', marginTop: '1rem' }}>
                    <div className="font-mono text-muted" style={{ fontSize: '0.7rem', marginBottom: '0.4rem' }}>RECORDED SPEECH AUDIO PLAYBACK</div>
                    <audio controls src={recordedAudioUrl} style={{ width: '100%', height: '40px' }} />
                  </div>
                )}
              </div>
            )}

            {/* 2. UPLOAD AUDIO FILE MODE */}
            {inputMode === 'upload' && (
              <form onSubmit={handleAnalyze}>
                <label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>
                  SELECT AUDIO RECORDING (MP3, WAV, M4A, WEBM, OGG)
                </label>
                <input
                  type="file"
                  required
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  style={{ width: '100%', padding: '.65rem', background: '#fff', border: '1px solid var(--border-light)', marginBottom: '1.25rem', boxSizing: 'border-box' }}
                />

                <label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>
                  TRANSCRIPT (OPTIONAL REFERENCE)
                </label>
                <textarea
                  rows={5}
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  className="font-mono"
                  placeholder="Paste speech transcript for enhanced word counting..."
                  style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-light)', fontSize: '.88rem', marginBottom: '1.25rem', boxSizing: 'border-box' }}
                />

                <button
                  type="submit"
                  disabled={analyzing || loading || !audioFile || !sessionId}
                  className="btn btn-red"
                  style={{ width: '100%', cursor: 'pointer', padding: '0.9rem' }}
                >
                  {analyzing ? 'PROCESSING AUDIO SIGNALS…' : 'ANALYZE UPLOADED AUDIO'}
                </button>
              </form>
            )}

            {/* 3. PASTE TRANSCRIPT MODE */}
            {inputMode === 'text' && (
              <form onSubmit={handleAnalyze}>
                <label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>
                  SPEECH TRANSCRIPT TEXT
                </label>
                <textarea
                  rows={7}
                  required
                  value={speechText}
                  onChange={(e) => setSpeechText(e.target.value)}
                  className="font-mono"
                  placeholder="Paste speech transcript here..."
                  style={{ width: '100%', padding: '0.85rem', border: '1px solid var(--border-light)', fontSize: '.88rem', marginBottom: '1.25rem', boxSizing: 'border-box' }}
                />

                <label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>
                  ESTIMATED DURATION (SECONDS)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  style={{ width: '100%', padding: '.75rem', border: '1px solid var(--border-light)', marginBottom: '1.5rem', boxSizing: 'border-box' }}
                />

                <button
                  type="submit"
                  disabled={analyzing || loading || !sessionId}
                  className="btn btn-red"
                  style={{ width: '100%', cursor: 'pointer', padding: '0.9rem' }}
                >
                  {analyzing ? 'COMPUTING VOCAL METRICS…' : 'ANALYZE SPEECH TRANSCRIPT'}
                </button>
              </form>
            )}
          </div>

          {/* Right Panel: Analytical Results & AI Feedback */}
          <section>
            {analyzing && (
              <div style={{ padding: '3.5rem 2rem', border: '1px solid var(--border-light)', background: '#fff', textAlign: 'center' }}>
                <div className="font-mono text-red animate-pulse" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  &gt; Computing Prosody, Cadence & AI Speech Coaching...
                </div>
                <p style={{ color: '#71717a', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Extracting speech pace (WPM), filler words, confidence scores, and rhetorical recommendations.
                </p>
              </div>
            )}

            {!analyzing && metrics ? (
              <div style={{ display: 'grid', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  {[
                    ['SPEECH PACE', `${metrics.speech_pace_wpm} WPM`],
                    ['FILLER WORDS', `${metrics.filler_words_count} count`],
                    ['CONFIDENCE', `${metrics.confidence_score}%`],
                    ['CLARITY', `${metrics.clarity_score}%`],
                    ['ENGAGEMENT', `${metrics.engagement_score}%`],
                    [
                      'AUDIO SIGNALS',
                      metrics.duration_seconds
                        ? `${metrics.duration_seconds}s · ${metrics.pause_count ?? 0} pauses`
                        : inputMode === 'mic'
                        ? 'Live speech analyzed'
                        : 'Transcript mode',
                    ],
                  ].map(([label, value]) => (
                    <div key={label} style={{ padding: '1.25rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                      <div className="font-mono text-muted" style={{ fontSize: '.72rem' }}>{label}</div>
                      <div className="font-display" style={{ fontSize: '1.75rem', fontWeight: 900, marginTop: '0.3rem' }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '1rem 1.25rem', border: '1px solid var(--border-light)', background: '#fff', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  <strong>Filler Word Breakdown:</strong> {metrics.filler_words_list || 'None detected (0)'}
                </div>

                {/* AI VOCAL & RHETORICAL COACHING FEEDBACK SECTION */}
                {metrics.ai_feedback && (
                  <div style={{ background: '#111827', color: '#fff', border: '1px solid #1f2937', padding: '1.5rem', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #374151', paddingBottom: '0.75rem' }}>
                      <div className="font-mono text-red" style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.1em' }}>
                        AI VOCAL & RHETORICAL COACHING FEEDBACK
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', fontFamily: 'monospace' }}>
                        LIVE EVALUATION
                      </span>
                    </div>

                    <div style={{ fontSize: '0.88rem', lineHeight: '1.6', color: '#e5e7eb', whiteSpace: 'pre-line' }}>
                      {metrics.ai_feedback}
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #374151', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      {selectedSession?.status === 'Active' && (
                        <button
                          disabled={updatingStatus}
                          onClick={() => handleToggleSessionStatus('Completed')}
                          className="btn btn-red"
                          style={{ fontSize: '0.78rem', padding: '0.5rem 1rem', cursor: 'pointer' }}
                        >
                          {updatingStatus ? 'SAVING…' : '✓ END & SAVE SESSION'}
                        </button>
                      )}
                      <Link
                        href="/dashboard"
                        className="btn btn-dark"
                        style={{ fontSize: '0.78rem', padding: '0.5rem 1rem', textDecoration: 'none', display: 'inline-block' }}
                      >
                        VIEW IN ANALYTICS DASHBOARD →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : !analyzing ? (
              <div style={{ padding: '3.5rem 2rem', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-muted)', background: '#fafafa' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎙️</div>
                <h3 style={{ fontSize: '1.1rem', color: '#18181b', marginBottom: '0.5rem' }}>Real-Time Speech Ready</h3>
                <p style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.85rem' }}>
                  Select a debate session and click <strong>🎙️ Start Live Recording</strong> or upload an audio recording to compute instant vocal metrics and AI coaching feedback.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
