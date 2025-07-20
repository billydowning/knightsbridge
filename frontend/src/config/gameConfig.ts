/**
 * Game Configuration
 * Centralized configuration for chess game mechanics and UI
 */

// Game Rules Configuration
export const CHESS_RULES = {
  // Standard chess rules
  BOARD_SIZE: 8,
  MAX_MOVES_WITHOUT_CAPTURE_OR_PAWN: 100, // 50-move rule (100 half-moves)
  INITIAL_CASTLING_RIGHTS: 'KQkq',
  
  // Game timeouts
  MOVE_TIMEOUT_MINUTES: 10, // Time limit per move (0 = no limit)
  GAME_TIMEOUT_HOURS: 24, // Maximum game duration
  
  // Auto-draw conditions
  ENABLE_THREEFOLD_REPETITION: true,
  ENABLE_FIFTY_MOVE_RULE: true,
  ENABLE_INSUFFICIENT_MATERIAL: true,
} as const;

// Room Configuration
export const ROOM_CONFIG = {
  MAX_PLAYERS: 2,
  ROOM_ID_LENGTH: 6,
  ROOM_ID_PREFIX: 'ROOM-',
  AUTO_START_WITH_ESCROWS: true,
  ROOM_EXPIRY_HOURS: 48, // Rooms expire after 48 hours of inactivity
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Chess board styling
  BOARD: {
    SQUARE_SIZE: 60, // pixels
    LIGHT_SQUARE_COLOR: '#f0d9b5',
    DARK_SQUARE_COLOR: '#b58863',
    SELECTED_SQUARE_COLOR: '#ffd700',
    LEGAL_MOVE_COLOR: '#90EE90',
    CHECK_COLOR: '#ff6b6b',
    BORDER_WIDTH: 4,
    BORDER_COLOR: '#333',
  },
  
  // Move hints
  MOVE_HINTS: {
    SHOW_LEGAL_MOVES: true,
    EMPTY_SQUARE_INDICATOR_SIZE: 20,
    CAPTURE_INDICATOR_SIZE: 15,
    MOVE_ANIMATION_DURATION: 300, // milliseconds
  },
  
  // Status messages
  STATUS_DISPLAY_DURATION: 3000, // milliseconds
  AUTO_HIDE_SUCCESS_MESSAGES: true,
  
  // Responsive breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1200,
  },
} as const;

// Multiplayer Configuration
export const MULTIPLAYER_CONFIG = {
  // Storage keys
  ROOMS_STORAGE_KEY: 'chess-rooms-shared',
  GAME_STATE_STORAGE_KEY: 'chess-game-state',
  SYNC_TRIGGER_KEY: 'chess-sync-trigger',
  
  // Sync settings
  SYNC_DELAY_MS: 50,
  MAX_SYNC_RETRIES: 3,
  HEARTBEAT_INTERVAL_MS: 5000,
  
  // Room management
  MAX_ROOMS_PER_PLAYER: 5,
  CLEANUP_INTERVAL_HOURS: 1,
} as const;

// Error Messages
export const GAME_ERROR_MESSAGES = {
  // Move validation
  NO_PIECE_SELECTED: 'No piece selected',
  NOT_YOUR_PIECE: 'Not your piece',
  ILLEGAL_MOVE: 'Illegal move',
  MUST_GET_OUT_OF_CHECK: 'You must get out of check!',
  INVALID_MOVE: 'Invalid move',
  PIECE_HAS_NO_MOVES: 'This piece has no legal moves!',
  
  // Game state
  GAME_NOT_ACTIVE: 'Game is not active',
  NOT_YOUR_TURN: 'Not your turn',
  GAME_ALREADY_ENDED: 'Game has already ended',
  
  // Room management
  ROOM_NOT_FOUND: 'Room not found or full. Please check the room ID.',
  ROOM_FULL: 'Room is full',
  ALREADY_IN_ROOM: 'You are already in this room',
  FAILED_TO_CREATE_ROOM: 'Failed to create room. Please try again.',
  
  // General
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  NETWORK_ERROR: 'Network error. Please check your connection.',
} as const;

// Success Messages
export const GAME_SUCCESS_MESSAGES = {
  ROOM_CREATED: 'Room created successfully!',
  ROOM_JOINED: 'Successfully joined room!',
  ESCROW_CREATED: 'Escrow created successfully!',
  GAME_STARTED: 'Game started! Good luck!',
  MOVE_MADE: 'Move made successfully!',
  WINNINGS_CLAIMED: 'Winnings claimed successfully!',
} as const;

// Game Status Messages
export const GAME_STATUS = {
  // Turn indicators
  YOUR_TURN: 'Your turn!',
  OPPONENT_TURN: 'Opponent\'s turn',
  WHITE_TURN: 'White\'s turn',
  BLACK_TURN: 'Black\'s turn',
  
  // Game states
  GAME_NOT_STARTED: 'Game not started',
  WAITING_FOR_OPPONENT: 'Waiting for opponent...',
  GAME_IN_PROGRESS: 'Game in progress',
  
  // End conditions
  CHECKMATE: 'Checkmate!',
  STALEMATE: 'Stalemate!',
  DRAW_BY_FIFTY_MOVES: 'Draw by 50-move rule!',
  DRAW_BY_REPETITION: 'Draw by threefold repetition!',
  DRAW_BY_INSUFFICIENT_MATERIAL: 'Draw by insufficient material!',
  RESIGNATION: 'wins by resignation!',
  
  // Check states
  IN_CHECK: 'is in check!',
  
  // Results
  YOU_WIN: 'You Win! 🏆',
  YOU_LOSE: 'You Lose 😔',
  DRAW: 'Draw 🤝',
  YOU_WIN_BY_RESIGNATION: 'You Win by Resignation! 🏳️',
  YOU_LOSE_BY_RESIGNATION: 'You Lost by Resignation 🏳️',
} as const;

// Piece Symbols (Unicode chess pieces)
export const CHESS_PIECES = {
  WHITE: {
    KING: '♔',
    QUEEN: '♕',
    ROOK: '♖',
    BISHOP: '♗',
    KNIGHT: '♘',
    PAWN: '♙',
  },
  BLACK: {
    KING: '♚',
    QUEEN: '♛',
    ROOK: '♜',
    BISHOP: '♝',
    KNIGHT: '♞',
    PAWN: '♟',
  },
} as const;

// Animation Configuration
export const ANIMATIONS = {
  PIECE_MOVE_DURATION: 300,
  BOARD_FLIP_DURATION: 500,
  FADE_IN_DURATION: 200,
  FADE_OUT_DURATION: 200,
  BOUNCE_DURATION: 600,
  
  // Easing functions
  EASE_IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  EASE_OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  EASE_IN: 'cubic-bezier(0.4, 0, 1, 1)',
} as const;

// Development Configuration
export const DEV_CONFIG = {
  ENABLE_DEBUG_LOGGING: import.meta.env.MODE === 'development',
  ENABLE_MOVE_VALIDATION_LOGGING: false,
  SHOW_COORDINATES: import.meta.env.MODE === 'development',
  ENABLE_PERFORMANCE_MONITORING: false,
} as const;