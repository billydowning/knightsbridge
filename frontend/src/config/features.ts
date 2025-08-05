/**
 * Toyota Feature Flag System
 * 
 * RULES:
 * 1. ALL new features must be behind flags
 * 2. Features default to FALSE (disabled)
 * 3. Features can be instantly disabled if they break baseline
 * 4. Environment variables allow per-deployment control
 */

export const FEATURES = {
  // Reconnection system - can be disabled instantly if it breaks basic flow
  RECONNECTION: process.env.VITE_ENABLE_RECONNECTION === 'true',
  
  // Game history feature - caused major instability before
  GAME_HISTORY: process.env.VITE_ENABLE_GAME_HISTORY === 'true',
  
  // Advanced analytics and tracking
  ANALYTICS: process.env.VITE_ENABLE_ANALYTICS === 'true',
  
  // Performance monitoring and debug logging
  DEBUG_LOGGING: process.env.VITE_ENABLE_DEBUG === 'true',
  
  // Enhanced UI features that might interfere with core flow
  ENHANCED_UI: process.env.VITE_ENABLE_ENHANCED_UI === 'true',
  
  // Tournament system
  TOURNAMENTS: false, // Not ready yet
  
  // AI opponent
  AI_OPPONENT: false, // Future feature
  
} as const;

// Helper to check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development';

// Helper to safely enable features only in development
export const devOnlyFeature = (flag: boolean) => isDevelopment && flag;

// Feature status for debugging
export const getFeatureStatus = () => {
  return Object.entries(FEATURES).map(([key, value]) => ({
    feature: key,
    enabled: value,
    source: process.env[`VITE_ENABLE_${key}`] ? 'env' : 'default'
  }));
};