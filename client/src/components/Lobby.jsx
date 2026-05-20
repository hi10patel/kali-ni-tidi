import { useState } from 'react';

export default function Lobby({ lobby, isOwner, roomCode, onStart }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/room\/.*$/, '')}/room/${roomCode}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  }

  const enough = lobby.players.length >= 3;

  return (
    <div className="lobby">
      <div className="card-panel">
        <h2>Waiting for players</h2>
        <p className="muted">Share this link or code with friends:</p>

        <div className="share-row">
          <code className="code-big">{roomCode}</code>
          <button className="btn" onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
        </div>
        <div className="share-url" title={shareUrl}>{shareUrl}</div>

        <ul className="player-list">
          {lobby.players.map(p => (
            <li key={p.id} className={p.connected ? 'on' : 'off'}>
              <span className="dot" /> {p.name} {p.id === lobby.ownerId && <small>(host)</small>}
            </li>
          ))}
          {Array.from({ length: Math.max(0, 3 - lobby.players.length) }).map((_, i) => (
            <li key={`empty-${i}`} className="empty">Waiting for player…</li>
          ))}
        </ul>

        <p className="muted small">{lobby.players.length}/6 joined · need 3+ to start</p>

        {isOwner ? (
          <button className="btn primary big" disabled={!enough} onClick={onStart}>
            Start game
          </button>
        ) : (
          <p className="muted">Waiting for host to start the game…</p>
        )}
      </div>
    </div>
  );
}
