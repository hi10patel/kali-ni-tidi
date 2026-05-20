import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, emitWithAck } from '../socket.js';

const STORAGE_NAME = 'knt.name';

export default function Home() {
  const [name, setName] = useState(() => localStorage.getItem(STORAGE_NAME) || '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function saveName(n) {
    setName(n);
    localStorage.setItem(STORAGE_NAME, n);
  }

  async function createRoom() {
    if (!name.trim()) return setError('Enter your name');
    setBusy(true);
    setError('');
    const resp = await emitWithAck('create_room', { name: name.trim() });
    setBusy(false);
    if (resp.error) return setError(resp.error);
    localStorage.setItem(`knt.room.${resp.roomCode}`, resp.playerId);
    navigate(`/room/${resp.roomCode}`);
  }

  async function joinRoom() {
    const clean = code.trim().toUpperCase();
    if (!name.trim()) return setError('Enter your name');
    if (clean.length !== 6) return setError('Enter a 6-character room code');
    setBusy(true);
    setError('');
    const resp = await emitWithAck('join_room', { roomCode: clean, name: name.trim() });
    setBusy(false);
    if (resp.error) return setError(resp.error);
    localStorage.setItem(`knt.room.${resp.roomCode}`, resp.playerId);
    navigate(`/room/${resp.roomCode}`);
  }

  return (
    <div className="screen home">
      <header className="home-header">
        <div className="logo">3♠</div>
        <h1>Kali ni Tidi</h1>
        <p className="subtitle">3 of Spades — the classic Gujarati trick-taking game</p>
      </header>

      <section className="card-panel">
        <label className="field">
          <span>Your name</span>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="e.g. Hitesh"
            maxLength={20}
            autoComplete="off"
          />
        </label>

        <button className="btn primary" onClick={createRoom} disabled={busy}>
          Create new room
        </button>

        <div className="or">— or —</div>

        <label className="field">
          <span>Room code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            autoCapitalize="characters"
            autoComplete="off"
          />
        </label>
        <button className="btn" onClick={joinRoom} disabled={busy}>
          Join room
        </button>

        {error && <div className="error">{error}</div>}
      </section>

      <footer className="hint">
        3–6 players · Bid 150–250 · 3♠ beats everything
      </footer>
    </div>
  );
}
