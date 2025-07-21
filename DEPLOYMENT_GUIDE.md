# 🚀 Knightsbridge Chess - Deployment Guide

## Overview
This guide covers deploying the Knightsbridge Chess game with WebSocket functionality for real-time multiplayer gameplay.

## 🏗️ Architecture

### Frontend (Vercel)
- React + TypeScript
- Vite build system
- WebSocket client for real-time communication

### Backend (Railway/Render)
- Node.js + Express
- Socket.io for WebSocket server
- PostgreSQL database

## 📋 Prerequisites

1. **Vercel Account** - for frontend deployment
2. **Railway/Render Account** - for backend deployment
3. **PostgreSQL Database** - for game data persistence
4. **Environment Variables** - configured for production

## 🚀 Deployment Steps

### Step 1: Backend Deployment (Railway)

1. **Create Railway Account**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Configure Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=your_postgresql_url
   railway variables set PORT=3001
   ```

4. **Get Backend URL**
   ```bash
   railway domain
   # Copy the URL (e.g., https://your-app.railway.app)
   ```

### Step 2: Frontend Deployment (Vercel)

1. **Update WebSocket URL**
   ```typescript
   // frontend/src/hooks/useWebSocket.ts
   const newSocket = io('https://your-backend-url.railway.app', {
     transports: ['websocket', 'polling']
   });
   ```

2. **Deploy to Vercel**
   ```bash
   cd frontend
   npm install -g vercel
   vercel --prod
   ```

3. **Configure Environment Variables**
   ```bash
   vercel env add REACT_APP_BACKEND_URL https://your-backend-url.railway.app
   ```

### Step 3: Database Setup

1. **Create PostgreSQL Database**
   - Use Railway's PostgreSQL service
   - Or use Supabase/Neon for external database

2. **Run Database Migrations**
   ```bash
   cd backend
   npm run migrate
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3001
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

#### Frontend (.env)
```env
REACT_APP_BACKEND_URL=https://your-backend-url.railway.app
REACT_APP_SOLANA_NETWORK=devnet
```

### WebSocket Configuration

Update the WebSocket connection in `frontend/src/hooks/useWebSocket.ts`:

```typescript
const newSocket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001', {
  transports: ['websocket', 'polling'],
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5
});
```

## 🧪 Testing Deployment

### 1. Test Backend Connection
```bash
curl https://your-backend-url.railway.app/api/health
```

### 2. Test WebSocket Connection
```javascript
// In browser console
const socket = io('https://your-backend-url.railway.app');
socket.on('connect', () => console.log('Connected!'));
```

### 3. Test Game Functionality
- Create a game room
- Join with two different browsers
- Test real-time moves and chat

## 🔍 Monitoring

### Railway Dashboard
- Monitor backend logs
- Check database connections
- View deployment status

### Vercel Dashboard
- Monitor frontend performance
- Check build status
- View analytics

## 🚨 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check CORS configuration
   - Verify backend URL is correct
   - Ensure SSL certificates are valid

2. **Database Connection Issues**
   - Verify DATABASE_URL format
   - Check database permissions
   - Ensure database is accessible

3. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Review build logs

### Debug Commands

```bash
# Check backend logs
railway logs

# Check frontend build
vercel logs

# Test database connection
railway run node test-db.js
```

## 🔄 CI/CD Setup

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: |
          cd backend
          railway up

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Vercel
        run: |
          cd frontend
          vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 📊 Performance Optimization

### Frontend
- Enable Vite build optimization
- Use React.memo for components
- Implement code splitting

### Backend
- Enable compression
- Implement caching
- Use connection pooling

### Database
- Add indexes for queries
- Optimize table structure
- Monitor query performance

## 🔒 Security Considerations

1. **CORS Configuration**
   ```javascript
   // backend/server.js
   cors: {
     origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
     credentials: true
   }
   ```

2. **Rate Limiting**
   ```javascript
   // Already implemented in backend
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100
   });
   ```

3. **Input Validation**
   - Validate all WebSocket messages
   - Sanitize user inputs
   - Implement proper error handling

## 🎯 Next Steps

1. **Set up monitoring** with Sentry or similar
2. **Implement analytics** for game usage
3. **Add user authentication** system
4. **Create admin dashboard** for game management
5. **Implement tournament system** with leaderboards

## 📞 Support

For deployment issues:
1. Check Railway/Vercel documentation
2. Review application logs
3. Test locally with production environment variables
4. Contact support with specific error messages

---

**Happy Deploying! 🚀♟️** 