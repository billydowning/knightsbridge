const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for development; restrict in production
  }
});

app.use(cors());

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a game room
  socket.on('joinGame', async (gameId) => {
    socket.join(gameId);
    console.log(`User ${socket.id} joined game ${gameId}`);

    // Get number of players in room
    const socketsInRoom = await io.in(gameId).fetchSockets();
    const playerCount = socketsInRoom.length;

    // Assign color based on count (first is white, second is black)
    let color = 'white';
    let isTurn = true; // White starts
    if (playerCount === 2) {
      color = 'black';
      isTurn = false;
    }

    // Send assigned color and turn to the joining player
    socket.emit('assignedColor', { color, isTurn });
  });

  // Broadcast a move to the other player in the room
  socket.on('move', ({ gameId, move }) => {
    socket.to(gameId).emit('move', move); // Send to other player in room
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = 3001; // Backend port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});