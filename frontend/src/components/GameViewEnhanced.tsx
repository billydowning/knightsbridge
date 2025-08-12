import React, { useState, useEffect } from 'react';
import { ChessBoard } from './ChessBoard';
import { GameChat } from './GameChat';
import { useWebSocket } from '../hooks/useWebSocket';
import type { GameState } from '../types';

export interface GameViewEnhancedProps {
  roomId: string;
  playerId: string;
  playerName: string;
  betAmount: number;
  gameState: GameState;
  onSquareClick: (square: string) => void;
  onResignGame: () => void;
  onClaimWinnings: () => void;
  onStartNewGame: () => void;
  onBackToMenu: () => void;
  winningsClaimed: boolean;
  isLoading: boolean;
}

export const GameViewEnhanced: React.FC<GameViewEnhancedProps> = ({
  roomId,
  playerId,
  playerName,
  betAmount,
  gameState,
  onSquareClick,
  onResignGame,
  onClaimWinnings,
  onStartNewGame,
  onBackToMenu,
  winningsClaimed,
  isLoading
}) => {
  const [showChat, setShowChat] = useState(true);
  const [drawOfferPending, setDrawOfferPending] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

  // WebSocket integration
  const {
    isConnected,
    assignedColor,
    isMyTurn,
    error: wsError,
    sendChatMessage,
    getChatHistory,
    setPlayerReady,
    resignGame,
    offerDraw,
    respondToDraw
  } = useWebSocket({
    gameId: roomId,
    playerId,
    playerName,
    onMoveReceived: (move) => {
      // Handle incoming move - this would typically update the chess engine
    },
    onChatMessageReceived: (message) => {
      // Handle chat message
    },
    onPlayerJoined: (player) => {
      setOpponentDisconnected(false);
    },
    onPlayerDisconnected: (player) => {
      setOpponentDisconnected(true);
    },
    onGameStarted: (data) => {
      // Handle game started
    }
  });

  // Load chat history when component mounts
  useEffect(() => {
    if (isConnected) {
      getChatHistory();
    }
  }, [isConnected, getChatHistory]);

  // Notify server when player is ready
  useEffect(() => {
    if (isConnected && assignedColor) {
      setPlayerReady();
    }
  }, [isConnected, assignedColor, setPlayerReady]);

  const isGameOver = gameState.winner || gameState.draw;
  const showClaimButton = gameState.winner === assignedColor || gameState.draw;
  const potValue = betAmount * 2;

  const getGameStatusMessage = (): string => {
    if (gameState.winner) return `${gameState.winner} wins!`;
    if (gameState.draw) return 'Draw!';
    if (gameState.inCheck) return `${gameState.currentPlayer} is in check!`;
    if (gameState.gameActive) return `${gameState.currentPlayer}'s turn`;
    return 'Game not started';
  };

  const getPlayerStatusMessage = (): string => {
    if (gameState.winner === assignedColor) return 'You Win! 🏆';
    if (gameState.winner && gameState.winner !== assignedColor) return 'You Lose 😔';
    if (gameState.draw) return 'Draw 🤝';
    if (isMyTurn) return 'Your turn! 🎯';
    return 'Waiting for opponent... ⏳';
  };

  const handleResignGame = () => {
    if (window.confirm('Are you sure you want to resign?')) {
      resignGame();
      onResignGame();
    }
  };

  const handleOfferDraw = () => {
    if (window.confirm('Offer a draw to your opponent?')) {
      offerDraw();
    }
  };

  const handleDrawResponse = (accepted: boolean) => {
    respondToDraw(accepted);
    setDrawOfferPending(false);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Game Area */}
      <div className="flex-1 flex flex-col p-6">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">♟️ Chess Game</h2>
          
          {/* Connection Status */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            
            {assignedColor && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                <span>Playing as:</span>
                <span className="font-bold">{assignedColor.toUpperCase()}</span>
              </div>
            )}
            
            {opponentDisconnected && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                <span>⚠️ Opponent disconnected</span>
              </div>
            )}
          </div>
        </div>

        {/* Game Header Info */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Room:</strong> {roomId}
            </div>
            <div>
              <strong>Pot:</strong> {potValue} SOL
            </div>
            <div>
              <strong>Turn:</strong> {gameState.currentPlayer}
            </div>
          </div>
        </div>

        {/* Enhanced Status Display */}
        <div className={`p-4 rounded-lg border-2 mb-6 ${
          gameState.inCheck 
            ? 'bg-red-50 border-red-200' 
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="text-xl font-bold mb-2">
            {getGameStatusMessage()}
          </div>
          
          <div className="text-lg text-gray-600">
            {getPlayerStatusMessage()}
          </div>

          {/* Game Over Messages */}
          {gameState.winner && (
            <div className={`mt-3 text-xl font-bold ${
              gameState.winner === assignedColor ? 'text-green-600' : 'text-red-600'
            }`}>
              {gameState.winner === assignedColor ? '🏆 Congratulations!' : '💔 Better luck next time!'}
            </div>
          )}
          
          {gameState.draw && (
            <div className="mt-3 text-xl font-bold text-orange-600">
              🤝 Well played by both sides!
            </div>
          )}
        </div>

        {/* Chess Board */}
        <div className="flex justify-center mb-6">
          {(() => {
            // Toyota Debug: Log position before rendering board
            console.log('🔍 GameViewEnhanced: Rendering ChessBoard with position:', {
              positionKeys: gameState.position ? Object.keys(gameState.position).length : 0,
              e4: gameState.position?.e4,
              e5: gameState.position?.e5,
              d4: gameState.position?.d4,
              d5: gameState.position?.d5,
              e2: gameState.position?.e2,
              e7: gameState.position?.e7,
              fullPosition: gameState.position
            });
            return null;
          })()}
          <ChessBoard
            position={gameState.position}
            onSquareClick={onSquareClick}
            selectedSquare={gameState.selectedSquare}
            orientation={assignedColor === 'white' ? 'white' : 'black'}
            gameState={gameState}
            playerRole={assignedColor || 'white'}
            disabled={!gameState.gameActive || !isMyTurn || isLoading}
          />
        </div>

        {/* Game Info Panel */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <div className="font-bold">Moves</div>
            <div>{gameState.moveHistory.length}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <div className="font-bold">50-move rule</div>
            <div>{gameState.halfmoveClock}/100</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <div className="font-bold">Full moves</div>
            <div>{gameState.fullmoveNumber}</div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm text-center">
            <div className="font-bold">Castling</div>
            <div>{gameState.castlingRights || 'None'}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4">
          {/* Claim Winnings Button */}
          {showClaimButton && (
            <button
              onClick={winningsClaimed ? undefined : onClaimWinnings}
              disabled={isLoading || winningsClaimed}
              className={`px-6 py-3 text-white rounded-lg font-bold ${
                winningsClaimed 
                  ? 'bg-green-600 cursor-default' 
                  : 'bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed'
              }`}
            >
              {isLoading ? '⏳ Processing...' : 
               winningsClaimed ? '✅ Winnings Claimed!' :
               (gameState.winner === assignedColor ? '💰 Claim Winnings' : '🤝 Claim Draw Split')
              }
            </button>
          )}

          {/* Resign Button */}
          {gameState.gameActive && !isGameOver && (
            <button
              onClick={handleResignGame}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-bold"
            >
              🏳️ Resign
            </button>
          )}

          {/* Draw Offer Button */}
          {gameState.gameActive && !isGameOver && isMyTurn && (
            <button
              onClick={handleOfferDraw}
              className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-bold"
            >
              🤝 Offer Draw
            </button>
          )}

          {/* Draw Response */}
          {drawOfferPending && (
            <div className="flex space-x-2">
              <button
                onClick={() => handleDrawResponse(true)}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Accept Draw
              </button>
              <button
                onClick={() => handleDrawResponse(false)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Decline Draw
              </button>
            </div>
          )}

          {/* New Game Button */}
          {isGameOver && (
            <button
              onClick={onStartNewGame}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
            >
              🆕 New Game
            </button>
          )}

          {/* Back to Menu Button */}
          <button
            onClick={onBackToMenu}
            className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold"
          >
            ← Back to Menu
          </button>
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-80 bg-white border-l border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Game Chat</h3>
            <button
              onClick={() => setShowChat(!showChat)}
              className="text-gray-500 hover:text-gray-700"
            >
              {showChat ? '−' : '+'}
            </button>
          </div>
        </div>
        
        {showChat && (
          <div className="h-full">
            {/* GameChat component temporarily disabled due to missing WebSocket properties */}
            <div className="p-4 text-gray-500">
              Chat feature coming soon...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 