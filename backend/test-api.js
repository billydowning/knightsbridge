const axios = require('axios');

const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://knightsbridge-app-35xls.ondigitalocean.app/api'
  : 'https://knightsbridge-app-35xls.ondigitalocean.app/api';

async function testAPIEndpoints() {
  console.log('🧪 Testing API endpoints...\n');
  
  try {
    // Test health check
    console.log('1. Testing health check...');
    const healthResponse = await axios.get(`${API_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test user registration
    console.log('\n2. Testing user registration...');
    const userData = {
      walletAddress: 'test_wallet_api_123',
      username: 'apitestuser',
      email: 'apitest@example.com'
    };
    
    const userResponse = await axios.post(`${API_URL}/users/register`, userData);
    console.log('✅ User registration:', userResponse.data);
    
    // Test get user profile
    console.log('\n3. Testing get user profile...');
    const profileResponse = await axios.get(`${API_URL}/users/profile/${userData.walletAddress}`);
    console.log('✅ Get user profile:', profileResponse.data);
    
    // Test create game
    console.log('\n4. Testing create game...');
    const gameData = {
      roomId: 'api_test_room_123',
      playerWhiteWallet: 'white_wallet_api',
      playerBlackWallet: 'black_wallet_api',
      stakeAmount: 0.2,
      timeControl: 'rapid',
      timeLimit: 600
    };
    
    const gameResponse = await axios.post(`${API_URL}/games/create`, gameData);
    console.log('✅ Create game:', gameResponse.data);
    
    // Test get game
    console.log('\n5. Testing get game...');
    const getGameResponse = await axios.get(`${API_URL}/games/${gameData.roomId}`);
    console.log('✅ Get game:', getGameResponse.data);
    
    // Test record move
    console.log('\n6. Testing record move...');
    const moveData = {
      moveNumber: 1,
      player: 'white',
      fromSquare: 'e2',
      toSquare: 'e4',
      piece: 'P',
      moveNotation: 'e4',
      timeSpent: 3000
    };
    
    const moveResponse = await axios.post(`${API_URL}/games/${gameData.roomId}/moves`, moveData);
    console.log('✅ Record move:', moveResponse.data);
    
    // Test get moves
    console.log('\n7. Testing get moves...');
    const movesResponse = await axios.get(`${API_URL}/games/${gameData.roomId}/moves`);
    console.log('✅ Get moves:', movesResponse.data);
    
    // Test leaderboard
    console.log('\n8. Testing leaderboard...');
    const leaderboardResponse = await axios.get(`${API_URL}/leaderboards/rapid`);
    console.log('✅ Get leaderboard:', leaderboardResponse.data);
    
    // Test analytics
    console.log('\n9. Testing analytics...');
    const analyticsResponse = await axios.get(`${API_URL}/analytics/daily`);
    console.log('✅ Get analytics:', analyticsResponse.data);
    
    // Test create notification
    console.log('\n10. Testing create notification...');
    const notificationData = {
      userId: profileResponse.data.user.id,
      type: 'game_invite',
      title: 'Game Invitation',
      message: 'You have been invited to play a game!',
      data: { roomId: 'test_room' }
    };
    
    const notificationResponse = await axios.post(`${API_URL}/notifications`, notificationData);
    console.log('✅ Create notification:', notificationResponse.data);
    
    // Test get notifications
    console.log('\n11. Testing get notifications...');
    const getNotificationsResponse = await axios.get(`${API_URL}/users/${profileResponse.data.user.id}/notifications`);
    console.log('✅ Get notifications:', getNotificationsResponse.data);
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API test failed:', error.response?.data || error.message);
  }
}

testAPIEndpoints(); 