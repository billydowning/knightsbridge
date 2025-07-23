# DigitalOcean App Platform Migration Guide

## Overview
This guide will help you migrate from Railway to DigitalOcean App Platform for better WebSocket stability.

## Prerequisites
- DigitalOcean account
- GitHub repository connected
- PostgreSQL database (will be created automatically)

## Step 1: Prepare Your Repository

### 1.1 Update Configuration Files
- ✅ `Dockerfile` - Created for container deployment
- ✅ `do-app.yaml` - DigitalOcean App Platform config
- ✅ `package.json` - Added start script
- ✅ `.dockerignore` - Optimized build

### 1.2 Environment Variables
The following environment variables will be set in DigitalOcean:
- `NODE_ENV=production`
- `PORT=8080`
- `CORS_ORIGIN=https://knightsbridge.vercel.app`
- `DATABASE_URL` (auto-generated)
- `DEBUG=false`

## Step 2: Deploy to DigitalOcean

### 2.1 Create App in DigitalOcean
1. Go to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Click "Create App"
3. Connect your GitHub repository
4. Select the `main` branch

### 2.2 Configure the App
1. **Environment**: Node.js
2. **Source Directory**: `/` (root)
3. **Run Command**: `npm start`
4. **Instance Size**: Basic XXS ($5/month)
5. **Instance Count**: 1

### 2.3 Add Database
1. Click "Add Resource" → "Database"
2. Select PostgreSQL 15
3. Choose Basic plan ($15/month)
4. The `DATABASE_URL` will be automatically linked

### 2.4 Set Environment Variables
Add these environment variables:
```
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://knightsbridge.vercel.app
DEBUG=false
```

## Step 3: Update Frontend Configuration

### 3.1 Update WebSocket URL
In `frontend/src/services/databaseMultiplayerState.ts`, update the server URL:
```typescript
// Change from Railway URL to DigitalOcean URL
this.serverUrl = 'wss://your-app-name.ondigitalocean.app';
```

### 3.2 Update HTTP Fallback URL
Also update the HTTP fallback URL:
```typescript
// Change from Railway URL to DigitalOcean URL
const response = await fetch(`https://your-app-name.ondigitalocean.app/api/rooms`, {
```

## Step 4: Test the Migration

### 4.1 Test WebSocket Stability
1. Deploy the updated frontend to Vercel
2. Create a new room
3. Join with another player
4. Test WebSocket connection stability

### 4.2 Remove HTTP Fallback (Optional)
Once WebSocket is stable, you can remove HTTP polling:
1. Remove `useHttpFallback` logic
2. Remove HTTP polling intervals
3. Simplify connection logic

## Expected Benefits

### ✅ WebSocket Stability
- No more frequent disconnections
- Persistent connections
- Better real-time performance

### ✅ Cost Optimization
- Predictable monthly costs
- No surprise bills
- Better resource utilization

### ✅ Performance
- Lower latency
- Better user experience
- Reduced server load

## Troubleshooting

### Database Connection Issues
- Check `DATABASE_URL` environment variable
- Verify database is running
- Check network connectivity

### WebSocket Connection Issues
- Verify CORS configuration
- Check firewall settings
- Test with different browsers

### Deployment Issues
- Check build logs
- Verify environment variables
- Test locally first

## Rollback Plan
If issues occur:
1. Keep Railway deployment running
2. Test DigitalOcean thoroughly
3. Update DNS only after confirmation
4. Monitor both environments

## Cost Comparison
- **Railway**: $20-50/month (unpredictable)
- **DigitalOcean**: $20/month (predictable)
- **Database**: $15/month (PostgreSQL)
- **Total**: $35/month (stable)

## Next Steps
1. Deploy to DigitalOcean
2. Test WebSocket stability
3. Update frontend configuration
4. Monitor performance
5. Remove HTTP fallback (optional) 