import { useState, useEffect } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import io from 'socket.io-client';

const socket = io('http://localhost:3001'); // Connect to backend (change to production URL later)

function App() {
  const [game, setGame] = useState(new Chess());
  const [gameId, setGameId] = useState('');
  const [joined, setJoined] = useState(false);
  const [playerColor, setPlayerColor] = useState('white'); // Default, updated by server
  const [isMyTurn, setIsMyTurn] = useState(true); // Default, updated by server

  useEffect(() => {
    // Listen for opponent's moves
    socket.on('move', (move) => {
      game.move(move);
      setGame(new Chess(game.fen()));
      setIsMyTurn(true); // Now your turn
    });

    // Listen for assigned color from server
    socket.on('assignedColor', ({ color, isTurn }) => {
      setPlayerColor(color);
      setIsMyTurn(isTurn);
    });

    return () => {
      socket.off('move');
      socket.off('assignedColor');
    };
  }, [game]);

  // Join or create game
  function joinGame() {
    if (gameId) {
      socket.emit('joinGame', gameId);
      setJoined(true);
    }
  }

  // Function to handle piece drops (moves)
  function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) {
    if (!isMyTurn) return false; // Not your turn

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      // Update local board
      setGame(new Chess(game.fen()));

      // Send move to opponent
      socket.emit('move', { gameId, move });

      // Switch turn
      setIsMyTurn(false);

      // Check game over
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          alert('Checkmate! ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins!');
        } else if (game.isDraw()) {
          alert('Draw!');
        }
      }

      return true;
    } catch (e) {
      return false;
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '600px' }}>
        <h1>Knightsbridge Chess</h1>
        {!joined ? (
          <div>
            <input 
              type="text" 
              placeholder="Enter Game ID (or create new)" 
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <button onClick={joinGame}>Join/Create Game</button>
          </div>
        ) : (
          <div>
            <p>Game ID: {gameId} | Your Color: {playerColor} | {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}</p>
            <Chessboard 
              position={game.fen()} 
              onDrop={onDrop}
              width={600}
              orientation={playerColor}
              showNotation={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;