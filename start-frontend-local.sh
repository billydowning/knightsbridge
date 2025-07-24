#!/bin/bash

echo "🚀 Starting local frontend with production backend..."
echo "📋 Environment variables:"
echo "  - VITE_API_URL=https://knightsbridge-app-35xls.ondigitalocean.app"
echo "  - VITE_WS_URL=wss://knightsbridge-app-35xls.ondigitalocean.app"
echo "  - VITE_BACKEND_URL=https://knightsbridge-app-35xls.ondigitalocean.app"
echo ""

cd frontend

# Set environment variables for local development
export VITE_API_URL="https://knightsbridge-app-35xls.ondigitalocean.app"
export VITE_WS_URL="wss://knightsbridge-app-35xls.ondigitalocean.app"
export VITE_BACKEND_URL="https://knightsbridge-app-35xls.ondigitalocean.app"

echo "🔧 Starting Vite dev server..."
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔗 Connecting to production backend: https://knightsbridge-app-35xls.ondigitalocean.app"
echo ""

npm run dev 