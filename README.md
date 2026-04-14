# Texas Hold'em Poker — Real Money Mode 🃏

A full-stack multiplayer Texas Hold'em poker platform with **real money settlement**, built with **Next.js**, **Socket.io** and **Supabase**.

## ✨ Features

- 🎮 **Multiplayer** — Up to 6 players per room via WebSockets
- 💰 **Real Money Mode** — Entry fee system with chip→₹ conversion and settlement ledger
- 📊 **Settlement Dashboard** — Auto-calculates who-pays-whom when players exit mid-game
- 📱 **Mobile-first** — Fully responsive for both portrait and landscape on any phone
- 🔒 **Orientation Guard** — Prompts users to rotate to landscape for best experience
- ⚡ **Greedy Settlement Algorithm** — Minimises transactions between winners and losers

## 🗂 Project Structure

```
poker/
├── backend/          # Node.js + Socket.io + Supabase
│   ├── src/
│   │   ├── game/     # Core poker engine (Game.ts)
│   │   ├── utils/    # Settlement calculator
│   │   └── socket.ts # WebSocket event handlers
│   └── supabase/     # DB schema
└── frontend/         # Next.js 14 + Tailwind CSS
    └── src/
        ├── app/      # Pages/routing
        ├── components/
        │   ├── PokerTable.tsx
        │   ├── PlayerSeat.tsx
        │   ├── PlayingCard.tsx
        │   ├── ActionPanel.tsx
        │   └── SettlementModal.tsx
        └── context/  # Socket context
```

## 🚀 Getting Started

### Backend
```bash
cd backend
npm install
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_ANON_KEY
npm run dev            # starts on port 8080
```

### Frontend
```bash
cd frontend
npm install
npm run dev            # starts on port 3000
```

> **Mobile access**: Update `SOCKET_URL` in `src/context/SocketContext.tsx` to your local IP (e.g. `http://192.168.x.x:8080`) so phones on the same Wi-Fi can connect.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Node.js, Express, Socket.io |
| Database | Supabase (PostgreSQL) |
| Real-time | WebSockets via Socket.io |

## 📄 License

MIT
