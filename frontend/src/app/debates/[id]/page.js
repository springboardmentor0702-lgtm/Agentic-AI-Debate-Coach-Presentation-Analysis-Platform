"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DebateStatusBadge, InviteUsersModal, ParticipantList, RecordingPanel } from '../../../components/debates/DebateSessionComponents';
import { formatDateTime, getCurrentUserFromToken, requestForm, requestJson } from '../../../lib/debateApi';

export default function DebateDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id;
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const currentUser = useMemo(() => getCurrentUserFromToken(), []);

  useEffect(() => {
    if (!currentUser?.user_id) {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const [sessionData, participantData, recordingData] = await Promise.all([
          requestJson(`/api/v1/sessions/${sessionId}/details`, { method: 'GET' }),
          requestJson(`/api/v1/sessions/${sessionId}/participants`, { method: 'GET' }),
          requestJson(`/api/v1/sessions/${sessionId}/recordings`, { method: 'GET' }),
        ]);
        setSession(sessionData);
        setParticipants(participantData);
        setRecordings(recordingData);
      } catch (error) {
        setNotice('Unable to load debate session details.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [currentUser, router, sessionId]);

  const isOwner = session && currentUser && session.user_id === currentUser.user_id;
  const statusActions = {
    Active: ['Draft', 'Scheduled', 'Live', 'Completed', 'Cancelled'],
    Draft: ['Scheduled', 'Cancelled'],
    Scheduled: ['Live', 'Completed', 'Cancelled', 'Draft'],
    Live: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: [],
  };
  const statusButton = (status, label, className) => (
    isOwner && statusActions[session.status]?.includes(status) ? (
      <button type="button" onClick={() => handleStatusChange(status)} className={className}>
        {label}
      </button>
    ) : null
  );

  const refreshData = async () => {
    const [sessionData, participantData, recordingData] = await Promise.all([
      requestJson(`/api/v1/sessions/${sessionId}/details`, { method: 'GET' }),
      requestJson(`/api/v1/sessions/${sessionId}/participants`, { method: 'GET' }),
      requestJson(`/api/v1/sessions/${sessionId}/recordings`, { method: 'GET' }),
    ]);
    setSession(sessionData);
    setParticipants(participantData);
    setRecordings(recordingData);
  };

  const handleStatusChange = async (status) => {
    await requestJson(`/api/v1/sessions/${sessionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    setNotice(`Session status updated to ${status}.`);
    await refreshData();
  };

  const handleJoin = async () => {
    await requestJson(`/api/v1/sessions/${sessionId}/join`, { method: 'POST' });
    setNotice('Joined debate session.');
    await refreshData();
  };

  const handleLeave = async () => {
    await requestJson(`/api/v1/sessions/${sessionId}/leave`, { method: 'POST' });
    setNotice('Left debate session.');
    await refreshData();
  };

  const handleInvite = async (payload) => {
    await requestJson(`/api/v1/sessions/${sessionId}/invite`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setNotice('Invitation sent.');
    await refreshData();
  };

  const handleRemoveParticipant = async (participant) => {
    await requestJson(`/api/v1/sessions/${sessionId}/participants/${participant.id}`, { method: 'DELETE' });
    setNotice('Participant removed.');
    await refreshData();
  };

  const handleRecordingSubmit = async ({ recordingType, durationSeconds, transcript, recordingPath, file }) => {
    const formData = new FormData();
    formData.append('recording_type', recordingType);
    if (durationSeconds !== null && durationSeconds !== undefined) formData.append('duration_seconds', String(durationSeconds));
    if (transcript) formData.append('transcript', transcript);
    if (recordingPath) formData.append('recording_path', recordingPath);
    if (file) formData.append('file', file);

    await requestForm(`/api/v1/sessions/${sessionId}/recording`, formData, { method: 'POST' });
    setNotice('Recording saved.');
    await refreshData();
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#6b7280' }}>Loading debate details...</div>;
  }

  if (!session) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Debate session not found.</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <Link href="/debates" style={{ color: '#6b7280', fontWeight: 700 }}>← Back to debates</Link>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <DebateStatusBadge status={session.status} />
            <span style={{ color: '#6b7280' }}>{session.format}</span>
          </div>
          <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, margin: '0.5rem 0' }}>{session.title}</h1>
          <p style={{ color: '#4b5563', maxWidth: '900px' }}>{session.topic}</p>
          {session.description ? <p style={{ color: '#6b7280', marginTop: '0.75rem' }}>{session.description}</p> : null}
          <div style={{ marginTop: '1rem', color: '#6b7280', fontSize: '0.9rem' }}>
            Scheduled: {formatDateTime(session.scheduled_at)} • {session.duration_minutes} min • {session.timezone} • {session.visibility}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isOwner ? <button type="button" onClick={() => setInviteOpen(true)} className="btn btn-red">Invite Users</button> : null}
          <Link href={`/debates/${session.id}/edit`} className="btn btn-login">Edit</Link>
          <Link href={`/debates/${session.id}/lobby`} className="btn btn-dark">Lobby</Link>
        </div>
      </div>

      {notice ? <div style={{ marginBottom: '1rem', padding: '0.95rem 1rem', borderRadius: '12px', background: '#f3f4f6' }}>{notice}</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '1.25rem' }}>
        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Debate Controls</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button type="button" onClick={handleJoin} className="btn btn-login">Join</button>
              <button type="button" onClick={handleLeave} className="btn btn-login">Leave</button>
              {statusButton('Draft', 'Draft', 'btn btn-login')}
              {statusButton('Scheduled', 'Schedule', 'btn btn-login')}
              {statusButton('Live', 'Start Debate', 'btn btn-red')}
              {statusButton('Completed', 'End Debate', 'btn btn-dark')}
              {statusButton('Cancelled', 'Cancel', 'btn btn-login')}
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Participants</h2>
              <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>{participants.length} total</span>
            </div>
            <ParticipantList participants={participants} canManage={isOwner} creatorUserId={session.user_id} onRemove={handleRemoveParticipant} />
          </section>

          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
            <RecordingPanel recordings={recordings} onSubmit={handleRecordingSubmit} />
          </section>
        </div>

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <section style={{ background: '#111827', color: '#fff', borderRadius: '18px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>Session Summary</h2>
            <div style={{ display: 'grid', gap: '0.75rem', fontSize: '0.92rem', color: '#e5e7eb' }}>
              <div><strong>Creator:</strong> User #{session.user_id}</div>
              <div><strong>Format:</strong> {session.format}</div>
              <div><strong>Position:</strong> {session.assigned_position}</div>
              <div><strong>Duration:</strong> {session.duration_minutes} minutes</div>
              <div><strong>Timezone:</strong> {session.timezone}</div>
              <div><strong>Visibility:</strong> {session.visibility}</div>
            </div>
          </section>

          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>Quick Links</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <Link href={`/debates/${session.id}/edit`} className="btn btn-login">Edit Debate</Link>
              <Link href={`/debates/${session.id}/lobby`} className="btn btn-login">Enter Lobby</Link>
            </div>
          </section>
        </div>
      </div>

      <InviteUsersModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={handleInvite} />
    </div>
  );
}