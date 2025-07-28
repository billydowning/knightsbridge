const { Connection, PublicKey } = require('@solana/web3.js');

async function debugAccount(roomId) {
  const connection = new Connection('https://api.devnet.solana.com');
  const CHESS_PROGRAM_ID = 'F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr';
  
  console.log('🔍 Debug parsing for room:', roomId);
  
  try {
    const [gameEscrowPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('game'), Buffer.from(roomId)],
      new PublicKey(CHESS_PROGRAM_ID)
    );
    
    console.log('🔍 Game Escrow PDA:', gameEscrowPda.toString());
    
    const accountInfo = await connection.getAccountInfo(gameEscrowPda);
    if (!accountInfo) {
      console.log('❌ Account not found');
      return;
    }
    
    console.log('✅ Account found! Data length:', accountInfo.data.length);
    console.log('📊 Raw hex data:', accountInfo.data.toString('hex'));
    
    // Parse step by step with detailed logging
    let offset = 0;
    
    console.log('\n🔍 STEP-BY-STEP PARSING:');
    console.log('========================');
    
    // Discriminator (8 bytes)
    const discriminator = accountInfo.data.slice(offset, offset + 8);
    console.log(`Offset ${offset}-${offset + 7}: Discriminator = ${discriminator.toString('hex')}`);
    offset += 8;
    
    // Room ID length (4 bytes)
    const roomIdLength = accountInfo.data.readUInt32LE(offset);
    console.log(`Offset ${offset}-${offset + 3}: Room ID Length = ${roomIdLength}`);
    offset += 4;
    
    // Room ID string
    const roomIdBytes = accountInfo.data.slice(offset, offset + roomIdLength);
    const parsedRoomId = roomIdBytes.toString('utf8');
    console.log(`Offset ${offset}-${offset + roomIdLength - 1}: Room ID = "${parsedRoomId}"`);
    offset += roomIdLength;
    
    // Player white (32 bytes)
    const playerWhiteBytes = accountInfo.data.slice(offset, offset + 32);
    const playerWhite = new PublicKey(playerWhiteBytes);
    console.log(`Offset ${offset}-${offset + 31}: Player White = ${playerWhite.toString()}`);
    offset += 32;
    
    // Player black option (1 + 32 bytes)
    const hasPlayerBlackByte = accountInfo.data[offset];
    console.log(`Offset ${offset}: Has Player Black = ${hasPlayerBlackByte} (hex: ${hasPlayerBlackByte.toString(16)})`);
    offset += 1;
    
    if (hasPlayerBlackByte === 1) {
      const playerBlackBytes = accountInfo.data.slice(offset, offset + 32);
      const playerBlack = new PublicKey(playerBlackBytes);
      console.log(`Offset ${offset}-${offset + 31}: Player Black = ${playerBlack.toString()}`);
      console.log('✅ BLACK PLAYER IS SET!');
    } else if (hasPlayerBlackByte === 0) {
      console.log(`Offset ${offset}-${offset + 31}: Player Black = None (option is empty)`);
      console.log('❌ Black player not set');
    } else {
      console.log('⚠️  Invalid has_player_black byte! Expected 0 or 1');
      console.log('🔍 Next 32 bytes (potential player black):', accountInfo.data.slice(offset, offset + 32).toString('hex'));
    }
    offset += 32;
    
    // Continue with remaining fields for context
    console.log(`\n🔍 Remaining data from offset ${offset}:`);
    console.log('Hex:', accountInfo.data.slice(offset).toString('hex'));
    
    // Try to parse stake amount (8 bytes)
    if (offset + 8 <= accountInfo.data.length) {
      const stakeAmountBuffer = accountInfo.data.slice(offset, offset + 8);
      const stakeAmount = Number(stakeAmountBuffer.readBigUInt64LE(0));
      console.log(`Stake Amount: ${stakeAmount} lamports (${stakeAmount / 1000000000} SOL)`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

const roomId = process.argv[2];
if (!roomId) {
  console.log('Usage: node debug-account.js ROOM-ID');
  process.exit(1);
}

debugAccount(roomId); 