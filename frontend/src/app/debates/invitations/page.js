"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DebateStatusBadge } from '../../../components/debates/DebateSessionComponents';
import { getCurrentUserFromToken, requestJson } from '../../../lib/debateApi';

export default function InvitationsPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!getCurrentUserFromToken()?.user_id) {
      router.push('/login');
      return;
    }

    const load = async () => {
      try {
        const data = await requestJson('/api/v1/sessions/invitations', { method: 'GET' });
        setInvitations(data);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const updateInvitation = async (invitationId, action) => {
    await requestJson(`/api/v1/sessions/invitations/${invitationId}/${action}`, { method: 'PATCH' });
    setInvitations((current) => current.filter((invitation) => invitation.id !== invitationId));
    setMessage(`Invitation ${action}d successfully.`);
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontWeight: 700, color: '#6b7280' }}>Loading invitations...</div>;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/debates" style={{ color: '#6b7280', fontWeight: 700 }}>← Back to debates</Link>
        <h1 className="font-display" style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '0.75rem' }}>My Invitations</h1>
      </div>

      {message ? <div style={{ marginBottom: '1rem', padding: '0.95rem 1rem', borderRadius: '12px', background: '#f3f4f6' }}>{message}</div> : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {invitations.length === 0 ? (
          <div style={{ padding: '2rem', borderRadius: '18px', border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280' }}>You do not have any debate invitations right now.</div>
        ) : invitations.map((invitation) => (
          <div key={invitation.id} style={{ border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem', background: '#fff', display: 'grid', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <DebateStatusBadge status={invitation.status} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.6rem' }}>Invitation #{invitation.id}</h3>
                <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>Position: {invitation.position || 'Unassigned'} {invitation.team ? `• ${invitation.team}` : ''}</div>
                <div style={{ color: '#4b5563', marginTop: '0.35rem' }}>{invitation.message || 'No message provided.'}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => updateInvitation(invitation.id, 'accept')} className="btn btn-red">Accept</button>
                <button type="button" onClick={() => updateInvitation(invitation.id, 'decline')} className="btn btn-login">Decline</button>
              </div>
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Sent from session #{invitation.session_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}