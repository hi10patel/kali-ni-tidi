import { io } from 'socket.io-client';

function resolveServerUrl() {
  // 1. Explicit override (production): VITE_SERVER_URL=https://yourapi.railway.app
  if (import.meta.env.VITE_SERVER_URL) return import.meta.env.VITE_SERVER_URL;
  // 2. Same-LAN dev: use whatever host the page was served from on port 3001.
  //    This lets a phone hitting http://192.168.1.42:5173 reach the server
  //    at http://192.168.1.42:3001 — not localhost (which is the phone itself).
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const proto = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${proto}//${window.location.hostname}:3001`;
  }
  return 'http://localhost:3001';
}

const SERVER_URL = resolveServerUrl();

export const socket = io(SERVER_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnectionDelay: 800,
  reconnectionDelayMax: 4000,
});

// Emit with ack, but bail out after `timeoutMs` so a dead server doesn't
// leave the UI hanging forever. Returns { error: '...' } on timeout.
export function emitWithAck(event, payload, timeoutMs = 6000) {
  return new Promise((resolve) => {
    if (!socket.connected) {
      // Give socket.io a brief window to come up; otherwise surface a clear error.
      const waitDeadline = Date.now() + Math.min(timeoutMs, 2500);
      const tryEmit = () => {
        if (socket.connected) return doEmit();
        if (Date.now() >= waitDeadline) {
          return resolve({ error: 'Cannot reach game server. Is it running on ' + SERVER_URL + '?' });
        }
        setTimeout(tryEmit, 200);
      };
      tryEmit();
      return;
    }
    doEmit();

    function doEmit() {
      let done = false;
      const t = setTimeout(() => {
        if (done) return;
        done = true;
        resolve({ error: 'Server did not respond in time.' });
      }, timeoutMs);
      socket.emit(event, payload, (resp) => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(resp || {});
      });
    }
  });
}

// Lightweight subscription helper for connection state.
export function onConnectionChange(cb) {
  const handleConnect = () => cb(true);
  const handleDisconnect = () => cb(false);
  socket.on('connect', handleConnect);
  socket.on('disconnect', handleDisconnect);
  // Fire initial
  cb(socket.connected);
  return () => {
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
  };
}
