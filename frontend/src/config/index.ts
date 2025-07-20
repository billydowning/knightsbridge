/**
 * Configuration Index
 * Centralized exports for all configuration files
 */

// Solana configuration
export * from './solanaConfig';

// Game configuration
export * from './gameConfig';

// Application configuration
export * from './appConfig';

// Re-export commonly used configs as named exports for convenience
export { 
  CHESS_PROGRAM_ID, 
  FEE_WALLET_ADDRESS, 
  SOLANA_NETWORK,
  MIN_BET_AMOUNT,
  MAX_BET_AMOUNT,
  DEFAULT_BET_AMOUNT 
} from './solanaConfig';

export { 
  CHESS_RULES, 
  ROOM_CONFIG, 
  UI_CONFIG,
  CHESS_PIECES,
  GAME_ERROR_MESSAGES,
  GAME_SUCCESS_MESSAGES 
} from './gameConfig';

export { 
  APP_CONFIG, 
  ENV_CONFIG, 
  THEME_CONFIG 
} from './appConfig';