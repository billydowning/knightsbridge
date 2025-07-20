require('dotenv').config();
const { dbService } = require('./database');

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    // Test basic connection
    const isConnected = await dbService.testConnection();
    
    if (isConnected) {
      console.log('✅ Database connection successful!');
      
      // Test creating a user
      console.log('🧪 Testing user creation...');
      const testUser = await dbService.createOrUpdateUser(
        'test_wallet_address_123',
        {
          username: 'testuser',
          email: 'test@example.com'
        }
      );
      
      if (testUser) {
        console.log('✅ User creation successful!');
        console.log('User ID:', testUser.id);
        console.log('Username:', testUser.username);
        
        // Test getting user
        const retrievedUser = await dbService.getUserByWallet('test_wallet_address_123');
        if (retrievedUser) {
          console.log('✅ User retrieval successful!');
          console.log('Retrieved user:', retrievedUser.username);
        }
        
        // Test creating a game
        console.log('🧪 Testing game creation...');
        const testGame = await dbService.createGame({
          roomId: 'test_room_123',
          playerWhiteWallet: 'test_wallet_white',
          playerBlackWallet: 'test_wallet_black',
          stakeAmount: 0.1,
          timeControl: 'rapid',
          timeLimit: 600
        });
        
        if (testGame) {
          console.log('✅ Game creation successful!');
          console.log('Game ID:', testGame.id);
          console.log('Room ID:', testGame.room_id);
          
          // Test recording a move
          console.log('🧪 Testing move recording...');
          const testMove = await dbService.recordMove(testGame.id, {
            moveNumber: 1,
            player: 'white',
            fromSquare: 'e2',
            toSquare: 'e4',
            piece: 'P',
            moveNotation: 'e4',
            timeSpent: 5000
          });
          
          if (testMove) {
            console.log('✅ Move recording successful!');
            console.log('Move ID:', testMove.id);
            console.log('Move notation:', testMove.move_notation);
          }
        }
      }
      
    } else {
      console.log('❌ Database connection failed!');
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  } finally {
    await dbService.close();
    console.log('🔚 Database connection closed.');
  }
}

testDatabaseConnection(); 