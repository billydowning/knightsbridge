const { Connection, PublicKey } = require('@solana/web3.js');

async function checkGameState(roomId) {
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  const CHESS_PROGRAM_ID = 'F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr';
  
  console.log('🔍 Checking room:', roomId);
  
  try {
    // Derive the game escrow PDA
    const [gameEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), Buffer.from(roomId)],
      new PublicKey(CHESS_PROGRAM_ID)
    );
    
    console.log('🔍 Game Escrow PDA:', gameEscrowPda.toString());
    
    // Fetch account data
    const accountInfo = await connection.getAccountInfo(gameEscrowPda);
    if (!accountInfo) {
      console.log('❌ Game escrow account not found');
      return;
    }
    
    console.log('✅ Account found! Data length:', accountInfo.data.length);
    
    // Parse the account data manually
    let offset = 8; // Skip discriminator
    
    // Parse room_id
    const roomIdLength = accountInfo.data.readUInt32LE(offset); offset += 4;
    const roomIdBytes = accountInfo.data.slice(offset, offset + roomIdLength);
    const parsedRoomId = roomIdBytes.toString('utf8'); offset += roomIdLength;
    
    // Parse player_white (32 bytes)
    const playerWhiteBytes = accountInfo.data.slice(offset, offset + 32);
    const playerWhite = new PublicKey(playerWhiteBytes); offset += 32;
    
    // Parse player_black (option - 1 byte for is_some, then 32 bytes if some)
    const hasPlayerBlack = accountInfo.data[offset] === 1; offset += 1;
    let playerBlack = null;
    if (hasPlayerBlack) {
      const playerBlackBytes = accountInfo.data.slice(offset, offset + 32);
      playerBlack = new PublicKey(playerBlackBytes); offset += 32;
    } else { 
      offset += 32; // Skip the 32 zero bytes
    }
    
    // Parse stake_amount (8 bytes u64)
    const stakeAmountBuffer = accountInfo.data.slice(offset, offset + 8);
    const stakeAmount = Number(stakeAmountBuffer.readBigUInt64LE(0)); offset += 8;
    
    // Parse total_deposited (8 bytes u64)
    const totalDepositedBuffer = accountInfo.data.slice(offset, offset + 8);
    const totalDeposited = Number(totalDepositedBuffer.readBigUInt64LE(0)); offset += 8;
    
    // Parse game_state (1 byte enum)
    const gameStateRaw = accountInfo.data[offset]; offset += 1;
    const gameStates = ['WaitingForPlayers', 'WaitingForDeposits', 'InProgress', 'Finished', 'Cancelled'];
    const gameState = gameStates[gameStateRaw] || `Unknown(${gameStateRaw})`;
    
    // Skip winner (1 byte)
    offset += 1;
    
    // Skip timestamps (3 * 8 bytes = 24 bytes)
    offset += 24;
    
    // Skip time_limit_seconds (8 bytes)
    offset += 8;
    
    // Parse fee_collector (32 bytes)
    const feeCollectorBytes = accountInfo.data.slice(offset, offset + 32);
    const feeCollector = new PublicKey(feeCollectorBytes); offset += 32;
    
    // Parse boolean fields
    const whiteDeposited = accountInfo.data[offset] === 1; offset += 1;
    const blackDeposited = accountInfo.data[offset] === 1; offset += 1;
    
    console.log('\n🎯 GAME STATE ANALYSIS:');
    console.log('========================');
    console.log('Room ID:', parsedRoomId);
    console.log('Player White:', playerWhite.toString());
    console.log('Player Black:', playerBlack ? playerBlack.toString() : 'None');
    console.log('Stake Amount:', (stakeAmount / 1000000000).toFixed(3), 'SOL');
    console.log('Total Deposited:', (totalDeposited / 1000000000).toFixed(3), 'SOL');
    console.log('Game State:', gameState);
    console.log('White Deposited:', whiteDeposited ? '✅' : '❌');
    console.log('Black Deposited:', blackDeposited ? '✅' : '❌');
    console.log('Fee Collector:', feeCollector.toString());
    
    console.log('\n🔍 DIAGNOSIS:');
    if (gameState === 'InProgress' && whiteDeposited && blackDeposited && playerBlack) {
      console.log('✅ PERFECT! Game is properly initialized and ready for claim winnings!');
    } else {
      console.log('❌ Issues found:');
      if (!playerBlack) console.log('  - No black player set');
      if (!whiteDeposited) console.log('  - White player has not deposited');
      if (!blackDeposited) console.log('  - Black player has not deposited');
      if (gameState !== 'InProgress') console.log('  - Game state is not InProgress:', gameState);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get room ID from command line argument
const roomId = process.argv[2];
if (!roomId) {
  console.log('Usage: node check-game-state.js ROOM-ID');
  console.log('Example: node check-game-state.js ROOM-7STH3UWVL');
  process.exit(1);
}

checkGameState(roomId); 