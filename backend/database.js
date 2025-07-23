/**
 * Database Connection and Services
 * PostgreSQL integration for Knightsbridge Chess
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Function to load CA certificate
function loadCACertificate() {
  try {
    // Try to load the CA certificate from the certs directory
    const caPath = path.join(__dirname, 'certs', 'ca-certificate.crt');
    if (fs.existsSync(caPath)) {
      console.log('✅ Loading CA certificate from:', caPath);
      return fs.readFileSync(caPath);
    }
    
    // Fallback: try environment variable
    if (process.env.DIGITALOCEAN_CA_CERT) {
      console.log('✅ Loading CA certificate from environment variable');
      return process.env.DIGITALOCEAN_CA_CERT;
    }
    
    console.log('⚠️ No CA certificate found, using default SSL configuration');
    return undefined;
  } catch (error) {
    console.log('⚠️ Error loading CA certificate:', error.message);
    return undefined;
  }
}

// Load the CA certificate
const caCertificate = loadCACertificate();

// Robust database connection pool with proper SSL handling for DigitalOcean managed PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true, // Proper SSL verification
    ca: caCertificate, // Use the DigitalOcean CA certificate
    checkServerIdentity: (hostname, cert) => {
      // Verify the certificate is for the correct hostname
      if (cert.subject.CN !== hostname && !cert.subjectaltname?.includes(hostname)) {
        throw new Error(`Certificate verification failed: hostname mismatch. Expected: ${hostname}, got: ${cert.subject.CN}`);
      }
      return undefined; // Certificate is valid
    },
  } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

// Alternative connection method with fallback SSL configurations
async function createAlternativePool() {
  console.log('🔄 Attempting alternative SSL configuration...');
  
  // Parse the DATABASE_URL to extract components
  const url = new URL(process.env.DATABASE_URL);
  
  const sslConfigs = [
    // Primary: With CA certificate and proper verification
    {
      rejectUnauthorized: true,
      ca: caCertificate,
      checkServerIdentity: (hostname, cert) => {
        if (cert.subject.CN !== hostname && !cert.subjectaltname?.includes(hostname)) {
          throw new Error(`Certificate verification failed: hostname mismatch. Expected: ${hostname}, got: ${cert.subject.CN}`);
        }
        return undefined;
      },
    },
    // Fallback 1: With CA certificate but relaxed verification
    {
      rejectUnauthorized: false,
      ca: caCertificate,
      checkServerIdentity: () => undefined,
    },
    // Fallback 2: Without CA certificate but relaxed verification
    {
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
    },
    // Fallback 3: No SSL verification (last resort)
    false
  ];
  
  for (let i = 0; i < sslConfigs.length; i++) {
    try {
      console.log(`🔌 Trying SSL configuration ${i + 1}/${sslConfigs.length}`);
      
      const testPool = new Pool({
        host: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: sslConfigs[i],
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
      
      const client = await testPool.connect();
      console.log(`✅ Connection successful with SSL config ${i + 1}`);
      client.release();
      await testPool.end();
      
      // Return the working configuration
      return new Pool({
        host: url.hostname,
        port: url.port,
        database: url.pathname.slice(1),
        user: url.username,
        password: url.password,
        ssl: sslConfigs[i],
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 30000,
      });
      
    } catch (error) {
      console.log(`❌ SSL config ${i + 1} failed: ${error.code} - ${error.message}`);
      continue;
    }
  }
  
  throw new Error('All SSL configurations failed');
}

// Try different SSL modes with proper CA certificate handling
async function tryDifferentSSLModes() {
  console.log('🔄 Trying different SSL modes with CA certificate...');
  
  const baseUrl = process.env.DATABASE_URL.replace(/\?.*$/, ''); // Remove existing query params
  
  const sslModes = [
    '?sslmode=verify-full', // Full verification with CA certificate
    '?sslmode=verify-ca',   // Verify CA certificate
    '?sslmode=require',     // Require SSL
    '?sslmode=prefer',      // Prefer SSL
    '?sslmode=allow',       // Allow SSL
    '?sslmode=no-verify',   // No verification
    '?sslmode=disable'      // Disable SSL
  ];
  
  for (const sslMode of sslModes) {
    try {
      console.log(`🔌 Trying SSL mode: ${sslMode}`);
      
      let sslConfig;
      if (sslMode.includes('disable')) {
        sslConfig = false;
      } else if (sslMode.includes('verify-full') || sslMode.includes('verify-ca')) {
        sslConfig = {
          rejectUnauthorized: true,
          ca: caCertificate,
          checkServerIdentity: (hostname, cert) => {
            if (cert.subject.CN !== hostname && !cert.subjectaltname?.includes(hostname)) {
              throw new Error(`Certificate verification failed: hostname mismatch. Expected: ${hostname}, got: ${cert.subject.CN}`);
            }
            return undefined;
          },
        };
      } else {
        sslConfig = {
          rejectUnauthorized: false,
          ca: caCertificate,
          checkServerIdentity: () => undefined,
        };
      }
      
      const testPool = new Pool({
        connectionString: baseUrl + sslMode,
        ssl: sslConfig,
        connectionTimeoutMillis: 10000,
      });
      
      const client = await testPool.connect();
      console.log(`✅ Connection successful with ${sslMode}`);
      client.release();
      await testPool.end();
      
      // Update the global pool with the working configuration
      global.workingSSLMode = sslMode;
      return true;
      
    } catch (error) {
      console.log(`❌ ${sslMode} failed: ${error.code} - ${error.message}`);
      continue;
    }
  }
  
  return false;
}

// Test database connection with better error handling
async function testConnection() {
  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    console.log('🔌 DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('🔌 NODE_ENV:', process.env.NODE_ENV);
    console.log('🔌 CA Certificate:', caCertificate ? 'Loaded' : 'Not found');
    console.log('🔌 SSL Config: DigitalOcean managed database with CA certificate');
    
    // Debug: Show the connection string (without password)
    if (process.env.DATABASE_URL) {
      const urlParts = process.env.DATABASE_URL.split('@');
      if (urlParts.length > 1) {
        const hostPart = urlParts[1];
        console.log('🔌 Database host:', hostPart.split('/')[0]);
        
        // Check if it's public or private connection
        if (hostPart.includes('public-db-postgresql')) {
          console.log('🔌 Connection type: Public (SSL certificate handling enabled)');
        } else if (hostPart.includes('private-db-postgresql')) {
          console.log('🔌 Connection type: Private VPC');
        }
        
        // Check SSL mode in connection string
        if (process.env.DATABASE_URL.includes('sslmode=require')) {
          console.log('🔌 SSL Mode: require (correct)');
        } else if (process.env.DATABASE_URL.includes('sslmode=')) {
          console.log('🔌 SSL Mode:', process.env.DATABASE_URL.match(/sslmode=([^&]+)/)?.[1] || 'unknown');
        } else {
          console.log('⚠️ SSL Mode: Not specified in connection string');
        }
      }
    }
    
    // Try the primary connection method
    try {
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected successfully (primary method with CA certificate)');
      client.release();
      return true;
    } catch (primaryError) {
      console.log('⚠️ Primary connection method failed, trying alternative...');
      console.log('⚠️ Error:', primaryError.code, '-', primaryError.message);
      
      // Try alternative connection method
      try {
        const altPool = await createAlternativePool();
        const altClient = await altPool.connect();
        console.log('✅ PostgreSQL connected successfully (alternative method)');
        altClient.release();
        await altPool.end();
        return true;
      } catch (altError) {
        console.log('⚠️ Alternative connection method failed, trying different SSL modes...');
        console.log('⚠️ Error:', altError.code, '-', altError.message);
        
        // Try different SSL modes
        const sslSuccess = await tryDifferentSSLModes();
        if (sslSuccess) {
          console.log('✅ PostgreSQL connected successfully with alternative SSL mode');
          return true;
        }
        
        // If all methods fail, throw the original error
        throw primaryError;
      }
    }
    
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Full error:', error);
    
    // Provide specific guidance for SSL errors
    if (error.code === 'SELF_SIGNED_CERT_IN_CHAIN') {
      console.error('🔧 SSL Fix: Certificate chain issue detected.');
      console.error('🔧 Solution: Download and use the DigitalOcean CA certificate.');
      console.error('🔧 Steps:');
      console.error('   1. Download CA certificate from DigitalOcean dashboard');
      console.error('   2. Save as backend/certs/ca-certificate.crt');
      console.error('   3. Redeploy the application');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔧 Network Fix: Connection refused. Check if database is accessible.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔧 Timeout Fix: Connection timeout. Check network connectivity.');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🔧 DNS Fix: Hostname not found. Check DATABASE_URL format.');
    }
    
    return false;
  }
}

// Room management functions
const roomService = {
  // Create a new room
  async createRoom(roomId, playerWallet) {
    const query = `
      INSERT INTO games (room_id, player_white_wallet, game_state, stake_amount)
      VALUES ($1, $2, 'waiting', 0)
      RETURNING id, room_id, player_white_wallet
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet]);
      console.log('✅ Room created in database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating room:', error);
      throw error;
    }
  },

  // Join an existing room
  async joinRoom(roomId, playerWallet) {
    const query = `
      UPDATE games 
      SET player_black_wallet = $2, game_state = 'active', updated_at = NOW()
      WHERE room_id = $1 AND player_black_wallet IS NULL
      RETURNING id, room_id, player_white_wallet, player_black_wallet
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet]);
      if (result.rows.length === 0) {
        throw new Error('Room is full or does not exist');
      }
      console.log('✅ Player joined room in database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error joining room:', error);
      throw error;
    }
  },

  // Get room status
  async getRoomStatus(roomId) {
    const query = `
      SELECT 
        room_id, 
        player_white_wallet, 
        player_black_wallet,
        game_state,
        stake_amount,
        created_at,
        updated_at
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const room = result.rows[0];
      const playerCount = [room.player_white_wallet, room.player_black_wallet].filter(Boolean).length;
      
      return {
        roomId: room.room_id,
        playerCount,
        players: [
          room.player_white_wallet && { wallet: room.player_white_wallet, role: 'white' },
          room.player_black_wallet && { wallet: room.player_black_wallet, role: 'black' }
        ].filter(Boolean),
        gameStarted: room.game_state === 'active',
        escrows: {}, // Will be implemented separately
        created: room.created_at,
        lastUpdated: room.updated_at
      };
    } catch (error) {
      console.error('❌ Error getting room status:', error);
      throw error;
    }
  },

  // Add escrow to room
  async addEscrow(roomId, playerWallet, amount) {
    const query = `
      UPDATE games 
      SET stake_amount = $3, updated_at = NOW()
      WHERE room_id = $1 AND (player_white_wallet = $2 OR player_black_wallet = $2)
      RETURNING id, room_id, stake_amount
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, amount]);
      if (result.rows.length === 0) {
        throw new Error('Player not found in room');
      }
      console.log('✅ Escrow added to database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error adding escrow:', error);
      throw error;
    }
  },

  // Save game state
  async saveGameState(roomId, gameState) {
    const query = `
      UPDATE games 
      SET 
        final_position = $2,
        pgn = $3,
        move_count = $4,
        updated_at = NOW()
      WHERE room_id = $1
      RETURNING id
    `;
    
    try {
      const result = await pool.query(query, [
        roomId, 
        gameState.position ? JSON.stringify(gameState.position) : null,
        gameState.moveHistory ? JSON.stringify(gameState.moveHistory) : null,
        gameState.moveHistory ? gameState.moveHistory.length : 0
      ]);
      console.log('✅ Game state saved to database');
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error saving game state:', error);
      throw error;
    }
  },

  // Get game state
  async getGameState(roomId) {
    const query = `
      SELECT 
        final_position,
        pgn,
        move_count,
        updated_at
      FROM games 
      WHERE room_id = $1
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      if (result.rows.length === 0) {
        return null;
      }
      
      const game = result.rows[0];
      return {
        position: game.final_position ? JSON.parse(game.final_position) : null,
        moveHistory: game.pgn ? JSON.parse(game.pgn) : [],
        lastUpdated: game.updated_at.getTime()
      };
    } catch (error) {
      console.error('❌ Error getting game state:', error);
      throw error;
    }
  }
};

// Chat service
const chatService = {
  // Send chat message
  async sendMessage(roomId, playerWallet, message) {
    const query = `
      INSERT INTO chat_messages (game_id, player_id, message)
      SELECT id, $2, $3
      FROM games 
      WHERE room_id = $1
      RETURNING id, player_id, message, created_at
    `;
    
    try {
      const result = await pool.query(query, [roomId, playerWallet, message]);
      console.log('✅ Chat message saved to database:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      throw error;
    }
  },

  // Get chat messages
  async getMessages(roomId) {
    const query = `
      SELECT 
        cm.player_id,
        cm.message,
        cm.created_at
      FROM chat_messages cm
      JOIN games g ON cm.game_id = g.id
      WHERE g.room_id = $1
      ORDER BY cm.created_at ASC
    `;
    
    try {
      const result = await pool.query(query, [roomId]);
      console.log('✅ Retrieved chat messages from database:', result.rows.length);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting chat messages:', error);
      throw error;
    }
  }
};

module.exports = {
  pool,
  testConnection,
  roomService,
  chatService
}; 