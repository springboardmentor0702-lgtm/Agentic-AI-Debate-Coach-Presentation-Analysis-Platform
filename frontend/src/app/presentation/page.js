"use client";

import { useState } from 'react';
import { apiFetch } from '../../lib/api';
import SpeechRecorder from '../../components/SpeechRecorder';

export default function PresentationPage() {
  const [speechText, setSpeechText] = useState(
    "Um, so basically, we believe that AI policy, you know, must be strictly enforced. Uh, without proper controls, like, risks could increase."
  );
  const [duration, setDuration] = useState(30);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const sessionId = Number(localStorage.getItem('logos_ai_session_id'));
      if (!sessionId) throw new Error('Start a debate session before analyzing speech.');
      if (!speechText.trim()) throw new Error('Enter or dictate a speech transcript first.');

      const res = await apiFetch("/presentation-analysis/evaluate", {
        method: "POST",
        body: JSON.stringify({
          session_id: sessionId,
          speech_text: speechText,
          audio_duration_seconds: parseFloat(duration) || 60
        })
      });

      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      setMetrics(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="watermark-container">
      <div className="watermark-text" style={{ bottom: '2rem', right: '2rem', left: 'auto', opacity: 0.05, zIndex: -1 }}>RHETORIC</div>
      <div className="section-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="badge-red-pill">PROSODY &amp; SPEECH ENGINE</div>
        <h1 className="font-display" style={{ fontSize: '3rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '1rem' }}>
          VOCAL METRICS &amp; PRESENTATION SUITE
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', maxWidth: '700px' }}>
          Evaluate speaking pace (WPM), filler word density, vocal confidence, and speech clarity using prosody speech analytics.
          Type your transcript or dictate it live with your microphone.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
          {/* Input Form */}
          <form onSubmit={handleAnalyze} style={{ background: 'var(--bg-secondary)', padding: '2rem', border: '1px solid var(--border-light)' }}>
            <label className="font-mono" htmlFor="speech-transcript" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              SPEECH TRANSCRIPT / AUDIO TEXT INPUT:
            </label>
            <textarea
              id="speech-transcript"
              rows={8}
              value={speechText}
              onChange={(e) => setSpeechText(e.target.value)}
              className="font-mono"
              style={{
                width: '100%',
                padding: '1rem',
                border: '1px solid var(--border-light)',
                fontSize: '0.9rem',
                outline: 'none',
                marginBottom: '1.5rem'
              }}
            />

            <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '1px solid var(--border-light)', background: '#fff' }}>
              <div className="font-mono" style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '0.75rem' }}>
                DICTATE SPEECH TO TEXT
              </div>
              <SpeechRecorder
                onComplete={(transcript) => {
                  if (transcript.trim()) setSpeechText((current) => (
                    current.trim() ? `${current.trim()} ${transcript.trim()}` : transcript.trim()
                  ));
                }}
                disabled={loading}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                Allow microphone access, speak clearly, then stop recording to append the transcript above.
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="font-mono" htmlFor="speech-duration" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                SPEECH DURATION (SECONDS):
              </label>
              <input
                id="speech-duration"
                type="number"
                min="1"
                step="1"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="font-mono"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border-light)' }}
              />
            </div>

            {error && (
              <div role="alert" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', background: '#fef2f2', border: '1px solid var(--accent-red)', color: 'var(--accent-red)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-red" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'ANALYZING PROSODY...' : 'ANALYZE SPEECH METRICS'}
            </button>
          </form>

          {/* Results Panel */}
          <div>
            {metrics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Pace Meter */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>SPEECH PACE (WPM)</div>
                  <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                    {metrics.speech_pace_wpm} <span style={{ fontSize: '1rem', color: '#10b981' }}>WPM</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {metrics.speech_pace_wpm >= 130 && metrics.speech_pace_wpm <= 160 ? '✓ Optimal Pacing' : '⚡ Adjust Pace'}
                  </div>
                </div>

                {/* Filler Words */}
                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>FILLER WORDS DETECTED</div>
                  <div className="font-display" style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--accent-red)' }}>
                    {metrics.filler_words_count}
                  </div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Breakdown: {metrics.filler_words_list || 'None'}
                  </div>
                </div>

                {/* Confidence & Clarity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                    <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>CONFIDENCE SCORE</div>
                    <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>
                      {metrics.confidence_score}%
                    </div>
                  </div>
                  <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                    <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>VOCAL CLARITY</div>
                    <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>
                      {metrics.clarity_score}%
                    </div>
                  </div>
                </div>

                <div style={{ padding: '1.5rem', border: '1px solid var(--border-light)', background: '#fff' }}>
                  <div className="font-mono text-muted" style={{ fontSize: '0.75rem' }}>AUDIENCE ENGAGEMENT</div>
                  <div className="font-display" style={{ fontSize: '2rem', fontWeight: '900' }}>
                    {metrics.engagement_score}%
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '3rem', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-muted)' }}>
                Click &quot;ANALYZE SPEECH METRICS&quot; to compute real-time prosody analytics.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
