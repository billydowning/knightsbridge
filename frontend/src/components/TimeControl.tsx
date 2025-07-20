/**
 * Time Control Component
 * Manages chess game time limits, clocks, and time controls
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface TimeControl {
  initialTime: number; // seconds
  increment: number; // seconds per move
  timeLimit: number; // maximum game time
  isBlitz: boolean;
  isBullet: boolean;
  isRapid: boolean;
  isClassical: boolean;
}

export interface PlayerClock {
  timeRemaining: number; // seconds
  isActive: boolean;
  lastMoveTime: number;
  moveCount: number;
}

export interface TimeControlProps {
  timeControl: TimeControl;
  whiteClock: PlayerClock;
  blackClock: PlayerClock;
  currentPlayer: 'white' | 'black';
  gameActive: boolean;
  onTimeOut: (player: 'white' | 'black') => void;
  onMoveComplete: () => void;
}

export const TimeControl: React.FC<TimeControlProps> = ({
  timeControl,
  whiteClock,
  blackClock,
  currentPlayer,
  gameActive,
  onTimeOut,
  onMoveComplete
}) => {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second
  useEffect(() => {
    if (!gameActive) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [gameActive]);

  // Check for timeouts
  useEffect(() => {
    if (!gameActive) return;

    const checkTimeouts = () => {
      if (whiteClock.isActive && whiteClock.timeRemaining <= 0) {
        onTimeOut('white');
      }
      if (blackClock.isActive && blackClock.timeRemaining <= 0) {
        onTimeOut('black');
      }
    };

    checkTimeouts();
  }, [whiteClock, blackClock, gameActive, onTimeOut]);

  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const getTimeControlName = (): string => {
    if (timeControl.isBullet) return 'Bullet';
    if (timeControl.isBlitz) return 'Blitz';
    if (timeControl.isRapid) return 'Rapid';
    if (timeControl.isClassical) return 'Classical';
    return 'Custom';
  };

  const getTimeControlDescription = (): string => {
    const minutes = Math.floor(timeControl.initialTime / 60);
    const seconds = timeControl.initialTime % 60;
    const increment = timeControl.increment;
    
    if (increment === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}+${increment}`;
    }
  };

  const getClockStyle = (player: 'white' | 'black'): React.CSSProperties => {
    const isCurrentPlayer = currentPlayer === player;
    const clock = player === 'white' ? whiteClock : blackClock;
    const isLowTime = clock.timeRemaining < 30; // Less than 30 seconds
    
    return {
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: isCurrentPlayer ? '#e3f2fd' : '#f5f5f5',
      border: isCurrentPlayer ? '2px solid #2196f3' : '1px solid #ddd',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '18px',
      color: isLowTime ? '#f44336' : '#333',
      transition: 'all 0.3s ease',
      animation: isLowTime ? 'pulse 1s infinite' : 'none'
    };
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px', 
        padding: '20px',
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ marginBottom: '15px', color: '#495057' }}>
          ⏱️ Time Control: {getTimeControlName()} ({getTimeControlDescription()})
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {/* White Clock */}
          <div style={getClockStyle('white')}>
            <div style={{ fontSize: '14px', marginBottom: '5px', color: '#666' }}>
              White
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatTime(whiteClock.timeRemaining)}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
              Moves: {whiteClock.moveCount}
            </div>
          </div>
          
          {/* Black Clock */}
          <div style={getClockStyle('black')}>
            <div style={{ fontSize: '14px', marginBottom: '5px', color: '#666' }}>
              Black
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
              {formatTime(blackClock.timeRemaining)}
            </div>
            <div style={{ fontSize: '12px', marginTop: '5px', color: '#666' }}>
              Moves: {blackClock.moveCount}
            </div>
          </div>
        </div>
        
        {/* Time Control Info */}
        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: 'white', 
          borderRadius: '5px',
          fontSize: '12px',
          color: '#666'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div>
              <strong>Initial Time:</strong> {formatTime(timeControl.initialTime)}
            </div>
            <div>
              <strong>Increment:</strong> +{timeControl.increment}s/move
            </div>
            <div>
              <strong>Time Limit:</strong> {formatTime(timeControl.timeLimit)}
            </div>
            <div>
              <strong>Current Player:</strong> {currentPlayer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Time Control Presets
export const TIME_CONTROL_PRESETS: Record<string, TimeControl> = {
  bullet_1_0: {
    initialTime: 60,
    increment: 0,
    timeLimit: 60,
    isBullet: true,
    isBlitz: false,
    isRapid: false,
    isClassical: false
  },
  bullet_2_1: {
    initialTime: 120,
    increment: 1,
    timeLimit: 180,
    isBullet: true,
    isBlitz: false,
    isRapid: false,
    isClassical: false
  },
  blitz_3_0: {
    initialTime: 180,
    increment: 0,
    timeLimit: 180,
    isBullet: false,
    isBlitz: true,
    isRapid: false,
    isClassical: false
  },
  blitz_5_0: {
    initialTime: 300,
    increment: 0,
    timeLimit: 300,
    isBullet: false,
    isBlitz: true,
    isRapid: false,
    isClassical: false
  },
  rapid_10_0: {
    initialTime: 600,
    increment: 0,
    timeLimit: 600,
    isBullet: false,
    isBlitz: false,
    isRapid: true,
    isClassical: false
  },
  rapid_15_10: {
    initialTime: 900,
    increment: 10,
    timeLimit: 1200,
    isBullet: false,
    isBlitz: false,
    isRapid: true,
    isClassical: false
  },
  classical_30_0: {
    initialTime: 1800,
    increment: 0,
    timeLimit: 1800,
    isBullet: false,
    isBlitz: false,
    isRapid: false,
    isClassical: true
  }
};

// Time Control Selector Component
export interface TimeControlSelectorProps {
  selectedTimeControl: TimeControl;
  onTimeControlChange: (timeControl: TimeControl) => void;
}

export const TimeControlSelector: React.FC<TimeControlSelectorProps> = ({
  selectedTimeControl,
  onTimeControlChange
}) => {
  const getPresetName = (preset: TimeControl): string => {
    const minutes = Math.floor(preset.initialTime / 60);
    const seconds = preset.initialTime % 60;
    const increment = preset.increment;
    
    if (increment === 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}+${increment}`;
    }
  };

  const getPresetType = (preset: TimeControl): string => {
    if (preset.isBullet) return 'Bullet';
    if (preset.isBlitz) return 'Blitz';
    if (preset.isRapid) return 'Rapid';
    if (preset.isClassical) return 'Classical';
    return 'Custom';
  };

  return (
    <div style={{ margin: '20px 0' }}>
      <h4 style={{ marginBottom: '10px', color: '#495057' }}>Select Time Control</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
        {Object.entries(TIME_CONTROL_PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => onTimeControlChange(preset)}
            style={{
              padding: '10px',
              border: selectedTimeControl === preset ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '5px',
              backgroundColor: selectedTimeControl === preset ? '#e3f2fd' : 'white',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{getPresetName(preset)}</div>
            <div style={{ fontSize: '10px', color: '#666' }}>{getPresetType(preset)}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Custom Time Control Creator
export interface CustomTimeControlProps {
  onTimeControlCreate: (timeControl: TimeControl) => void;
}

export const CustomTimeControl: React.FC<CustomTimeControlProps> = ({ onTimeControlCreate }) => {
  const [customTime, setCustomTime] = useState({
    initialMinutes: 10,
    initialSeconds: 0,
    increment: 0,
    timeLimit: 600
  });

  const handleCreate = () => {
    const timeControl: TimeControl = {
      initialTime: customTime.initialMinutes * 60 + customTime.initialSeconds,
      increment: customTime.increment,
      timeLimit: customTime.timeLimit,
      isBullet: customTime.initialMinutes * 60 + customTime.initialSeconds < 180,
      isBlitz: customTime.initialMinutes * 60 + customTime.initialSeconds >= 180 && customTime.initialMinutes * 60 + customTime.initialSeconds < 600,
      isRapid: customTime.initialMinutes * 60 + customTime.initialSeconds >= 600 && customTime.initialMinutes * 60 + customTime.initialSeconds < 1800,
      isClassical: customTime.initialMinutes * 60 + customTime.initialSeconds >= 1800
    };
    
    onTimeControlCreate(timeControl);
  };

  return (
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      borderRadius: '8px', 
      padding: '20px',
      border: '1px solid #e9ecef'
    }}>
      <h4 style={{ marginBottom: '15px', color: '#495057' }}>Custom Time Control</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Initial Minutes</label>
          <input
            type="number"
            min="0"
            max="60"
            value={customTime.initialMinutes}
            onChange={(e) => setCustomTime({ ...customTime, initialMinutes: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Initial Seconds</label>
          <input
            type="number"
            min="0"
            max="59"
            value={customTime.initialSeconds}
            onChange={(e) => setCustomTime({ ...customTime, initialSeconds: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Increment (seconds)</label>
          <input
            type="number"
            min="0"
            max="60"
            value={customTime.increment}
            onChange={(e) => setCustomTime({ ...customTime, increment: parseInt(e.target.value) || 0 })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>Time Limit (seconds)</label>
          <input
            type="number"
            min="60"
            value={customTime.timeLimit}
            onChange={(e) => setCustomTime({ ...customTime, timeLimit: parseInt(e.target.value) || 600 })}
            style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
          />
        </div>
      </div>
      
      <button
        onClick={handleCreate}
        style={{
          marginTop: '15px',
          padding: '10px 20px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Create Custom Time Control
      </button>
    </div>
  );
};

export default TimeControl; 