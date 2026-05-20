import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home.jsx';
import Room from './components/Room.jsx';
import { onConnectionChange } from './socket.js';

export default function App() {
  const [connected, setConnected] = useState(true);

  useEffect(() => onConnectionChange(setConnected), []);

  return (
    <>
      {!connected && (
        <div className="conn-banner">
          ⚠ Cannot reach game server. Make sure <code>node index.js</code> is running in <code>/server</code>.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
