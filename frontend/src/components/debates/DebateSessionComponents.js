"use client";

import { useMemo, useState } from 'react';

const fieldStyle = {
  width: '100%',
  padding: '0.9rem 1rem',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  fontSize: '0.95rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#6b7280',
  marginBottom: '0.45rem',
};

export function DebateStatusBadge({ status }) {
  const palette = {
    Draft: { background: '#f3f4f6', color: '#111827' },
    Scheduled: { background: '#dbeafe', color: '#1d4ed8' },
    Live: { background: '#fee2e2', color: '#b91c1c' },
    Completed: { background: '#dcfce7', color: '#166534' },
    Cancelled: { background: '#fef3c7', color: '#92400e' },
    Active: { background: '#ede9fe', color: '#6d28d9' },
  };
  const style = palette[status] || palette.Draft;

  return (
    <span style={{ ...style, padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
      {status}
    </span>
  );
}

export function DebateFormatSelector({ value, onChange }) {
  const formats = [
    'One-on-One Debate',
    'Parliamentary Debate',
    'Oxford Debate',
    'Policy Debate',
    'Public Forum Debate',
    'AI Debate Simulation',
  ];

  return (
    <div>
      <label style={labelStyle}>Debate Format</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={fieldStyle}>
        {formats.map((format) => (
          <option key={format} value={format}>
            {format}
          </option>
        ))}
      </select>
    </div>
  );
}

export function SchedulePicker({ dateValue, timeValue, timezone, durationMinutes, onDateChange, onTimeChange, onTimezoneChange, onDurationChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>Date</label>
        <input type="date" value={dateValue} onChange={(e) => onDateChange(e.target.value)} style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Time</label>
        <input type="time" value={timeValue} onChange={(e) => onTimeChange(e.target.value)} style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Timezone</label>
        <input type="text" value={timezone} onChange={(e) => onTimezoneChange(e.target.value)} placeholder="UTC" style={fieldStyle} />
      </div>
      <div>
        <label style={labelStyle}>Duration (min)</label>
        <input type="number" min="5" step="5" value={durationMinutes} onChange={(e) => onDurationChange(Number(e.target.value))} style={fieldStyle} />
      </div>
    </div>
  );
}

export function PositionAssignment({ position, team, onPositionChange, onTeamChange }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
      <div>
        <label style={labelStyle}>Assigned Position</label>
        <select value={position} onChange={(e) => onPositionChange(e.target.value)} style={fieldStyle}>
          <option value="Affirmative">Affirmative</option>
          <option value="Negative">Negative</option>
          <option value="Neutral">Neutral</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Team</label>
        <input type="text" value={team} onChange={(e) => onTeamChange(e.target.value)} placeholder="Government / Opposition / Team A" style={fieldStyle} />
      </div>
    </div>
  );
}

export function ParticipantList({ participants = [], onRemove, canManage = false }) {
  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {participants.length === 0 ? (
        <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>No participants yet.</div>
      ) : (
        participants.map((participant) => (
          <div key={participant.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '14px', background: '#fff' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{participant.display_name || participant.invited_email || `User ${participant.user_id}`}</div>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {participant.position || 'Unassigned'} {participant.team ? `• ${participant.team}` : ''} {participant.is_active ? '• Active' : '• Left'}
              </div>
            </div>
            {canManage && onRemove ? (
              <button type="button" onClick={() => onRemove(participant)} style={{ border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', borderRadius: '10px', padding: '0.55rem 0.85rem', cursor: 'pointer', fontWeight: 700 }}>
                Remove
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

export function InviteUsersModal({ open, onClose, onInvite }) {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('Affirmative');
  const [team, setTeam] = useState('');
  const [message, setMessage] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => Boolean(userId || email), [userId, email]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onInvite({
        user_id: userId ? Number(userId) : null,
        email: email || null,
        position,
        team: team || null,
        message: message || null,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      setUserId('');
      setEmail('');
      setPosition('Affirmative');
      setTeam('');
      setMessage('');
      setExpiresAt('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(9, 9, 11, 0.55)', zIndex: 50, display: 'grid', placeItems: 'center', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ width: 'min(720px, 100%)', background: '#fff', borderRadius: '22px', padding: '1.5rem', border: '1px solid #e5e7eb', boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.25rem' }}>Invite Users</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Invite by user ID or email. You can assign a position and team immediately.</p>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>×</button>
        </div>

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>User ID</label>
              <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Optional if inviting by email" style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional if inviting by user ID" style={fieldStyle} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Position</label>
              <select value={position} onChange={(e) => setPosition(e.target.value)} style={fieldStyle}>
                <option value="Affirmative">Affirmative</option>
                <option value="Negative">Negative</option>
                <option value="Government">Government</option>
                <option value="Opposition">Opposition</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Team</label>
              <input value={team} onChange={(e) => setTeam(e.target.value)} placeholder="Optional team label" style={fieldStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <div>
            <label style={labelStyle}>Invitation Expiry</label>
            <input type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
          <button type="button" onClick={onClose} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit || submitting} style={{ padding: '0.75rem 1rem', borderRadius: '10px', border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontWeight: 700, opacity: !canSubmit || submitting ? 0.65 : 1 }}>
            {submitting ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function RecordingPanel({ recordings = [], onSubmit }) {
  const [recordingType, setRecordingType] = useState('audio');
  const [durationSeconds, setDurationSeconds] = useState('');
  const [transcript, setTranscript] = useState('');
  const [recordingPath, setRecordingPath] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        recordingType,
        durationSeconds: durationSeconds ? Number(durationSeconds) : null,
        transcript,
        recordingPath,
        file,
      });
      setRecordingType('audio');
      setDurationSeconds('');
      setTranscript('');
      setRecordingPath('');
      setFile(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem' }}>Recording Panel</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Recording Type</label>
            <select value={recordingType} onChange={(e) => setRecordingType(e.target.value)} style={fieldStyle}>
              <option value="audio">Audio</option>
              <option value="video">Video</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Duration (seconds)</label>
            <input value={durationSeconds} onChange={(e) => setDurationSeconds(e.target.value)} type="number" min="0" step="1" style={fieldStyle} />
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Recording Path</label>
          <input value={recordingPath} onChange={(e) => setRecordingPath(e.target.value)} placeholder="Optional existing path" style={fieldStyle} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Transcript</label>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={4} style={{ ...fieldStyle, resize: 'vertical' }} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Upload File</label>
          <input type="file" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={fieldStyle} />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button type="submit" style={{ padding: '0.8rem 1.1rem', borderRadius: '10px', border: 'none', background: '#b91c1c', color: '#fff', fontWeight: 700, cursor: 'pointer' }} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Recording'}
          </button>
        </div>
      </form>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {recordings.length === 0 ? (
          <div style={{ color: '#6b7280', fontSize: '0.95rem' }}>No recordings uploaded yet.</div>
        ) : (
          recordings.map((recording) => (
            <div key={recording.id} style={{ border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1rem', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem' }}>
                <strong>{recording.recording_type}</strong>
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{recording.duration_seconds ? `${recording.duration_seconds}s` : 'No duration'}</span>
              </div>
              <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{recording.recording_path || 'No saved path'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}