"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DebateStatusBadge, InvitationsModal } from '../../components/debates/DebateSessionComponents';
import { formatDateTime, getCurrentUserFromToken, requestJson } from '../../lib/debateApi';

export default function DebateListPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [invitationModalOpen, setInvitationModalOpen] = useState(false);
  const [sentInvitations, setSentInvitations] = useState([]);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [invitationError, setInvitationError] = useState('');

  useEffect(() => {
    const currentUser = getCurrentUserFromToken();
    if (!currentUser?.user_id) {
      router.push('/login');
      return;
    }

    const loadSessions = async () => {
      try {
        const data = await requestJson(`/api/v1/sessions/user/${currentUser.user_id}`, { method: 'GET' });
        setSessions(data);
      } catch (err) {
        setError('Unable to load debate sessions.');
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [router]);

  const handleDelete = async (sessionId) => {
    if (!confirm('Delete this debate session?')) return;
    try {
      await requestJson(`/api/v1/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setMessage('Debate session deleted successfully.');
    } catch (err) {
      setError('Failed to delete debate session.');
    }
  };

  const loadInvitations = async () => {
    setInvitationModalOpen(true);
    setInvitationLoading(true);
    setInvitationError('');
    try {
      const [sent, received] = await Promise.all([
        requestJson('/api/v1/sessions/invitations?scope=sent', { method: 'GET' }),
        requestJson('/api/v1/sessions/invitations?scope=received', { method: 'GET' }),
      ]);
      setSentInvitations(sent);
      setReceivedInvitations(received);
    } catch (err) {
      setInvitationError('Unable to load invitations.');
    } finally {
      setInvitationLoading(false);
    }
  };

  const refreshInvitations = async () => {
    await loadInvitations();
  };

  const handleAcceptInvitation = async (invitation) => {
    await requestJson(`/api/v1/sessions/invitations/${invitation.id}/accept`, { method: 'PATCH' });
    await refreshInvitations();
  };

  const handleDeclineInvitation = async (invitation) => {
    await requestJson(`/api/v1/sessions/invitations/${invitation.id}/decline`, { method: 'PATCH' });
    await refreshInvitations();
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#6b7280' }}>Loading debate sessions...</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div className="badge-red-pill">Debate Session Management</div>
          <h1 className="font-display" style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '0.5rem' }}>Debate List</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button type="button" onClick={loadInvitations} className="btn btn-login">Invitations</button>
          <Link href="/debates/new" className="btn btn-dark">Create Debate</Link>
        </div>
      </div>

      {message ? <div style={{ background: '#dcfce7', color: '#166534', padding: '0.9rem 1rem', borderRadius: '12px', marginBottom: '1rem' }}>{message}</div> : null}
      {error ? <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.9rem 1rem', borderRadius: '12px', marginBottom: '1rem' }}>{error}</div> : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {sessions.length === 0 ? (
          <div style={{ padding: '2rem', border: '1px solid #e5e7eb', borderRadius: '18px', background: '#fff', color: '#6b7280' }}>No debate sessions found.</div>
        ) : sessions.map((session) => (
          <div key={session.id} style={{ border: '1px solid #e5e7eb', borderRadius: '18px', background: '#fff', padding: '1.25rem', display: 'grid', gap: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <DebateStatusBadge status={session.status} />
                  <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>{session.format}</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.25rem' }}>{session.title}</h3>
                <p style={{ color: '#4b5563', marginBottom: '0.35rem' }}>{session.topic}</p>
                <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>{formatDateTime(session.scheduled_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href={`/debates/${session.id}`} className="btn btn-login">Details</Link>
                <Link href={`/debates/${session.id}/edit`} className="btn btn-login">Edit</Link>
                <Link href={`/debates/${session.id}/lobby`} className="btn btn-red">Lobby</Link>
                <button type="button" onClick={() => handleDelete(session.id)} className="btn btn-dark">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <InvitationsModal
        open={invitationModalOpen}
        onClose={() => setInvitationModalOpen(false)}
        sentInvitations={sentInvitations}
        receivedInvitations={receivedInvitations}
        loading={invitationLoading}
        error={invitationError}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        onRefresh={refreshInvitations}
      />
    </div>
  );
}