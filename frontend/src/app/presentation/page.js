'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch, clearAuth, getStoredUser } from '../../lib/api';
import Navbar from '../../components/Navbar';

export default function PresentationPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [speechText, setSpeechText] = useState('Um, so basically, we believe that AI policy, you know, must be strictly enforced. Without proper controls, risks could increase.');
  const [duration, setDuration] = useState(30);
  const [audioFile, setAudioFile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getStoredUser()?.access_token) { router.push('/login'); return; }
    apiFetch('/sessions/user/me').then(items => {
      const list = items || [];
      setSessions(list);
      setSessionId(list[0]?.id ? String(list[0].id) : '');
    }).catch(err => {
      if (err.status === 401) { clearAuth(); router.push('/login'); } else setError(err.message || 'Unable to load sessions.');
    }).finally(() => setLoading(false));
  }, [router]);

  const handleAnalyze = async (e) => {
    e.preventDefault(); setAnalyzing(true); setError(''); setMetrics(null);
    try {
      if (!sessionId) throw new Error('Create a debate session before analyzing a presentation.');
      let data;
      if (audioFile) {
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
    } catch (err) {
      if (err.status === 401) { clearAuth(); router.push('/login'); } else setError(err.message || 'Unable to analyze the presentation.');
    } finally { setAnalyzing(false); }
  };

  return <><Navbar /><main className="watermark-container"><div className="section-container" style={{ position: 'relative', zIndex: 1, paddingTop: '2.5rem' }}><div className="badge-red-pill">PROSODY & SPEECH ENGINE</div><h1 className="font-display" style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, textTransform: 'uppercase', marginBottom: '1rem' }}>Vocal Metrics & Presentation Suite</h1><p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '700px' }}>Evaluate speaking pace, filler-word density, vocal confidence, clarity, pauses, silence, and volume from transcript or uploaded audio.</p>{error && <div role="alert" style={{ marginBottom: '1rem', padding: '.8rem 1rem', color: '#991b1b', background: '#fef2f2', border: '1px solid #fecaca' }}>{error}</div>}<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 1fr)', gap: '2rem' }}><form onSubmit={handleAnalyze} style={{ background: 'var(--bg-secondary)', padding: '2rem', border: '1px solid var(--border-light)' }}><label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>DEBATE SESSION</label><select required disabled={loading || sessions.length === 0} value={sessionId} onChange={e => setSessionId(e.target.value)} style={{ width: '100%', padding: '.75rem', marginBottom: '1.25rem', border: '1px solid var(--border-light)' }}><option value="">{loading ? 'Loading sessions…' : sessions.length ? 'Select a session' : 'No sessions available'}</option>{sessions.map(item => <option key={item.id} value={item.id}>{item.title} — {item.status}</option>)}</select><label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>TRANSCRIPT (OPTIONAL WHEN AUDIO IS UPLOADED)</label><textarea rows={8} value={speechText} onChange={e => setSpeechText(e.target.value)} className="font-mono" style={{ width: '100%', padding: '1rem', border: '1px solid var(--border-light)', fontSize: '.9rem', marginBottom: '1.25rem' }} /><label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>AUDIO FILE (WAV, MP3, M4A, WEBM, OGG)</label><input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files?.[0] || null)} style={{ width: '100%', marginBottom: '1.25rem' }} />{!audioFile && <><label className="font-mono" style={{ display: 'block', fontSize: '.85rem', fontWeight: 700, marginBottom: '.5rem' }}>TRANSCRIPT DURATION (SECONDS)</label><input type="number" min="1" step="0.1" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: '.75rem', border: '1px solid var(--border-light)', marginBottom: '1.5rem' }} /></>}<button type="submit" disabled={analyzing || loading || !sessionId} className="btn btn-red" style={{ width: '100%', cursor: 'pointer' }}>{analyzing ? 'ANALYZING…' : audioFile ? 'ANALYZE AUDIO' : 'ANALYZE TRANSCRIPT'}</button></form><section>{metrics ? <div style={{ display: 'grid', gap: '1rem' }}>{[['SPEECH PACE', `${metrics.speech_pace_wpm} WPM`], ['FILLER WORDS', metrics.filler_words_count], ['CONFIDENCE', `${metrics.confidence_score}%`], ['CLARITY', `${metrics.clarity_score}%`], ['ENGAGEMENT', `${metrics.engagement_score}%`], ['AUDIO SIGNALS', metrics.duration_seconds ? `${metrics.duration_seconds}s · ${metrics.pause_count ?? 0} pauses · ${metrics.silence_ratio_percent ?? 0}% silence` : 'Transcript mode']].map(([label, value]) => <div key={label} style={{ padding: '1.25rem', border: '1px solid var(--border-light)', background: '#fff' }}><div className="font-mono text-muted" style={{ fontSize: '.72rem' }}>{label}</div><div className="font-display" style={{ fontSize: '1.8rem', fontWeight: 900 }}>{value}</div></div>)}<div style={{ padding: '1.25rem', border: '1px solid var(--border-light)', background: '#fff', color: 'var(--text-secondary)' }}>Filler breakdown: {metrics.filler_words_list || 'None'}</div></div> : <div style={{ padding: '3rem', border: '1px dashed var(--border-light)', textAlign: 'center', color: 'var(--text-muted)' }}>Select a session and submit a transcript or audio recording to compute presentation analytics.</div>}</section></div></div></main></>;
}
