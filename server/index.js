const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Game } = require('./game/game');

const app = express();
app.use(cors());
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'] },
});

app.get('/', (_req, res) => res.send('Kali ni Tidi server is running.'));
app.get('/health', (_req, res) => res.json({ ok: true, rooms: Object.keys(rooms).length }));

const rooms = {};
const socketToRoom = {};

function genId(len = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function genRoomCode() {
  let code;
  do {
    code = '';
    for (let i = 0; i < 6; i++) code += 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)];
  } while (rooms[code]);
  return code;
}

function broadcastRoom(roomCode) {
  const room = rooms[roomCode];
  if (!room) return;
  const lobby = {
    roomCode,
    ownerId: room.ownerId,
    players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    gameStarted: !!room.game,
  };
  for (const player of room.players) {
    if (!player.socketId) continue;
    const sock = io.sockets.sockets.get(player.socketId);
    if (!sock) continue;
    sock.emit('room_update', lobby);
    if (room.game) sock.emit('game_state', room.game.view(player.id));
  }
}

function ackErr(ack, msg) {
  if (typeof ack === 'function') ack({ error: msg });
}
function ackOk(ack, payload = {}) {
  if (typeof ack === 'function') ack({ ok: true, ...payload });
}

io.on('connection', (socket) => {
  socket.on('create_room', (payload, ack) => {
    const name = (payload && payload.name || '').trim();
    if (!name) return ackErr(ack, 'Name required');
    const roomCode = genRoomCode();
    const playerId = genId();
    rooms[roomCode] = {
      players: [{ id: playerId, name, socketId: socket.id, connected: true }],
      game: null,
      ownerId: playerId,
    };
    socketToRoom[socket.id] = { roomCode, playerId };
    ackOk(ack, { roomCode, playerId });
    broadcastRoom(roomCode);
  });

  socket.on('join_room', (payload, ack) => {
    const roomCode = (payload && payload.roomCode || '').toUpperCase();
    const name = (payload && payload.name || '').trim();
    const playerId = payload && payload.playerId;
    const room = rooms[roomCode];
    if (!room) return ackErr(ack, 'Room not found');

    let player = playerId ? room.players.find(p => p.id === playerId) : null;
    if (player) {
      player.socketId = socket.id;
      player.connected = true;
      socketToRoom[socket.id] = { roomCode, playerId: player.id };
    } else {
      if (room.game) return ackErr(ack, 'Game already in progress');
      if (room.players.length >= 6) return ackErr(ack, 'Room is full');
      if (!name) return ackErr(ack, 'Name required');
      const newId = genId();
      player = { id: newId, name, socketId: socket.id, connected: true };
      room.players.push(player);
      socketToRoom[socket.id] = { roomCode, playerId: newId };
    }
    ackOk(ack, { roomCode, playerId: player.id });
    broadcastRoom(roomCode);
  });

  socket.on('leave_room', () => {
    handleDisconnect(socket, true);
  });

  // A client whose tab was backgrounded (iOS Safari especially) may have missed
  // broadcasts while suspended. They can call this on visibility-restore to pull
  // the freshest room + game state for themselves only — no broadcast to others.
  socket.on('request_state', () => {
    const meta = socketToRoom[socket.id];
    if (!meta) return;
    const room = rooms[meta.roomCode];
    if (!room) return;
    socket.emit('room_update', {
      roomCode: meta.roomCode,
      ownerId: room.ownerId,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
      gameStarted: !!room.game,
    });
    if (room.game) socket.emit('game_state', room.game.view(meta.playerId));
  });

  socket.on('start_game', (_payload, ack) => {
    const meta = socketToRoom[socket.id];
    if (!meta) return ackErr(ack, 'Not in a room');
    const room = rooms[meta.roomCode];
    if (!room) return ackErr(ack, 'Room missing');
    if (room.ownerId !== meta.playerId) return ackErr(ack, 'Only owner can start');
    if (room.players.length < 3 || room.players.length > 6) return ackErr(ack, 'Need 3-6 players');
    if (room.game && room.game.state !== 'finished') return ackErr(ack, 'Game in progress');
    room.game = new Game(meta.roomCode, room.players.map(p => ({ id: p.id, name: p.name })));
    ackOk(ack);
    broadcastRoom(meta.roomCode);
  });

  socket.on('place_bid', (payload, ack) => withGame(socket, ack, (room) => {
    const amt = payload && payload.bidAmount;
    room.game.placeBid(socketToRoom[socket.id].playerId, amt);
  }));

  socket.on('pass_bid', (_payload, ack) => withGame(socket, ack, (room) => {
    room.game.placeBid(socketToRoom[socket.id].playerId, 'pass');
  }));

  socket.on('select_trump', (payload, ack) => withGame(socket, ack, (room) => {
    const suit = payload && payload.suit;
    room.game.selectTrump(socketToRoom[socket.id].playerId, suit);
  }));

  socket.on('declare_partner', (payload, ack) => withGame(socket, ack, (room) => {
    const cardIds = (payload && payload.cardIds) || [];
    room.game.declarePartners(socketToRoom[socket.id].playerId, cardIds);
  }));

  socket.on('play_card', (payload, ack) => withGame(socket, ack, (room) => {
    const cid = payload && payload.cardId;
    room.game.playCard(socketToRoom[socket.id].playerId, cid);
  }));

  socket.on('play_again', (_payload, ack) => {
    const meta = socketToRoom[socket.id];
    if (!meta) return ackErr(ack, 'Not in a room');
    const room = rooms[meta.roomCode];
    if (!room) return ackErr(ack, 'Room missing');
    if (room.ownerId !== meta.playerId) return ackErr(ack, 'Only owner can restart');
    if (!room.game || room.game.state !== 'finished') return ackErr(ack, 'Game not finished');
    room.game = new Game(meta.roomCode, room.players.map(p => ({ id: p.id, name: p.name })));
    ackOk(ack);
    broadcastRoom(meta.roomCode);
  });

  socket.on('disconnect', () => handleDisconnect(socket, false));
});

function withGame(socket, ack, fn) {
  const meta = socketToRoom[socket.id];
  if (!meta) return ackErr(ack, 'Not in a room');
  const room = rooms[meta.roomCode];
  if (!room || !room.game) return ackErr(ack, 'No active game');
  try {
    fn(room);
    ackOk(ack);
    broadcastRoom(meta.roomCode);
  } catch (e) {
    ackErr(ack, e.message);
  }
}

function handleDisconnect(socket, leaving) {
  const meta = socketToRoom[socket.id];
  if (!meta) return;
  delete socketToRoom[socket.id];
  const room = rooms[meta.roomCode];
  if (!room) return;
  const player = room.players.find(p => p.id === meta.playerId);
  if (player) {
    player.socketId = null;
    player.connected = false;
  }
  if (!room.game || leaving) {
    room.players = room.players.filter(p => p.id !== meta.playerId);
    if (room.ownerId === meta.playerId && room.players.length > 0) {
      room.ownerId = room.players[0].id;
    }
    if (room.players.length === 0) {
      delete rooms[meta.roomCode];
      return;
    }
  }
  broadcastRoom(meta.roomCode);
}

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Kali ni Tidi server listening on :${PORT}`);
});
