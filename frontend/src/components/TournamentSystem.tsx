/**
 * Tournament System Component
 * Manages chess tournaments with brackets, prizes, and player management
 */

import React, { useState, useEffect } from 'react';
import type { GameState } from '../types/chess';

export interface Tournament {
  id: string;
  name: string;
  description: string;
  entryFee: number;
  prizePool: number;
  maxParticipants: number;
  currentParticipants: number;
  status: 'registration' | 'active' | 'completed';
  startDate: Date;
  endDate?: Date;
  brackets: TournamentBracket[];
  participants: TournamentPlayer[];
  rules: TournamentRules;
}

export interface TournamentPlayer {
  id: string;
  wallet: string;
  name: string;
  rating: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  eliminated: boolean;
}

export interface TournamentBracket {
  id: string;
  round: number;
  matches: TournamentMatch[];
  isComplete: boolean;
}

export interface TournamentMatch {
  id: string;
  player1: string;
  player2: string;
  winner?: string;
  gameId?: string;
  status: 'pending' | 'active' | 'completed';
  result?: 'player1' | 'player2' | 'draw';
}

export interface TournamentRules {
  timeControl: {
    initialTime: number; // seconds
    increment: number; // seconds per move
  };
  format: 'single_elimination' | 'double_elimination' | 'swiss';
  minRating: number;
  maxRating: number;
}

export interface TournamentSystemProps {
  onJoinTournament: (tournamentId: string, entryFee: number) => Promise<boolean>;
  onCreateTournament: (tournament: Omit<Tournament, 'id' | 'status' | 'participants' | 'brackets'>) => Promise<string>;
  onStartMatch: (matchId: string) => void;
  userWallet?: string;
}

export const TournamentSystem: React.FC<TournamentSystemProps> = ({
  onJoinTournament,
  onCreateTournament,
  onStartMatch,
  userWallet
}) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock tournaments data (in real app, this would come from API)
  useEffect(() => {
    const mockTournaments: Tournament[] = [
      {
        id: '1',
        name: 'Knightsbridge Championship',
        description: 'The premier chess tournament with the highest stakes',
        entryFee: 1.0,
        prizePool: 50.0,
        maxParticipants: 16,
        currentParticipants: 8,
        status: 'registration',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
        participants: [],
        brackets: [],
        rules: {
          timeControl: { initialTime: 600, increment: 10 }, // 10+10
          format: 'single_elimination',
          minRating: 0,
          maxRating: 3000
        }
      },
      {
        id: '2',
        name: 'Blitz Battle Royale',
        description: 'Fast-paced blitz tournament for quick thinkers',
        entryFee: 0.5,
        prizePool: 25.0,
        maxParticipants: 32,
        currentParticipants: 24,
        status: 'active',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
        participants: [],
        brackets: [],
        rules: {
          timeControl: { initialTime: 180, increment: 0 }, // 3+0
          format: 'single_elimination',
          minRating: 0,
          maxRating: 3000
        }
      }
    ];
    setTournaments(mockTournaments);
  }, []);

  const handleJoinTournament = async (tournament: Tournament) => {
    if (!userWallet) {
      alert('Please connect your wallet first');
      return;
    }

    setLoading(true);
    try {
      const success = await onJoinTournament(tournament.id, tournament.entryFee);
      if (success) {
        // Update tournament participants
        setTournaments(prev => prev.map(t => 
          t.id === tournament.id 
            ? { ...t, currentParticipants: t.currentParticipants + 1 }
            : t
        ));
        alert('Successfully joined tournament!');
      }
    } catch (error) {
      alert('Failed to join tournament: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTournament = async (tournamentData: any) => {
    setLoading(true);
    try {
      const tournamentId = await onCreateTournament(tournamentData);
      alert(`Tournament created successfully! ID: ${tournamentId}`);
      setShowCreateForm(false);
    } catch (error) {
      alert('Failed to create tournament: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeControl = (timeControl: TournamentRules['timeControl']): string => {
    const minutes = Math.floor(timeControl.initialTime / 60);
    const seconds = timeControl.initialTime % 60;
    const increment = timeControl.increment;
    
    if (increment === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}+${increment}`;
    }
  };

  const getTournamentStatusColor = (status: Tournament['status']): string => {
    switch (status) {
      case 'registration': return '#28a745';
      case 'active': return '#007bff';
      case 'completed': return '#6c757d';
      default: return '#6c757d';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 Tournaments</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Create Tournament
        </button>
      </div>

      {/* Tournament List */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {tournaments.map(tournament => (
          <div
            key={tournament.id}
            style={{
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: 'white',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s'
            }}
            onClick={() => setSelectedTournament(tournament)}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#495057' }}>
                  {tournament.name}
                </h3>
                <p style={{ margin: '0 0 10px 0', color: '#6c757d', fontSize: '14px' }}>
                  {tournament.description}
                </p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                  <div>
                    <strong>Entry Fee:</strong> {tournament.entryFee} SOL
                  </div>
                  <div>
                    <strong>Prize Pool:</strong> {tournament.prizePool} SOL
                  </div>
                  <div>
                    <strong>Participants:</strong> {tournament.currentParticipants}/{tournament.maxParticipants}
                  </div>
                  <div>
                    <strong>Time Control:</strong> {formatTimeControl(tournament.rules.timeControl)}
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: getTournamentStatusColor(tournament.status),
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    marginBottom: '10px'
                  }}
                >
                  {tournament.status.toUpperCase()}
                </div>
                
                {tournament.status === 'registration' && userWallet && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinTournament(tournament);
                    }}
                    disabled={loading || tournament.currentParticipants >= tournament.maxParticipants}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: tournament.currentParticipants >= tournament.maxParticipants ? '#6c757d' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: tournament.currentParticipants >= tournament.maxParticipants ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Joining...' : 'Join Tournament'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tournament Details Modal */}
      {selectedTournament && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
          onClick={() => setSelectedTournament(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '30px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>{selectedTournament.name}</h2>
            <p>{selectedTournament.description}</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '20px 0' }}>
              <div>
                <h4>Tournament Info</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li><strong>Entry Fee:</strong> {selectedTournament.entryFee} SOL</li>
                  <li><strong>Prize Pool:</strong> {selectedTournament.prizePool} SOL</li>
                  <li><strong>Format:</strong> {selectedTournament.rules.format.replace('_', ' ')}</li>
                  <li><strong>Time Control:</strong> {formatTimeControl(selectedTournament.rules.timeControl)}</li>
                  <li><strong>Participants:</strong> {selectedTournament.currentParticipants}/{selectedTournament.maxParticipants}</li>
                </ul>
              </div>
              
              <div>
                <h4>Rules</h4>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  <li>• Single elimination format</li>
                  <li>• Rated games</li>
                  <li>• No takebacks</li>
                  <li>• Fair play enforced</li>
                  <li>• Winners advance to next round</li>
                </ul>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setSelectedTournament(null)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Tournament Form */}
      {showCreateForm && (
        <CreateTournamentForm
          onSubmit={handleCreateTournament}
          onCancel={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
};

interface CreateTournamentFormProps {
  onSubmit: (tournamentData: any) => Promise<void>;
  onCancel: () => void;
}

const CreateTournamentForm: React.FC<CreateTournamentFormProps> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    entryFee: 0.1,
    maxParticipants: 16,
    timeControl: { initialTime: 600, increment: 10 },
    format: 'single_elimination' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '500px',
          width: '90%'
        }}
      >
        <h3>Create New Tournament</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Tournament Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              required
            />
          </div>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', height: '80px' }}
              required
            />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Entry Fee (SOL)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={formData.entryFee}
                onChange={(e) => setFormData({ ...formData, entryFee: parseFloat(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                required
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Max Participants</label>
              <select
                value={formData.maxParticipants}
                onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value={8}>8 players</option>
                <option value={16}>16 players</option>
                <option value={32}>32 players</option>
                <option value={64}>64 players</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Time Control</label>
              <select
                value={`${formData.timeControl.initialTime}-${formData.timeControl.increment}`}
                onChange={(e) => {
                  const [initialTime, increment] = e.target.value.split('-').map(Number);
                  setFormData({ ...formData, timeControl: { initialTime, increment } });
                }}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="180-0">3+0 (Blitz)</option>
                <option value="300-0">5+0 (Blitz)</option>
                <option value="600-10">10+10 (Rapid)</option>
                <option value="900-15">15+15 (Rapid)</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Format</label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="single_elimination">Single Elimination</option>
                <option value="double_elimination">Double Elimination</option>
                <option value="swiss">Swiss System</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Create Tournament
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TournamentSystem; 