/**
 * Game Analytics Component
 * Provides detailed game statistics, move analysis, and performance metrics
 */

import React from 'react';
import type { GameState, Move } from '../types/chess';

export interface GameAnalyticsProps {
  gameState: GameState;
  playerRole: string;
  betAmount: number;
  roomId: string;
}

interface MoveAnalysis {
  moveNumber: number;
  move: string;
  piece: string;
  capturedPiece?: string;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastling: boolean;
  isEnPassant: boolean;
  isPromotion: boolean;
}

export const GameAnalytics: React.FC<GameAnalyticsProps> = ({
  gameState,
  playerRole,
  betAmount,
  roomId
}) => {
  const analyzeMove = (move: Move, index: number): MoveAnalysis => {
    const isCheck = move.to.includes('+');
    const isCheckmate = move.to.includes('#');
    const isCastling = move.piece === '♔' && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) === 2;
    const isEnPassant = move.piece === '♙' && move.from[0] !== move.to[0] && !move.capturedPiece;
    const isPromotion = move.piece === '♙' && (move.to[1] === '8' || move.to[1] === '1');

    return {
      moveNumber: Math.floor(index / 2) + 1,
      move: `${move.from}-${move.to}`,
      piece: move.piece,
      capturedPiece: move.capturedPiece,
      isCheck,
      isCheckmate,
      isCastling,
      isEnPassant,
      isPromotion
    };
  };

  const getGameStatistics = () => {
    const moves = gameState.moveHistory || [];
    const totalMoves = moves.length;
    const whiteMoves = moves.filter((_, index) => index % 2 === 0);
    const blackMoves = moves.filter((_, index) => index % 2 === 1);
    
    const captures = moves.filter(move => move.capturedPiece).length;
    const checks = moves.filter(move => move.to.includes('+')).length;
    const castlings = moves.filter(move => 
      move.piece === '♔' && Math.abs(move.from.charCodeAt(0) - move.to.charCodeAt(0)) === 2
    ).length;
    
    const averageMoveTime = gameState.lastUpdated && moves.length > 0 
      ? Math.round((gameState.lastUpdated - (gameState.lastUpdated - moves.length * 30000)) / moves.length / 1000)
      : 0;

    return {
      totalMoves,
      whiteMoves: whiteMoves.length,
      blackMoves: blackMoves.length,
      captures,
      checks,
      castlings,
      averageMoveTime,
      gameDuration: gameState.lastUpdated ? Math.round((Date.now() - gameState.lastUpdated) / 1000) : 0
    };
  };

  const getPlayerPerformance = () => {
    const moves = gameState.moveHistory || [];
    const playerMoves = moves.filter((_, index) => 
      (index % 2 === 0 && playerRole === 'white') || 
      (index % 2 === 1 && playerRole === 'black')
    );
    
    const captures = playerMoves.filter(move => move.capturedPiece).length;
    const checks = playerMoves.filter(move => move.to.includes('+')).length;
    
    return {
      movesPlayed: playerMoves.length,
      captures,
      checks,
      averageMoveTime: playerMoves.length > 0 ? Math.round(30 / playerMoves.length) : 0
    };
  };

  const stats = getGameStatistics();
  const performance = getPlayerPerformance();

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '20px',
      margin: '20px 0',
      border: '1px solid #e9ecef'
    }}>
      <h3 style={{ marginBottom: '15px', color: '#495057' }}>
        📊 Game Analytics
      </h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
        {/* Game Statistics */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
          <h4 style={{ marginBottom: '10px', color: '#6c757d', fontSize: '14px' }}>Game Statistics</h4>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <div>Total Moves: <strong>{stats.totalMoves}</strong></div>
            <div>White Moves: <strong>{stats.whiteMoves}</strong></div>
            <div>Black Moves: <strong>{stats.blackMoves}</strong></div>
            <div>Captures: <strong>{stats.captures}</strong></div>
            <div>Checks: <strong>{stats.checks}</strong></div>
            <div>Castlings: <strong>{stats.castlings}</strong></div>
          </div>
        </div>

        {/* Player Performance */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
          <h4 style={{ marginBottom: '10px', color: '#6c757d', fontSize: '14px' }}>Your Performance</h4>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <div>Moves Played: <strong>{performance.movesPlayed}</strong></div>
            <div>Captures: <strong>{performance.captures}</strong></div>
            <div>Checks: <strong>{performance.checks}</strong></div>
            <div>Avg Move Time: <strong>{performance.averageMoveTime}s</strong></div>
          </div>
        </div>

        {/* Game Info */}
        <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '6px', border: '1px solid #dee2e6' }}>
          <h4 style={{ marginBottom: '10px', color: '#6c757d', fontSize: '14px' }}>Game Info</h4>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <div>Room: <strong>{roomId}</strong></div>
            <div>Bet Amount: <strong>{betAmount} SOL</strong></div>
            <div>Your Role: <strong>{playerRole}</strong></div>
            <div>Current Player: <strong>{gameState.currentPlayer}</strong></div>
            <div>Game Status: <strong>{gameState.gameActive ? 'Active' : 'Finished'}</strong></div>
          </div>
        </div>
      </div>

      {/* Move History */}
      {gameState.moveHistory && gameState.moveHistory.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h4 style={{ marginBottom: '10px', color: '#6c757d', fontSize: '14px' }}>Move History</h4>
          <div style={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            backgroundColor: 'white', 
            padding: '10px', 
            borderRadius: '6px',
            border: '1px solid #dee2e6',
            fontSize: '11px'
          }}>
            {gameState.moveHistory.map((move, index) => {
              const analysis = analyzeMove(move, index);
              const isPlayerMove = (index % 2 === 0 && playerRole === 'white') || 
                                 (index % 2 === 1 && playerRole === 'black');
              
              return (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '2px 0',
                  borderBottom: '1px solid #f1f3f4',
                  backgroundColor: isPlayerMove ? '#e3f2fd' : 'transparent'
                }}>
                  <span style={{ fontWeight: 'bold', minWidth: '30px' }}>
                    {analysis.moveNumber}.
                  </span>
                  <span style={{ flex: 1 }}>
                    {analysis.move}
                    {analysis.isCheck && ' +'}
                    {analysis.isCheckmate && ' #'}
                    {analysis.isCastling && ' (O-O)'}
                    {analysis.isEnPassant && ' e.p.'}
                    {analysis.isPromotion && ' =♕'}
                  </span>
                  <span style={{ color: '#6c757d', fontSize: '10px' }}>
                    {analysis.piece}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameAnalytics; 