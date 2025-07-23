# 🚀 Knightsbridge Chess - Deployment Guide

## Overview
This guide covers the deployment of Knightsbridge Chess on DigitalOcean App Platform (backend) and Vercel (frontend).

## 🔗 **Current Deployment URLs**

### **Backend (DigitalOcean App Platform)**
- **URL**: `https://knightsbridge-vtfhf.ondigitalocean.app`
- **Health Check**: `https://knightsbridge-vtfhf.ondigitalocean.app/health`
- **Database Schema**: `https://knightsbridge-vtfhf.ondigitalocean.app/deploy-schema`

### **Frontend (Vercel)**
- **URL**: `https://knightsbridge-chess.vercel.app`
- **Environment**: Production

### **Database (DigitalOcean Managed PostgreSQL)**
- **Type**: Managed PostgreSQL
- **Region**: NYC3
- **Version**: PostgreSQL 15
- **SSL**: Required (VPC networking)

## 🏗️ Architecture

### Frontend (Vercel)
- React + TypeScript
- Vite build system
- WebSocket client for real-time communication

### Backend (DigitalOcean)
- Node.js + Express
- Socket.io for WebSocket server
- PostgreSQL database (DigitalOcean managed)

## 📋 Prerequisites

1. **Vercel Account** - for frontend deployment
2. **DigitalOcean Account** - for backend deployment
3. **PostgreSQL Database** - DigitalOcean managed database
4. **Environment Variables** - configured for production

## 🚀 Deployment Steps

### Step 1: Backend Deployment (DigitalOcean)

1. **Create DigitalOcean App Platform**
   - Connect your GitHub repository
   - Choose Node.js buildpack
   - Configure environment variables

2. **Deploy Backend**
   ```bash
   # The app will auto-deploy from GitHub
   git push origin main
   ```

3. **Configure Environment Variables**
   ```bash
   # In DigitalOcean App Platform dashboard
   DATABASE_URL=postgresql://doadmin:password@private-host:port/database?sslmode=require
   NODE_ENV=production
   PORT=8080
   ```

4. **Get Backend URL**
   - DigitalOcean provides: `https://your-app.ondigitalocean.app`

### Step 2: Frontend Deployment (Vercel)

1. **Update WebSocket URL**
   ```typescript
   // frontend/src/hooks/useWebSocket.ts
   const newSocket = io('https://your-app.ondigitalocean.app', {
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
   vercel env add VITE_BACKEND_URL https://your-app.ondigitalocean.app
   ```

### Step 3: Database Setup

1. **Create PostgreSQL Database**
   - Use DigitalOcean's managed PostgreSQL service
   - Enable VPC networking for security
   - Configure trusted sources

2. **Run Database Migrations**
   ```bash
   # Database tables are created automatically on first deployment
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
NODE_ENV=production
DATABASE_URL=postgresql://doadmin:password@private-host:port/database?sslmode=require
PORT=8080
CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

#### Frontend (.env)
```env
VITE_BACKEND_URL=https://your-app.ondigitalocean.app
VITE_WS_URL=wss://your-app.ondigitalocean.app
VITE_SOLANA_NETWORK=devnet
```

### WebSocket Configuration

Update the WebSocket connection in `frontend/src/hooks/useWebSocket.ts`:

```typescript
const newSocket = io(process.env.VITE_BACKEND_URL || 'https://your-app.ondigitalocean.app', {
  transports: ['websocket'], // WebSocket only - no polling
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 5,
  upgrade: false, // Disable upgrade to prevent connection issues
  rememberUpgrade: false
});
```

## 🧪 Testing Deployment

### 1. Test Backend Connection
```bash
curl https://your-app.ondigitalocean.app/api/health
```

### 2. Test WebSocket Connection
```javascript
// In browser console
const socket = io('https://your-app.ondigitalocean.app');
socket.on('connect', () => console.log('Connected!'));
```

### 3. Test Game Functionality
- Create a game room
- Join with two different browsers
- Test real-time moves and chat

## 🔍 Monitoring

### DigitalOcean Dashboard
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
   - Ensure VPC networking is configured

3. **Build Failures**
   - Check TypeScript errors
   - Verify all dependencies are installed
   - Review build logs

### Debug Commands

```bash
# Check backend logs
# Use DigitalOcean App Platform dashboard

# Check frontend build
vercel logs

# Test database connection
# Use the test-db-connection.js script
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
      - name: Deploy to DigitalOcean
        run: |
          # DigitalOcean auto-deploys from GitHub
          echo "Deployment triggered"

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
1. Check DigitalOcean/Vercel documentation
2. Review application logs
3. Test locally with production environment variables
4. Contact support with specific error messages

---

**Happy Deploying! 🚀♟️** 