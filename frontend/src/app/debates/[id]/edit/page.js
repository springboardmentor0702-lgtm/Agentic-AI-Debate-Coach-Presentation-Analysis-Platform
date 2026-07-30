"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DebateFormatSelector, PositionAssignment, SchedulePicker } from '../../../../components/debates/DebateSessionComponents';
import { combineDateAndTime, getCurrentUserFromToken, requestJson } from '../../../../lib/debateApi';

export default function EditDebatePage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    title: '',
    topic: '',
    description: '',
    format: 'AI Debate Simulation',
    assigned_position: 'Affirmative',
    date: '',
    time: '',
    timezone: 'UTC',
    duration_minutes: 60,
    visibility: 'Private',
    team: 'Creator',
  });

  useEffect(() => {
    if (!getCurrentUserFromToken()?.user_id) {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const data = await requestJson(`/api/v1/sessions/${sessionId}/details`, { method: 'GET' });
        const scheduled = data.scheduled_at ? new Date(data.scheduled_at) : null;
        setForm({
          title: data.title || '',
          topic: data.topic || '',
          description: data.description || '',
          format: data.format || 'AI Debate Simulation',
          assigned_position: data.assigned_position || 'Affirmative',
          date: scheduled ? scheduled.toISOString().slice(0, 10) : '',
          time: scheduled ? scheduled.toISOString().slice(11, 16) : '',
          timezone: data.timezone || 'UTC',
          duration_minutes: data.duration_minutes || 60,
          visibility: data.visibility || 'Private',
          team: 'Creator',
        });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router, sessionId]);

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = {
        title: form.title,
        topic: form.topic,
        description: form.description,
        format: form.format,
        assigned_position: form.assigned_position,
        scheduled_at: combineDateAndTime(form.date, form.time),
        timezone: form.timezone,
        duration_minutes: Number(form.duration_minutes),
        visibility: form.visibility,
      };

      await requestJson(`/api/v1/sessions/${sessionId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setMessage('Debate session updated successfully.');
      router.push(`/debates/${sessionId}`);
    } catch (error) {
      setMessage('Failed to update the debate session.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#6b7280' }}>Loading debate...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <Link href={`/debates/${sessionId}`} style={{ color: '#6b7280', fontWeight: 700 }}>← Back to debate details</Link>
        <h1 className="font-display" style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '0.75rem' }}>Edit Debate</h1>
      </div>

      {message ? <div style={{ marginBottom: '1rem', padding: '0.95rem 1rem', borderRadius: '12px', background: '#f3f4f6' }}>{message}</div> : null}

      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '22px', padding: '1.5rem', display: 'grid', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.45rem', color: '#6b7280' }}>Title</label>
            <input value={form.title} onChange={(e) => updateField('title', e.target.value)} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }} required />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.45rem', color: '#6b7280' }}>Visibility</label>
            <select value={form.visibility} onChange={(e) => updateField('visibility', e.target.value)} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb' }}>
              <option value="Private">Private</option>
              <option value="Unlisted">Unlisted</option>
              <option value="Public">Public</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.45rem', color: '#6b7280' }}>Topic</label>
          <textarea value={form.topic} onChange={(e) => updateField('topic', e.target.value)} rows={4} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb', resize: 'vertical' }} required />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.45rem', color: '#6b7280' }}>Description</label>
          <textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} rows={3} style={{ width: '100%', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb', resize: 'vertical' }} />
        </div>

        <DebateFormatSelector value={form.format} onChange={(value) => updateField('format', value)} />
        <SchedulePicker
          dateValue={form.date}
          timeValue={form.time}
          timezone={form.timezone}
          durationMinutes={form.duration_minutes}
          onDateChange={(value) => updateField('date', value)}
          onTimeChange={(value) => updateField('time', value)}
          onTimezoneChange={(value) => updateField('timezone', value)}
          onDurationChange={(value) => updateField('duration_minutes', value)}
        />
        <PositionAssignment
          position={form.assigned_position}
          team={form.team}
          onPositionChange={(value) => updateField('assigned_position', value)}
          onTeamChange={(value) => updateField('team', value)}
        />

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          <Link href={`/debates/${sessionId}`} className="btn btn-login">Cancel</Link>
          <button type="submit" className="btn btn-dark" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}