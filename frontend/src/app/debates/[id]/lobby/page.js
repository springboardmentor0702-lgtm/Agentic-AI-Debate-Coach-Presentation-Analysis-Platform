"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DebateStatusBadge, ParticipantList } from '../../../../components/debates/DebateSessionComponents';
import { formatDateTime, getCurrentUserFromToken, requestJson } from '../../../../lib/debateApi';

export default function DebateLobbyPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.id;
  const currentUser = useMemo(() => getCurrentUserFromToken(), []);
  const [session, setSession] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!currentUser?.user_id) {
      router.push('/login');
      return;
    }

    const load = async () => {
      const [sessionData, participantData] = await Promise.all([
        requestJson(`/api/v1/sessions/${sessionId}/details`, { method: 'GET' }),
        requestJson(`/api/v1/sessions/${sessionId}/participants`, { method: 'GET' }),
      ]);
      setSession(sessionData);
      setParticipants(participantData);
    };

    load();
  }, [currentUser, router, sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const socket = new WebSocket(`ws://localhost:8000/api/v1/sessions/ws/${sessionId}`);

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setEvents((current) => [{ id: Date.now(), ...parsed }, ...current].slice(0, 10));
      } catch {
        setEvents((current) => [{ id: Date.now(), event: event.data }, ...current].slice(0, 10));
      }
    };

    return () => socket.close();
  }, [sessionId]);

  const joinSession = async () => {
    await requestJson(`/api/v1/sessions/${sessionId}/join`, { method: 'POST' });
    const participantData = await requestJson(`/api/v1/sessions/${sessionId}/participants`, { method: 'GET' });
    setParticipants(participantData);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <Link href={`/debates/${sessionId}`} style={{ color: '#6b7280', fontWeight: 700 }}>← Back to details</Link>
          <h1 className="font-display" style={{ fontSize: '2.4rem', fontWeight: 900, marginTop: '0.75rem' }}>Debate Lobby</h1>
          {session ? <p style={{ color: '#4b5563', marginTop: '0.5rem' }}>{session.title}</p> : null}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {session ? <DebateStatusBadge status={session.status} /> : null}
          <span style={{ color: connected ? '#166534' : '#991b1b', fontWeight: 700 }}>{connected ? 'Live websocket connected' : 'Websocket disconnected'}</span>
          <button type="button" onClick={joinSession} className="btn btn-red">Join Lobby</button>
        </div>
      </div>

      {session ? <div style={{ color: '#6b7280', marginBottom: '1rem' }}>{formatDateTime(session.scheduled_at)} • {session.visibility} • {session.duration_minutes} min</div> : null}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.9fr', gap: '1.25rem' }}>
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '18px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Participants</h2>
          <ParticipantList participants={participants} />
        </section>

        <section style={{ background: '#111827', color: '#fff', borderRadius: '18px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Live Events</h2>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {events.length === 0 ? <div style={{ color: '#9ca3af' }}>Waiting for live events...</div> : null}
            {events.map((event) => (
              <div key={event.id} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.06)', borderRadius: '12px' }}>
                <div style={{ fontWeight: 700 }}>{event.event}</div>
                <div style={{ color: '#d1d5db', fontSize: '0.85rem' }}>{JSON.stringify(event)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}