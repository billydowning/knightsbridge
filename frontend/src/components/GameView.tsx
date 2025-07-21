/**
 * Game View Component
 * Main chess game interface with board, status, and game controls
 */

import React from 'react';
import { ChessBoard } from './ChessBoard';
import { ChatBox, type ChatMessage } from './ChatBox';
import type { GameState } from '../types';

export interface GameViewProps {
  roomId: string;
  playerRole: string;
  betAmount: number;
  gameState: GameState;
  onSquareClick: (square: string) => void;
  onResignGame: () => void;
  onClaimWinnings: () => void;
  onStartNewGame: () => void;
  onBackToMenu: () => void;
  winningsClaimed: boolean;
  isLoading: boolean;
  onDeclareWinner?: (winner: 'white' | 'black') => void;
  onTestCheckmate?: () => void;
  onTestCurrentBoard?: () => void;
  chatMessages?: ChatMessage[];
  onSendChatMessage?: (message: string) => void;
}

export const GameView: React.FC<GameViewProps> = ({
  roomId,
  playerRole,
  betAmount,
  gameState,
  onSquareClick,
  onResignGame,
  onClaimWinnings,
  onStartNewGame,
  onBackToMenu,
  winningsClaimed,
  isLoading,
  onDeclareWinner,
  onTestCheckmate,
  onTestCurrentBoard,
  chatMessages = [],
  onSendChatMessage
}) => {
  const isGameOver = gameState.winner || gameState.draw;
  const isMyTurn = gameState.currentPlayer === playerRole;
  const canClaimWinnings = (gameState.winner === playerRole || gameState.draw) && !winningsClaimed;
  const potValue = betAmount * 2;

  const getGameStatusMessage = (): string => {
    if (gameState.winner) return `${gameState.winner} wins!`;
    if (gameState.draw) return 'Draw!';
    if (gameState.inCheck) return `${gameState.currentPlayer} is in check!`;
    if (gameState.gameActive) return `${gameState.currentPlayer}'s turn`;
    return 'Game not started';
  };

  const getPlayerStatusMessage = (): string => {
    if (gameState.winner === playerRole) return 'You Win! 🏆';
    if (gameState.winner && gameState.winner !== playerRole) return 'You Lose 😔';
    if (gameState.draw) return 'Draw 🤝';
    if (isMyTurn) return 'Your turn! 🎯';
    return 'Waiting for opponent... ⏳';
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>♟️ Chess Game</h2>
      
      {/* Game Header Info */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        marginBottom: '20px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ fontSize: '14px' }}>
          <strong>Room:</strong> {roomId} | <strong>Role:</strong> 
          <span style={{ 
            color: playerRole === 'white' ? '#4CAF50' : '#FF9800',
            fontWeight: 'bold',
            marginLeft: '5px'
          }}>
            {playerRole.toUpperCase()}
          </span>
        </div>
        <div style={{ fontSize: '14px' }}>
          <strong>Turn:</strong> {gameState.currentPlayer} | <strong>Pot:</strong> {potValue} SOL
        </div>
      </div>
      
      {/* Enhanced Status Display */}
      <div style={{ 
        margin: '10px 0', 
        padding: '15px', 
        backgroundColor: gameState.inCheck ? '#ffe6e6' : '#f0f0f0', 
        borderRadius: '8px',
        border: gameState.inCheck ? '2px solid #ff6b6b' : '1px solid #ddd'
      }}>
        <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          <strong>Game Status:</strong> {getGameStatusMessage()}
        </div>
        
        <div style={{ fontSize: '16px', color: '#666' }}>
          {getPlayerStatusMessage()}
        </div>

        {/* Testing Instructions */}
        {gameState.gameActive && !isGameOver && (
          <div style={{ 
            marginTop: '10px', 
            padding: '10px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '5px', 
            border: '1px solid #2196f3',
            fontSize: '14px',
            color: '#1565c0'
          }}>
            <strong>🧪 Testing Mode:</strong> Open a new browser tab and join as the opposite color to test both players manually.
          </div>
        )}

        {/* Game Over Messages */}
        {gameState.winner && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '20px', 
            fontWeight: 'bold', 
            color: gameState.winner === playerRole ? '#4CAF50' : '#f44336'
          }}>
            {gameState.winner === playerRole ? '🏆 Congratulations!' : '💔 Better luck next time!'}
          </div>
        )}
        
        {gameState.draw && (
          <div style={{ 
            marginTop: '10px', 
            fontSize: '18px', 
            fontWeight: 'bold', 
            color: '#FF9800' 
          }}>
            🤝 Well played by both sides!
          </div>
        )}
      </div>
      
      {/* Chess Board and Chat Layout */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start',
        marginTop: '20px',
        gap: '20px'
      }}>
        {/* Chess Board */}
        <div>
          <ChessBoard
            position={gameState.position}
            onSquareClick={onSquareClick}
            selectedSquare={gameState.selectedSquare}
            orientation={playerRole === 'white' ? 'white' : 'black'}
            gameState={gameState}
            playerRole={playerRole}
            disabled={!gameState.gameActive || !isMyTurn || isLoading}
          />
        </div>

        {/* Chat Box */}
        {onSendChatMessage && (
          <ChatBox
            roomId={roomId}
            playerRole={playerRole}
            messages={chatMessages}
            onSendMessage={onSendChatMessage}
          />
        )}
      </div>
      
      {/* Game Info Panel */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '15px',
        marginTop: '20px',
        fontSize: '14px',
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <strong>Moves</strong><br/>
          {gameState.moveHistory.length}
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>50-move rule</strong><br/>
          {gameState.halfmoveClock}/100
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Full moves</strong><br/>
          {gameState.fullmoveNumber}
        </div>
        <div style={{ textAlign: 'center' }}>
          <strong>Castling</strong><br/>
          {gameState.castlingRights || 'None'}
        </div>
      </div>
      
      {/* Action Buttons */}
      <div style={{ marginTop: '30px' }}>
        {/* Claim Winnings Button */}
        {canClaimWinnings && (
          <button
            onClick={onClaimWinnings}
            disabled={isLoading}
            style={{
              padding: '15px 30px',
              backgroundColor: isLoading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              margin: '10px'
            }}
          >
            {isLoading ? '⏳ Processing...' : (
              gameState.winner === playerRole ? '💰 Claim Winnings' : '🤝 Claim Draw Split'
            )}
          </button>
        )}

        {/* Winnings Claimed Indicator */}
        {winningsClaimed && (
          <div style={{
            display: 'inline-block',
            padding: '10px 20px',
            backgroundColor: '#d4edda',
            color: '#155724',
            border: '1px solid #c3e6cb',
            borderRadius: '5px',
            margin: '10px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            ✅ Winnings have been claimed!
          </div>
        )}

        {/* Game Control Buttons */}
        <div style={{ marginTop: '15px' }}>
          {/* Resign Button - Only show if game is active and no winner yet */}
          {gameState.gameActive && !isGameOver && (
            <button
              onClick={onResignGame}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                backgroundColor: isLoading ? '#ccc' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                margin: '5px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              🏳️ Resign Game
            </button>
          )}

          {/* Testing Buttons - Only show in development/testing mode */}
          {gameState.gameActive && !isGameOver && onDeclareWinner && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
              <div style={{ fontSize: '12px', color: '#856404', marginBottom: '5px' }}>🧪 Testing Controls:</div>
              <button
                onClick={() => onDeclareWinner('white')}
                style={{
                  padding: '8px 15px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  margin: '2px',
                  fontSize: '12px'
                }}
              >
                🏆 Declare White Winner
              </button>
              <button
                onClick={() => onDeclareWinner('black')}
                style={{
                  padding: '8px 15px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  margin: '2px',
                  fontSize: '12px'
                }}
              >
                🏆 Declare Black Winner
              </button>
              {onTestCheckmate && (
                <button
                  onClick={onTestCheckmate}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    margin: '2px',
                    fontSize: '12px'
                  }}
                >
                  🧪 Test Checkmate
                </button>
              )}
              {onTestCurrentBoard && (
                <button
                  onClick={onTestCurrentBoard}
                  style={{
                    padding: '8px 15px',
                    backgroundColor: '#9c27b0',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer',
                    margin: '2px',
                    fontSize: '12px'
                  }}
                >
                  🔍 Test Current Board
                </button>
              )}
            </div>
          )}

          {/* Game Over Options - Only show when game is finished */}
          {isGameOver && (
            <>
              <button
                onClick={onStartNewGame}
                disabled={isLoading}
                style={{
                  padding: '12px 25px',
                  backgroundColor: isLoading ? '#ccc' : '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                  fontWeight: 'bold',
                  margin: '5px'
                }}
              >
                🎮 Start New Game
              </button>
              
              <button
                onClick={onBackToMenu}
                disabled={isLoading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  margin: '5px',
                  fontSize: '14px'
                }}
              >
                ← Back to Menu
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Move History */}
      {gameState.moveHistory.length > 0 && (
        <div style={{ 
          marginTop: '30px', 
          maxHeight: '150px', 
          overflowY: 'auto',
          backgroundColor: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          textAlign: 'left',
          border: '1px solid #dee2e6'
        }}>
          <strong style={{ fontSize: '16px' }}>📝 Move History:</strong>
          <div style={{ fontSize: '13px', marginTop: '10px', fontFamily: 'monospace' }}>
            {gameState.moveHistory.map((move, index) => (
              <span key={index} style={{ 
                marginRight: '15px',
                display: 'inline-block',
                marginBottom: '5px',
                padding: '2px 6px',
                backgroundColor: '#ffffff',
                borderRadius: '3px',
                border: '1px solid #dee2e6'
              }}>
                <strong>{Math.floor(index / 2) + 1}{index % 2 === 0 ? '.' : '...'}</strong> {move.piece} {move.from}→{move.to}
                {move.capturedPiece && <span style={{ color: '#f44336' }}> x{move.capturedPiece}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Turn Indicator */}
      {gameState.gameActive && !isGameOver && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: isMyTurn ? '#4CAF50' : '#ff9800',
          color: 'white',
          borderRadius: '20px',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          zIndex: 1000
        }}>
          {isMyTurn ? '🎯 Your Turn' : '⏳ Opponent\'s Turn'}
        </div>
      )}
    </div>
  );
};

export default GameView;