import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { socket, emitWithAck } from '../socket.js';
import Lobby from './Lobby.jsx';
import Bidding from './Bidding.jsx';
import TrumpSelection from './TrumpSelection.jsx';
import PartnerDeclaration from './PartnerDeclaration.jsx';
import TrickPlay from './TrickPlay.jsx';
import ScoreScreen from './ScoreScreen.jsx';

export default function Room() {
  const { code } = useParams();
  const roomCode = (code || '').toUpperCase();
  const navigate = useNavigate();

  const [lobby, setLobby] = useState(null);
  const [game, setGame] = useState(null);
  const [playerId, setPlayerId] = useState(localStorage.getItem(`knt.room.${roomCode}`) || null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function attach() {
      const storedId = localStorage.getItem(`knt.room.${roomCode}`);
      const storedName = localStorage.getItem('knt.name') || '';
      const resp = await emitWithAck('join_room', {
        roomCode,
        name: storedName,
        playerId: storedId || undefined,
      });
      if (cancelled) return;
      if (resp.error) {
        setError(resp.error);
        return;
      }
      localStorage.setItem(`knt.room.${roomCode}`, resp.playerId);
      setPlayerId(resp.playerId);
    }

    function onRoomUpdate(payload) {
      setLobby(payload);
      if (!payload.gameStarted) setGame(null);
    }
    function onGameState(state) {
      setGame(state);
    }
    function onConnect() {
      attach();
    }

    socket.on('room_update', onRoomUpdate);
    socket.on('game_state', onGameState);
    socket.on('connect', onConnect);

    if (socket.connected) attach();

    return () => {
      cancelled = true;
      socket.off('room_update', onRoomUpdate);
      socket.off('game_state', onGameState);
      socket.off('connect', onConnect);
    };
  }, [roomCode]);

  function flashToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2200);
  }

  async function action(event, payload) {
    const resp = await emitWithAck(event, payload);
    if (resp && resp.error) flashToast(resp.error);
    return resp;
  }

  function leave() {
    socket.emit('leave_room');
    localStorage.removeItem(`knt.room.${roomCode}`);
    navigate('/');
  }

  if (error) {
    return (
      <div className="screen center">
        <h2>Could not join</h2>
        <p className="error">{error}</p>
        <button className="btn" onClick={() => navigate('/')}>Back to home</button>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="screen center">
        <p>Connecting…</p>
      </div>
    );
  }

  const me = lobby.players.find(p => p.id === playerId);
  const isOwner = lobby.ownerId === playerId;

  let body;
  if (!game) {
    body = (
      <Lobby
        lobby={lobby}
        isOwner={isOwner}
        roomCode={roomCode}
        onStart={() => action('start_game')}
      />
    );
  } else if (game.state === 'bidding') {
    body = <Bidding game={game} playerId={playerId} action={action} />;
  } else if (game.state === 'trump') {
    body = <TrumpSelection game={game} playerId={playerId} action={action} />;
  } else if (game.state === 'partner') {
    body = <PartnerDeclaration game={game} playerId={playerId} action={action} />;
  } else if (game.state === 'playing') {
    body = <TrickPlay game={game} playerId={playerId} action={action} />;
  } else if (game.state === 'finished') {
    body = (
      <ScoreScreen
        game={game}
        isOwner={isOwner}
        onPlayAgain={() => action('play_again')}
      />
    );
  }

  return (
    <div className="screen room">
      <header className="room-header">
        <div className="room-code">Room {roomCode}</div>
        <div className="room-name">{me ? me.name : ''}</div>
        <button className="btn-link" onClick={leave}>Leave</button>
      </header>
      {body}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
