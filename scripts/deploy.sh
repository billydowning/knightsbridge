#!/bin/bash

# Knightsbridge Chess Deployment Script
# This script automates the deployment process for the chess application

set -e  # Exit on any error

echo "♚ Knightsbridge Chess - Deployment Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install npm first."
        exit 1
    fi
    
    # Check Solana CLI
    if ! command -v solana &> /dev/null; then
        print_warning "Solana CLI not found. Installing..."
        sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
    fi
    
    # Check Anchor
    if ! command -v anchor &> /dev/null; then
        print_warning "Anchor CLI not found. Installing..."
        npm install -g @coral-xyz/anchor-cli
    fi
    
    print_success "All prerequisites are satisfied"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Frontend dependencies
    print_status "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Solana program dependencies
    print_status "Installing Solana program dependencies..."
    cd programs/escrow
    yarn install
    cd ../..
    
    print_success "All dependencies installed"
}

# Configure Solana
configure_solana() {
    print_status "Configuring Solana..."
    
    # Set to devnet for testing
    solana config set --url devnet
    
    # Check if wallet exists, create if not
    if ! solana address &> /dev/null; then
        print_status "Creating new Solana wallet..."
        solana-keygen new --no-bip39-passphrase
    fi
    
    # Get wallet address
    WALLET_ADDRESS=$(solana address)
    print_success "Using wallet: $WALLET_ADDRESS"
    
    # Check balance
    BALANCE=$(solana balance)
    print_status "Wallet balance: $BALANCE"
    
    # Request airdrop if balance is low
    if [[ $(echo $BALANCE | sed 's/ SOL//') < 2 ]]; then
        print_status "Requesting airdrop..."
        solana airdrop 2
    fi
}

# Build and deploy Solana program
deploy_program() {
    print_status "Building and deploying Solana program..."
    
    cd programs/escrow
    
    # Build the program
    print_status "Building program..."
    anchor build
    
    # Get program ID
    PROGRAM_ID=$(solana address -k target/deploy/chess_escrow-keypair.json)
    print_success "Program ID: $PROGRAM_ID"
    
    # Deploy the program
    print_status "Deploying program..."
    anchor deploy
    
    # Update Anchor.toml with program ID
    sed -i.bak "s/declare_id!(\".*\")/declare_id!(\"$PROGRAM_ID\")/" programs/escrow/src/lib.rs
    
    cd ../..
    
    print_success "Program deployed successfully"
    
    # Save program ID for frontend
    echo "export CHESS_PROGRAM_ID=$PROGRAM_ID" > .env.program
}

# Update frontend configuration
update_frontend_config() {
    print_status "Updating frontend configuration..."
    
    # Read program ID from .env.program
    if [ -f .env.program ]; then
        source .env.program
        print_success "Program ID loaded: $CHESS_PROGRAM_ID"
    else
        print_error "Program ID not found. Please deploy the program first."
        exit 1
    fi
    
    # Update the frontend config file
    CONFIG_FILE="frontend/src/config/solanaConfig.ts"
    
    # Create backup
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup"
    
    # Update program ID
    sed -i "s/F4Py3YTF1JGhbY9ACztXaseFF89ZfLS69ke5Z7EBGQGr/$CHESS_PROGRAM_ID/g" "$CONFIG_FILE"
    
    print_success "Frontend configuration updated"
}

# Build frontend
build_frontend() {
    print_status "Building frontend..."
    
    cd frontend
    npm run build
    cd ..
    
    print_success "Frontend built successfully"
}

# Start development servers
start_development() {
    print_status "Starting development servers..."
    
    # Start backend in background
    print_status "Starting backend server..."
    cd backend
    npm start &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    print_status "Starting frontend development server..."
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    print_success "Development servers started"
    print_status "Backend PID: $BACKEND_PID"
    print_status "Frontend PID: $FRONTEND_PID"
    print_status "Frontend should be available at: http://localhost:5173"
    print_status "Backend should be available at: http://localhost:3001"
    
    # Save PIDs for cleanup
    echo $BACKEND_PID > .backend.pid
    echo $FRONTEND_PID > .frontend.pid
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill background processes
    if [ -f .backend.pid ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    
    if [ -f .frontend.pid ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    print_success "Cleanup completed"
}

# Main deployment function
main() {
    case "${1:-deploy}" in
        "deploy")
            print_status "Starting deployment..."
            check_prerequisites
            install_dependencies
            configure_solana
            deploy_program
            update_frontend_config
            print_success "Deployment completed successfully!"
            ;;
        "dev")
            print_status "Starting development environment..."
            start_development
            print_success "Development environment started!"
            print_status "Press Ctrl+C to stop servers"
            trap cleanup EXIT
            wait
            ;;
        "build")
            print_status "Building application..."
            build_frontend
            print_success "Build completed!"
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|dev|build|cleanup}"
            echo "  deploy  - Full deployment (default)"
            echo "  dev     - Start development servers"
            echo "  build   - Build frontend only"
            echo "  cleanup - Clean up background processes"
            exit 1
            ;;
    esac
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@" 