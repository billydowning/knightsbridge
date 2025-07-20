/**
 * Leaderboard Component
 * Displays player rankings, statistics, and achievements
 */

import React, { useState, useEffect } from 'react';

export interface PlayerStats {
  id: string;
  wallet: string;
  name: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  totalEarnings: number;
  bestWinStreak: number;
  currentStreak: number;
  achievements: Achievement[];
  lastActive: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface LeaderboardProps {
  players: PlayerStats[];
  currentUser?: string;
  onPlayerClick?: (playerId: string) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentUser,
  onPlayerClick
}) => {
  const [sortBy, setSortBy] = useState<'rating' | 'wins' | 'earnings' | 'winRate'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'top10'>('all');

  // Mock data for demonstration
  useEffect(() => {
    if (players.length === 0) {
      // Generate mock data
      const mockPlayers: PlayerStats[] = [
        {
          id: '1',
          wallet: 'UFGCHLdHGYQDwCag4iUTTYmvTyayvdjo9BsbDBs56r1',
          name: 'Grandmaster_Chess',
          rating: 2850,
          gamesPlayed: 156,
          wins: 134,
          losses: 12,
          draws: 10,
          winRate: 85.9,
          totalEarnings: 125.5,
          bestWinStreak: 23,
          currentStreak: 8,
          achievements: [
            {
              id: '1',
              name: 'First Win',
              description: 'Win your first game',
              icon: '🏆',
              unlockedAt: new Date('2024-01-15'),
              rarity: 'common'
            },
            {
              id: '2',
              name: 'Win Streak',
              description: 'Win 10 games in a row',
              icon: '🔥',
              unlockedAt: new Date('2024-02-01'),
              rarity: 'rare'
            }
          ],
          lastActive: new Date()
        },
        {
          id: '2',
          wallet: 'ABC123DEF456GHI789JKL012MNO345PQR678STU901VWX234',
          name: 'BlitzMaster',
          rating: 2720,
          gamesPlayed: 89,
          wins: 76,
          losses: 8,
          draws: 5,
          winRate: 85.4,
          totalEarnings: 98.3,
          bestWinStreak: 15,
          currentStreak: 3,
          achievements: [
            {
              id: '1',
              name: 'Speed Demon',
              description: 'Win 5 blitz games in a row',
              icon: '⚡',
              unlockedAt: new Date('2024-01-20'),
              rarity: 'epic'
            }
          ],
          lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          id: '3',
          wallet: 'XYZ789ABC123DEF456GHI789JKL012MNO345PQR678STU901',
          name: 'PawnPusher',
          rating: 2450,
          gamesPlayed: 203,
          wins: 156,
          losses: 32,
          draws: 15,
          winRate: 76.8,
          totalEarnings: 67.2,
          bestWinStreak: 12,
          currentStreak: 1,
          achievements: [],
          lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
        }
      ];
      
      // Update the players state (in real app, this would be passed as prop)
    }
  }, [players]);

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: number;
    let bValue: number;
    
    switch (sortBy) {
      case 'rating':
        aValue = a.rating;
        bValue = b.rating;
        break;
      case 'wins':
        aValue = a.wins;
        bValue = b.wins;
        break;
      case 'earnings':
        aValue = a.totalEarnings;
        bValue = b.totalEarnings;
        break;
      case 'winRate':
        aValue = a.winRate;
        bValue = b.winRate;
        break;
      default:
        aValue = a.rating;
        bValue = b.rating;
    }
    
    return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
  });

  const filteredPlayers = sortedPlayers.filter(player => {
    switch (filterBy) {
      case 'active':
        return new Date().getTime() - player.lastActive.getTime() < 24 * 60 * 60 * 1000; // Active in last 24h
      case 'top10':
        return sortedPlayers.indexOf(player) < 10;
      default:
        return true;
    }
  });

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#666';
  };

  const getAchievementRarityColor = (rarity: Achievement['rarity']): string => {
    switch (rarity) {
      case 'common': return '#6c757d';
      case 'rare': return '#007bff';
      case 'epic': return '#6f42c1';
      case 'legendary': return '#fd7e14';
      default: return '#6c757d';
    }
  };

  const formatLastActive = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 Leaderboard</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Filter Controls */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="all">All Players</option>
            <option value="active">Active (24h)</option>
            <option value="top10">Top 10</option>
          </select>
          
          {/* Sort Controls */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="rating">Rating</option>
            <option value="wins">Wins</option>
            <option value="earnings">Earnings</option>
            <option value="winRate">Win Rate</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            style={{
              padding: '8px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        overflow: 'hidden',
        border: '1px solid #dee2e6'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Rank</th>
              <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #dee2e6' }}>Player</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Rating</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Games</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Wins</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Win Rate</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Earnings</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Streak</th>
              <th style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>Last Active</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.map((player, index) => (
              <tr
                key={player.id}
                style={{
                  backgroundColor: player.wallet === currentUser ? '#e3f2fd' : 'white',
                  cursor: onPlayerClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => onPlayerClick?.(player.id)}
                onMouseEnter={(e) => {
                  if (onPlayerClick) {
                    e.currentTarget.style.backgroundColor = player.wallet === currentUser ? '#bbdefb' : '#f5f5f5';
                  }
                }}
                onMouseLeave={(e) => {
                  if (onPlayerClick) {
                    e.currentTarget.style.backgroundColor = player.wallet === currentUser ? '#e3f2fd' : 'white';
                  }
                }}
              >
                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: getRankColor(index + 1),
                    fontSize: '16px'
                  }}>
                    #{index + 1}
                  </span>
                </td>
                <td style={{ padding: '12px', borderBottom: '1px solid #dee2e6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#495057' }}>
                        {player.name}
                        {player.wallet === currentUser && (
                          <span style={{ marginLeft: '5px', color: '#007bff' }}>👤</span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6c757d' }}>
                        {player.wallet.substring(0, 8)}...{player.wallet.substring(player.wallet.length - 8)}
                      </div>
                    </div>
                    {player.achievements.length > 0 && (
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {player.achievements.slice(0, 3).map(achievement => (
                          <span
                            key={achievement.id}
                            title={`${achievement.name}: ${achievement.description}`}
                            style={{
                              fontSize: '14px',
                              color: getAchievementRarityColor(achievement.rarity)
                            }}
                          >
                            {achievement.icon}
                          </span>
                        ))}
                        {player.achievements.length > 3 && (
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>
                            +{player.achievements.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
                  {player.rating}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                  {player.gamesPlayed}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                  {player.wins}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                  <span style={{ 
                    color: player.winRate >= 70 ? '#28a745' : player.winRate >= 50 ? '#ffc107' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {player.winRate.toFixed(1)}%
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontWeight: 'bold' }}>
                  {player.totalEarnings.toFixed(1)} SOL
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6' }}>
                  <span style={{ 
                    color: player.currentStreak > 0 ? '#28a745' : '#dc3545',
                    fontWeight: 'bold'
                  }}>
                    {player.currentStreak > 0 ? '+' : ''}{player.currentStreak}
                  </span>
                </td>
                <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid #dee2e6', fontSize: '12px', color: '#6c757d' }}>
                  {formatLastActive(player.lastActive)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Statistics Summary */}
      <div style={{ 
        marginTop: '20px', 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px' 
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Players</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {players.length}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Active Players</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {players.filter(p => new Date().getTime() - p.lastActive.getTime() < 24 * 60 * 60 * 1000).length}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Games</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {players.reduce((sum, p) => sum + p.gamesPlayed, 0)}
          </div>
        </div>
        
        <div style={{ 
          backgroundColor: 'white', 
          padding: '15px', 
          borderRadius: '8px', 
          border: '1px solid #dee2e6',
          textAlign: 'center'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Total Earnings</h4>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {players.reduce((sum, p) => sum + p.totalEarnings, 0).toFixed(1)} SOL
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard; 