import { useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';

function App() {
  const [game, setGame] = useState(new Chess());

  // Function to handle piece drops (moves)
  function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string }) {
    
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Auto-promote to queen
      });

      

      // Update game state
      setGame(new Chess(game.fen()));

      // Check if the game is over
      if (game.isGameOver()) {
        if (game.isCheckmate()) {
          alert('Checkmate! ' + (game.turn() === 'w' ? 'Black' : 'White') + ' wins!');
        } else if (game.isDraw()) {
          alert('Draw!');
        }
      }

      return true; // Move accepted
    } catch (e) {
      
      return false; // Snap back
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '600px' }}>
        <h1>Knightsbridge Chess</h1>
        <Chessboard 
          position={game.fen()} 
          onDrop={onDrop} // Drag and drop handler
          width={600} // Board size
          orientation="white" // White at bottom
          showNotation={true} // Static labels (a-h, 1-8)
        />
      </div>
    </div>
  );
}

export default App;