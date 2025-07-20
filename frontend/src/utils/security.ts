/**
 * Security Utilities
 * Input sanitization, validation, and security functions
 */

/**
 * Sanitize room ID to prevent injection attacks
 * @param roomId - Raw room ID input
 * @returns Sanitized room ID
 */
export const sanitizeRoomId = (roomId: string): string => {
  if (!roomId) return '';
  
  // Remove any non-alphanumeric characters except hyphens
  const sanitized = roomId.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Limit length to 32 characters
  return sanitized.substring(0, 32);
};

/**
 * Validate bet amount
 * @param amount - Bet amount in SOL
 * @returns Validation result
 */
export const validateBetAmount = (amount: number): { valid: boolean; error?: string } => {
  const MIN_BET = 0.1;
  const MAX_BET = 100;
  
  if (amount < MIN_BET) {
    return { valid: false, error: `Minimum bet is ${MIN_BET} SOL` };
  }
  
  if (amount > MAX_BET) {
    return { valid: false, error: `Maximum bet is ${MAX_BET} SOL` };
  }
  
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Invalid bet amount' };
  }
  
  return { valid: true };
};

/**
 * Sanitize move notation
 * @param move - Raw move input
 * @returns Sanitized move
 */
export const sanitizeMove = (move: string): string => {
  if (!move) return '';
  
  // Only allow valid chess notation characters
  const sanitized = move.replace(/[^a-h1-8x+=#+]/g, '');
  
  // Limit length
  return sanitized.substring(0, 10);
};

/**
 * Validate wallet address format
 * @param address - Wallet address to validate
 * @returns Validation result
 */
export const validateWalletAddress = (address: string): { valid: boolean; error?: string } => {
  if (!address) {
    return { valid: false, error: 'Wallet address is required' };
  }
  
  // Basic Solana address validation (base58, 32-44 characters)
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!base58Regex.test(address)) {
    return { valid: false, error: 'Invalid wallet address format' };
  }
  
  return { valid: true };
};

/**
 * Sanitize player role
 * @param role - Player role input
 * @returns Sanitized role
 */
export const sanitizePlayerRole = (role: string): 'white' | 'black' | null => {
  const normalized = role.toLowerCase().trim();
  
  if (normalized === 'white' || normalized === 'black') {
    return normalized as 'white' | 'black';
  }
  
  return null;
};

/**
 * Validate game state data
 * @param gameState - Game state to validate
 * @returns Validation result
 */
export const validateGameState = (gameState: any): { valid: boolean; error?: string } => {
  if (!gameState || typeof gameState !== 'object') {
    return { valid: false, error: 'Invalid game state format' };
  }
  
  // Check required fields
  const requiredFields = ['position', 'currentPlayer', 'gameActive'];
  for (const field of requiredFields) {
    if (!(field in gameState)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  
  // Validate current player
  if (!['white', 'black'].includes(gameState.currentPlayer)) {
    return { valid: false, error: 'Invalid current player' };
  }
  
  // Validate game active
  if (typeof gameState.gameActive !== 'boolean') {
    return { valid: false, error: 'Invalid game active status' };
  }
  
  return { valid: true };
};

/**
 * Sanitize transaction data
 * @param transaction - Transaction data to sanitize
 * @returns Sanitized transaction
 */
export const sanitizeTransaction = (transaction: any): any => {
  if (!transaction || typeof transaction !== 'object') {
    return null;
  }
  
  // Only allow specific fields
  const allowedFields = ['from', 'to', 'amount', 'signature'];
  const sanitized: any = {};
  
  for (const field of allowedFields) {
    if (transaction[field] !== undefined) {
      sanitized[field] = transaction[field];
    }
  }
  
  return sanitized;
};

/**
 * Rate limiting utility
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;
  
  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }
  
  /**
   * Check if request is allowed
   * @param identifier - Unique identifier (e.g., IP address, user ID)
   * @returns Whether request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    if (!this.requests.has(identifier)) {
      this.requests.set(identifier, [now]);
      return true;
    }
    
    const userRequests = this.requests.get(identifier)!;
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Clear old entries to prevent memory leaks
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * XSS prevention - escape HTML
 * @param str - String to escape
 * @returns Escaped string
 */
export const escapeHtml = (str: string): string => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * CSRF token generation
 * @returns CSRF token
 */
export const generateCSRFToken = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Validate and sanitize all user inputs
 * @param inputs - Object containing user inputs
 * @returns Sanitized inputs
 */
export const sanitizeInputs = (inputs: Record<string, any>): Record<string, any> => {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'number') {
      sanitized[key] = Number.isFinite(value) ? value : 0;
    } else if (typeof value === 'boolean') {
      sanitized[key] = Boolean(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}; 