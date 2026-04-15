import { Server, Socket } from 'socket.io';
import { Game } from './game/Game';
import { Player } from './game/Player';
import { supabase } from './server';

/** All active poker rooms — keyed by room code, stored in memory */
const activeGames = new Map<string, Game>();

/** Seconds a player has to act before being auto-folded */
const TURN_SECONDS = 30;

export const initSockets = (io: Server) => {

  // ── Broadcast helpers ────────────────────────────────────────────────────

  const broadcastGameState = (roomId: string, game: Game) => {
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (!socketsInRoom) return;
    for (const socketId of socketsInRoom) {
      io.to(socketId).emit('game_state', game.getPublicState(socketId));
    }
  };

  // ── Turn timer ───────────────────────────────────────────────────────────

  /**
   * Clears any existing turn timer for a game and starts a new one.
   * When it fires, the current player is auto-folded.
   */
  const setTurnTimer = (roomId: string, game: Game) => {
    // Cancel previous timer
    if (game.pendingTurnTimeout) {
      clearTimeout(game.pendingTurnTimeout);
      game.pendingTurnTimeout = null;
    }

    // No timer needed when not actively betting
    if (game.state === 'waiting' || game.state === 'showdown') {
      game.turnDeadline = 0;
      return;
    }

    game.turnDeadline = Date.now() + TURN_SECONDS * 1000;

    game.pendingTurnTimeout = setTimeout(() => {
      const g = activeGames.get(roomId);
      if (!g || g.state === 'waiting' || g.state === 'showdown') return;

      const currentPlayer = g.players[g.currentTurnIndex];
      if (!currentPlayer) return;

      console.log(`[Timer] Auto-folding ${currentPlayer.username} in room ${roomId}`);
      const valid = g.handleAction(currentPlayer.id, 'fold');

      if (valid) {
        broadcastGameState(roomId, g);

        const stateAfter = g.state as string;
        if (stateAfter === 'showdown') {
          g.turnDeadline = 0;
          persistSettlements(roomId, g);
          scheduleReset(roomId, g);
        } else {
          // Recurse — next player's turn
          setTurnTimer(roomId, g);
        }
      }
    }, TURN_SECONDS * 1000);
  };

  /** 6-second delay before resetting from showdown to waiting */
  const scheduleReset = (roomId: string, game: Game) => {
    setTimeout(() => {
      game.state = 'waiting';
      game.cleanUpPlayers();
      game.players.forEach(p => { p.hand = []; });
      game.communityCards = [];
      broadcastGameState(roomId, game);
    }, 6000);
  };

  // ── Supabase persistence ─────────────────────────────────────────────────

  /** Upsert room metadata when a room is first created */
  const upsertRoom = async (game: Game, roomCode: string) => {
    if (!supabase) return;
    try {
      await supabase.from('rooms').upsert(
        {
          code: roomCode,
          game_type: game.gameType,
          entry_amount: game.entryAmount,
          small_blind: game.smallBlindAmt,
          big_blind: game.bigBlindAmt,
          max_players: game.maxPlayers,
          status: 'waiting',
          settlements: []
        },
        { onConflict: 'code' }
      );
    } catch (err) {
      console.error('[Supabase] upsertRoom error:', err);
    }
  };

  /** Persist settlement records to Supabase — called whenever a player exits */
  const persistSettlements = async (roomCode: string, game: Game) => {
    if (!supabase || !game.settlements.length) return;
    try {
      await supabase
        .from('rooms')
        .update({ settlements: game.settlements, status: 'active' })
        .eq('code', roomCode);
    } catch (err) {
      console.error('[Supabase] persistSettlements error:', err);
    }
  };

  /** Mark a room as finished when it is destroyed */
  const closeRoom = async (roomCode: string) => {
    if (!supabase) return;
    try {
      await supabase
        .from('rooms')
        .update({ status: 'finished' })
        .eq('code', roomCode);
    } catch (err) {
      console.error('[Supabase] closeRoom error:', err);
    }
  };

  // ── Socket event handlers ─────────────────────────────────────────────────

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    // ── join_room ──────────────────────────────────────────────────────────
    socket.on('join_room', (data: {
      roomId: string;
      userId: string;
      username: string;
      avatarUrl: string;
      gameType?: 'FAKE' | 'REAL';
      entryAmount?: number;
    }) => {
      let game = activeGames.get(data.roomId);

      if (!game) {
        game = new Game(
          data.roomId, 6, 10, 20,
          data.gameType || 'FAKE',
          data.entryAmount || 0
        );
        activeGames.set(data.roomId, game);
        upsertRoom(game, data.roomId); // fire-and-forget
      }

      // Handle reconnect — same userId, new socket
      const existingPlayer = game.players.find(p => p.id === data.userId);
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        socket.join(data.roomId);
        (socket as any).currentRoom = data.roomId;
        (socket as any).userId = data.userId;
        broadcastGameState(data.roomId, game);
        return;
      }

      const player = new Player(data.userId, socket.id, data.username, data.avatarUrl);
      const added = game.addPlayer(player);

      if (added) {
        socket.join(data.roomId);
        (socket as any).currentRoom = data.roomId;
        (socket as any).userId = data.userId;
        broadcastGameState(data.roomId, game);
      } else {
        socket.emit('error', { message: 'Room is full' });
      }
    });

    // ── start_game ─────────────────────────────────────────────────────────
    socket.on('start_game', (data: { roomId: string }) => {
      const game = activeGames.get(data.roomId);
      if (!game) return;

      const success = game.startGame();
      if (success) {
        broadcastGameState(data.roomId, game);
        setTurnTimer(data.roomId, game);
      }
    });

    // ── action ─────────────────────────────────────────────────────────────
    socket.on('action', (data: {
      roomId: string;
      action: 'fold' | 'check' | 'call' | 'raise';
      amount?: number;
    }) => {
      const game = activeGames.get(data.roomId);
      if (!game) return;

      const userId = (socket as any).userId;
      const valid = game.handleAction(userId, data.action, data.amount);

      if (valid) {
        broadcastGameState(data.roomId, game);

        if (game.state === 'showdown') {
          // Cancel turn timer — no more betting
          if (game.pendingTurnTimeout) clearTimeout(game.pendingTurnTimeout);
          game.pendingTurnTimeout = null;
          game.turnDeadline = 0;
          persistSettlements(data.roomId, game);
          scheduleReset(data.roomId, game);
        } else {
          // Advance the turn timer to the next player
          setTurnTimer(data.roomId, game);
        }
      } else {
        socket.emit('error', { message: 'Invalid action', action: data.action });
      }
    });

    // ── leave_room ─────────────────────────────────────────────────────────
    socket.on('leave_room', (data: { roomId: string }) => {
      const game = activeGames.get(data.roomId);
      const userId = (socket as any).userId;
      if (!game || !userId) return;

      game.removePlayer(userId);
      persistSettlements(data.roomId, game);
      broadcastGameState(data.roomId, game);
      socket.leave(data.roomId);
      socket.emit('left_room');

      if (game.players.length === 0) {
        if (game.pendingTurnTimeout) clearTimeout(game.pendingTurnTimeout);
        closeRoom(data.roomId);
        activeGames.delete(data.roomId);
      } else if (game.state !== 'waiting' && game.state !== 'showdown') {
        // Restart timer for whoever's turn it now is
        setTurnTimer(data.roomId, game);
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`);
      const roomId = (socket as any).currentRoom;
      const userId = (socket as any).userId;
      if (!roomId || !userId) return;

      const game = activeGames.get(roomId);
      if (!game) return;

      game.removePlayer(userId);
      persistSettlements(roomId, game);
      broadcastGameState(roomId, game);

      if (game.players.length === 0) {
        if (game.pendingTurnTimeout) clearTimeout(game.pendingTurnTimeout);
        closeRoom(roomId);
        activeGames.delete(roomId);
      } else if (game.state !== 'waiting' && game.state !== 'showdown') {
        setTurnTimer(roomId, game);
      }
    });
  });
};
