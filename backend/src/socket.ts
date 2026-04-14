import { Server, Socket } from 'socket.io';
import { Game } from './game/Game';
import { Player } from './game/Player';

// In-memory store for active poker rooms
const activeGames = new Map<string, Game>();

export const initSockets = (io: Server) => {
  const broadcastGameState = (roomId: string, game: Game) => {
    const socketsInRoom = io.sockets.adapter.rooms.get(roomId);
    if (!socketsInRoom) return;

    for (const socketId of socketsInRoom) {
      io.to(socketId).emit('game_state', game.getPublicState(socketId));
    }
  };

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    socket.on('join_room', (data: { roomId: string; userId: string; username: string; avatarUrl: string; gameType?: 'FAKE' | 'REAL'; entryAmount?: number }) => {
      let game = activeGames.get(data.roomId);
      if (!game) {
        game = new Game(data.roomId, 6, 10, 20, data.gameType || 'FAKE', data.entryAmount || 0);
        activeGames.set(data.roomId, game);
      }

      let existingPlayer = game.players.find(p => p.id === data.userId);
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
        socket.emit('error', { message: 'Room full' });
      }
    });

    socket.on('start_game', (data: { roomId: string }) => {
      const game = activeGames.get(data.roomId);
      if (game) {
        const success = game.startGame();
        if (success) {
           broadcastGameState(data.roomId, game);
        }
      }
    });

    socket.on('action', (data: { roomId: string, action: 'fold' | 'check' | 'call' | 'raise', amount?: number }) => {
      const game = activeGames.get(data.roomId);
      if (game) {
        const userId = (socket as any).userId;
        const valid = game.handleAction(userId, data.action, data.amount);
        if (valid) {
          broadcastGameState(data.roomId, game);
          // If we hit showdown, pause for 6 seconds then reset
          if (game.state === 'showdown') {
             setTimeout(() => {
                game.state = 'waiting';
                game.cleanUpPlayers(); // Removes busts and resets lastActions
                
                // Clear hands for visual safety
                game.players.forEach(p => p.hand = []);
                game.communityCards = [];
                broadcastGameState(data.roomId, game);
             }, 6000);
          }
        } else {
          socket.emit('error', { message: 'Invalid action', action: data.action });
        }
      }
    });

    socket.on('leave_room', (data: { roomId: string }) => {
      const game = activeGames.get(data.roomId);
      const userId = (socket as any).userId;
      if (game && userId) {
        game.removePlayer(userId);
        broadcastGameState(data.roomId, game);
        socket.leave(data.roomId);
        socket.emit('left_room');
        if (game.players.length === 0) {
           activeGames.delete(data.roomId);
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] disconnected: ${socket.id}`);
      const roomId = (socket as any).currentRoom;
      const userId = (socket as any).userId;
      if (roomId && userId) {
        const game = activeGames.get(roomId);
        if (game) {
          game.removePlayer(userId);
          broadcastGameState(roomId, game);
          if (game.players.length === 0) {
             activeGames.delete(roomId);
          }
        }
      }
    });
  });
};
