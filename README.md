# Kali ni Tidi (3 of Spades)

A real-time multiplayer web implementation of **Kali ni Tidi** (a.k.a. *Kaali Teeri* / *3 of Spades*), the classic Gujarati trick-taking card game. Built mobile-first — open the share link on any phone, no install needed.

- **3–6 players**, auto-balanced teams
- 52-card deck with player-count-dependent culls; **3♠ is always the supreme card (30 points)**
- Bidding (150–250), trump selection, secret-partner declaration, trick play, scoring
- Real-time via Socket.io — server holds the truth, clients just render

## Stack

- **Client**: React 18 + Vite + Socket.io-client, React Router
- **Server**: Node.js + Express + Socket.io (in-memory state, no DB)

## Project structure

```
/client          React (Vite) frontend
/server          Node + Socket.io game server
README.md
```

## Running locally

You need Node 18+.

### Server

```bash
cd server
npm install
node index.js
# Kali ni Tidi server listening on :3001
```

The server listens on `PORT` (default `3001`). It exposes:
- `GET /` and `GET /health` — sanity check
- A Socket.io endpoint on the same port

### Client

```bash
cd client
npm install
npm run dev
# Vite dev server on http://localhost:5173
```

By default the client connects to `http://localhost:3001`. Override with:

```bash
echo "VITE_SERVER_URL=http://localhost:3001" > .env.local
```

Open the dev server URL on your laptop, then on your phone (same Wi-Fi) hit `http://<your-laptop-ip>:5173`. Create a room on one device, copy the room code or link to the other, and you're in.

## Game rules — quick reference

### Deck

| Players | Removed from deck                         | Cards | Deal       |
|--------:|-------------------------------------------|------:|------------|
| 3       | 2s, 3s (except 3♠), 4s                    |    41 | round-robin (some get +1) |
| 4       | 2s, 3s (except 3♠), 4s                    |    41 | round-robin (some get +1) |
| 5       | 2s, 3s (except 3♠)                        |    45 | 9 each     |
| 6       | 2s                                        |    48 | 8 each     |

**3♠ is always in the deck regardless of player count.**

### Points

- A, K, Q, J, 10 = **10 points** each
- 5 = **5 points**
- 3♠ = **30 points**
- All other cards = 0
- Total deck = **250 points**

### Card rank (high → low)

`3♠` (supreme) > A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 (non-spade)

### Teams

| Players | Teams                                |
|--------:|--------------------------------------|
| 3       | 2 vs 1                               |
| 4       | 2 vs 2                               |
| 5       | bidder names 2 cards → 3 vs 2 or 2 vs 3 |
| 6       | bidder names 2 cards → 3 vs 3 or 2 vs 4 |

### Flow

1. **Bidding**: each player in order may bid 150–250 (multiples of 10) or pass. Bid must exceed the current highest. If all pass, player 1 is forced to bid 150.
2. **Trump**: winning bidder picks a suit.
3. **Partner declaration**: bidder names 1 card (3–4 players) or 2 cards (5–6 players) that they don't hold. Whoever holds them is their secret partner. Identity hidden until the card is played.
4. **Trick play**: bidder leads first trick. Must follow led suit if possible; otherwise play any card (including trump). 3♠ beats everything. Trump beats non-trump. Within the same suit, higher rank wins. Winner leads the next trick.
5. **Partner reveal**: when a partner card hits the table, that player is publicly revealed and their tricks count for the bidding team going forward.
6. **Scoring**: total all points won by the bidding team (bidder + all partners, revealed or not). If ≥ bid → bidding team wins; otherwise opponents win.

## Multiplayer flow

1. Player 1 opens the app and clicks **Create new room** → gets a 6-char room code.
2. Share `https://your-host/room/ABC123` with friends.
3. Each player enters their name and joins. The host clicks **Start game** when 3–6 players are in.
4. State is broadcast over Socket.io. Each device sees its own hand; others appear as face-down stacks with a count.

### Server socket events

| Event                | Direction         | Notes                                      |
|----------------------|-------------------|--------------------------------------------|
| `create_room`        | client → server   | `{ name }` → ack `{ roomCode, playerId }`  |
| `join_room`          | client → server   | `{ roomCode, name?, playerId? }`           |
| `leave_room`         | client → server   | removes player                             |
| `room_update`        | server → client   | lobby snapshot (players, owner, started)   |
| `start_game`         | client → server   | owner only                                 |
| `game_state`         | server → client   | per-player game view (private hand)        |
| `place_bid`          | client → server   | `{ bidAmount }`                            |
| `pass_bid`           | client → server   |                                            |
| `select_trump`       | client → server   | `{ suit: 'S'\|'H'\|'D'\|'C' }`             |
| `declare_partner`    | client → server   | `{ cardIds: ['AS', 'KH'] }`                |
| `play_card`          | client → server   | `{ cardId: 'QH' }`                         |
| `play_again`         | client → server   | owner only, after `finished`               |

All client → server events accept an ack callback: `{ ok: true }` or `{ error: '...' }`.

## Deploying

### Backend → Railway (free tier)

1. Push this repo to GitHub.
2. On [railway.app](https://railway.app), create a new project → **Deploy from GitHub repo**.
3. Set the **Root Directory** to `server/`.
4. Railway auto-detects `package.json` and runs `npm install` + `npm start`.
5. Railway exposes a public URL like `https://kali-ni-tidi-production.up.railway.app`. Note it.
6. (Optional) set `CORS_ORIGIN` env var to your GitHub Pages URL to lock down CORS.

### Frontend → GitHub Pages

1. In `client/`, add a `.env.production`:

   ```
   VITE_SERVER_URL=https://kali-ni-tidi-production.up.railway.app
   VITE_BASE_PATH=/kali-ni-tidi/
   ```

   Use the actual Railway URL and the actual repo name.

2. Build and publish:

   ```bash
   cd client
   npm install
   npm run build
   # Outputs to client/dist/
   npx gh-pages -d dist
   ```

   This pushes `dist/` to the `gh-pages` branch of the current repo.

3. In your GitHub repo settings → **Pages**, set source to `gh-pages` branch. Site goes live at `https://<user>.github.io/kali-ni-tidi/`.

### Going custom-domain

If you serve from a custom domain (e.g. `https://tidi.example.com`), drop `VITE_BASE_PATH` and update `CORS_ORIGIN` on the Railway server accordingly.

## Notes

- All game state lives in memory on the server. Restarting the server kills active games.
- Disconnected players can reconnect to an in-progress game using their stored `playerId` (kept in `localStorage`).
- Disconnects during the lobby remove the player; disconnects mid-game keep their seat.
