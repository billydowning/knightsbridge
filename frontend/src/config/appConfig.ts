/**
 * Application Configuration
 * Main application settings and metadata
 */

// Application Metadata
export const APP_CONFIG = {
  NAME: 'Knightsbridge Chess',
  VERSION: '1.0.0',
  DESCRIPTION: 'Play chess with SOL stakes on Solana blockchain',
  AUTHOR: 'Knightsbridge Team',
  
  // URLs and Links
  WEBSITE_URL: 'https://knightsbridge-chess.com',
  SUPPORT_EMAIL: 'support@knightsbridge-chess.com',
  GITHUB_URL: 'https://github.com/knightsbridge-chess',
  TWITTER_URL: 'https://twitter.com/knightsbridge_chess',
  DISCORD_URL: 'https://discord.gg/knightsbridge-chess',
  
  // Legal
  TERMS_URL: 'https://knightsbridge-chess.com/terms',
  PRIVACY_URL: 'https://knightsbridge-chess.com/privacy',
} as const;

/**
 * Application Configuration
 * Main application settings and metadata
 */

// Environment Configuration
export const ENV_CONFIG = {
  IS_PRODUCTION: import.meta.env.MODE === 'production',
  IS_DEVELOPMENT: import.meta.env.MODE === 'development',
  IS_TEST: import.meta.env.MODE === 'test',
  
  // API endpoints (DigitalOcean backend)
  API_BASE_URL: import.meta.env.VITE_API_URL || 'https://knightsbridge-app-35xls.ondigitalocean.app/knightsbridge2',
  WEBSOCKET_URL: import.meta.env.VITE_WS_URL || 'wss://knightsbridge-app-35xls.ondigitalocean.app',
  
  // Feature flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE === 'true',
} as const;

// UI Theme Configuration
export const THEME_CONFIG = {
  COLORS: {
    // Primary colors
    PRIMARY: '#1976d2',
    PRIMARY_LIGHT: '#42a5f5',
    PRIMARY_DARK: '#1565c0',
    
    // Secondary colors
    SECONDARY: '#f57c00',
    SECONDARY_LIGHT: '#ffb74d',
    SECONDARY_DARK: '#ef6c00',
    
    // Status colors
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3',
    
    // Neutral colors
    BACKGROUND: '#f5f5f5',
    SURFACE: '#ffffff',
    ON_SURFACE: '#212121',
    ON_BACKGROUND: '#424242',
    
    // Chess-specific colors
    WHITE_PIECES: '#ffffff',
    BLACK_PIECES: '#000000',
    BOARD_LIGHT: '#f0d9b5',
    BOARD_DARK: '#b58863',
  },
  
  TYPOGRAPHY: {
    FONT_FAMILY: '"Roboto", "Helvetica", "Arial", sans-serif',
    HEADING_FONT: '"Merriweather", serif',
    MONOSPACE_FONT: '"Fira Code", "Monaco", monospace',
    
    FONT_SIZES: {
      XS: '0.75rem',   // 12px
      SM: '0.875rem',  // 14px
      MD: '1rem',      // 16px
      LG: '1.125rem',  // 18px
      XL: '1.25rem',   // 20px
      '2XL': '1.5rem', // 24px
      '3XL': '1.875rem', // 30px
      '4XL': '2.25rem',  // 36px
    },
    
    FONT_WEIGHTS: {
      LIGHT: 300,
      NORMAL: 400,
      MEDIUM: 500,
      SEMIBOLD: 600,
      BOLD: 700,
    },
  },
  
  SPACING: {
    XS: '0.25rem',  // 4px
    SM: '0.5rem',   // 8px
    MD: '1rem',     // 16px
    LG: '1.5rem',   // 24px
    XL: '2rem',     // 32px
    '2XL': '3rem',  // 48px
    '3XL': '4rem',  // 64px
  },
  
  BORDER_RADIUS: {
    SM: '0.25rem',  // 4px
    MD: '0.5rem',   // 8px
    LG: '0.75rem',  // 12px
    XL: '1rem',     // 16px
    FULL: '9999px', // circular
  },
  
  SHADOWS: {
    SM: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    MD: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    LG: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    XL: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
} as const;

// Performance Configuration
export const PERFORMANCE_CONFIG = {
  // React optimization
  ENABLE_CONCURRENT_FEATURES: true,
  ENABLE_AUTOMATIC_BATCHING: true,
  
  // Bundle optimization
  ENABLE_CODE_SPLITTING: true,
  ENABLE_TREE_SHAKING: true,
  
  // Rendering optimization
  DEBOUNCE_DELAY_MS: 300,
  THROTTLE_DELAY_MS: 100,
  
  // Memory management
  MAX_HISTORY_ENTRIES: 1000,
  CLEANUP_INTERVAL_MS: 60000, // 1 minute
} as const;

// Accessibility Configuration
export const A11Y_CONFIG = {
  ENABLE_SCREEN_READER_SUPPORT: true,
  ENABLE_KEYBOARD_NAVIGATION: true,
  ENABLE_HIGH_CONTRAST_MODE: false,
  ENABLE_REDUCED_MOTION: false,
  
  // ARIA labels
  ARIA_LABELS: {
    CHESS_BOARD: 'Chess board',
    CHESS_SQUARE: 'Chess square',
    SELECTED_PIECE: 'Selected piece',
    LEGAL_MOVE: 'Legal move available',
    CAPTURE_MOVE: 'Capture available',
    IN_CHECK: 'King in check',
  },
} as const;

// Analytics Configuration (if you add analytics later)
export const ANALYTICS_CONFIG = {
  GOOGLE_ANALYTICS_ID: import.meta.env.VITE_GA_ID || '',
  ENABLE_PAGE_TRACKING: ENV_CONFIG.ENABLE_ANALYTICS,
  ENABLE_EVENT_TRACKING: ENV_CONFIG.ENABLE_ANALYTICS,
  ENABLE_USER_TRACKING: ENV_CONFIG.ENABLE_ANALYTICS,
  
  // Events to track
  TRACK_EVENTS: {
    GAME_STARTED: 'game_started',
    GAME_ENDED: 'game_ended',
    MOVE_MADE: 'move_made',
    ESCROW_CREATED: 'escrow_created',
    WINNINGS_CLAIMED: 'winnings_claimed',
  },
} as const;

// Storage Configuration
export const STORAGE_CONFIG = {
  // localStorage keys
  KEYS: {
    USER_PREFERENCES: 'chess_user_preferences',
    GAME_HISTORY: 'chess_game_history',
    ROOM_CACHE: 'chess_room_cache',
    WALLET_CACHE: 'chess_wallet_cache',
  },
  
  // Cache TTL
  CACHE_TTL_MS: {
    USER_PREFERENCES: 30 * 24 * 60 * 60 * 1000, // 30 days
    GAME_HISTORY: 7 * 24 * 60 * 60 * 1000,      // 7 days
    ROOM_CACHE: 24 * 60 * 60 * 1000,            // 24 hours
    WALLET_CACHE: 60 * 60 * 1000,               // 1 hour
  },
} as const;