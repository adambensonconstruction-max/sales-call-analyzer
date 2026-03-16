#!/bin/bash
# ============================================================================
# Sales Call Analyzer — One-Command Setup Script
# ============================================================================
# This script sets up the entire development environment from scratch.
#
# Usage:
#   ./setup.sh              # Full setup
#   ./setup.sh --quick      # Skip dependency checks
#   ./setup.sh --docker     # Use Docker for everything
#   ./setup.sh --backend    # Setup backend only
#   ./setup.sh --frontend   # Setup frontend only
#
# Requirements:
#   - Node.js 18+ (frontend)
#   - Python 3.11+ (backend)
#   - Docker & Docker Compose (optional, for containerized setup)
#   - Supabase CLI (optional, for local database)
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Flags
QUICK_MODE=false
DOCKER_MODE=false
BACKEND_ONLY=false
FRONTEND_ONLY=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --quick) QUICK_MODE=true ;;
        --docker) DOCKER_MODE=true ;;
        --backend) BACKEND_ONLY=true ;;
        --frontend) FRONTEND_ONLY=true ;;
        --help|-h)
            echo "Usage: ./setup.sh [options]"
            echo ""
            echo "Options:"
            echo "  --quick      Skip dependency version checks"
            echo "  --docker     Use Docker for full containerized setup"
            echo "  --backend    Setup backend only"
            echo "  --frontend   Setup frontend only"
            echo "  --help       Show this help message"
            exit 0
            ;;
    esac
done

# ============================================================================
# Helper Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

version_ge() {
    # Compare version strings: returns 0 if $1 >= $2
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

# ============================================================================
# Prerequisite Checks
# ============================================================================

check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_deps=()
    
    if ! $DOCKER_MODE; then
        # Check Node.js
        if command_exists node; then
            NODE_VERSION=$(node --version | sed 's/v//')
            if $QUICK_MODE || version_ge "$NODE_VERSION" "18.0.0"; then
                log_success "Node.js $NODE_VERSION found"
            else
                log_error "Node.js 18+ required, found $NODE_VERSION"
                missing_deps+=("Node.js 18+")
            fi
        else
            log_error "Node.js not found"
            missing_deps+=("Node.js 18+")
        fi
        
        # Check npm
        if command_exists npm; then
            NPM_VERSION=$(npm --version)
            log_success "npm $NPM_VERSION found"
        else
            log_error "npm not found"
            missing_deps+=("npm")
        fi
        
        # Check Python
        if command_exists python3; then
            PYTHON_VERSION=$(python3 --version | awk '{print $2}')
            if $QUICK_MODE || version_ge "$PYTHON_VERSION" "3.11.0"; then
                log_success "Python $PYTHON_VERSION found"
            else
                log_error "Python 3.11+ required, found $PYTHON_VERSION"
                missing_deps+=("Python 3.11+")
            fi
        else
            log_error "Python 3 not found"
            missing_deps+=("Python 3.11+")
        fi
        
        # Check pip
        if command_exists pip3; then
            log_success "pip3 found"
        else
            log_error "pip3 not found"
            missing_deps+=("pip3")
        fi
    fi
    
    # Check Docker (always needed for --docker mode, optional otherwise)
    if $DOCKER_MODE; then
        if command_exists docker; then
            DOCKER_VERSION=$(docker --version | awk '{print $3}' | sed 's/,//')
            log_success "Docker $DOCKER_VERSION found"
        else
            log_error "Docker not found (required for --docker mode)"
            missing_deps+=("Docker")
        fi
        
        if command_exists docker-compose; then
            log_success "docker-compose found"
        elif docker compose version >/dev/null 2>&1; then
            log_success "docker compose (plugin) found"
        else
            log_error "docker-compose not found (required for --docker mode)"
            missing_deps+=("docker-compose")
        fi
    fi
    
    # Check Supabase CLI (optional)
    if command_exists supabase; then
        SUPABASE_VERSION=$(supabase --version | awk '{print $2}')
        log_success "Supabase CLI $SUPABASE_VERSION found"
    else
        log_warn "Supabase CLI not found (optional - needed for local DB migrations)"
    fi
    
    # Report missing dependencies
    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo ""
        log_error "Missing dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies:"
        echo "  - Node.js: https://nodejs.org/ (use LTS version)"
        echo "  - Python: https://www.python.org/downloads/"
        echo "  - Docker: https://docs.docker.com/get-docker/"
        echo ""
        exit 1
    fi
    
    log_success "All prerequisites met!"
}

# ============================================================================
# Environment Setup
# ============================================================================

setup_environment() {
    log_info "Setting up environment files..."
    
    # Backend environment
    if [ ! -f backend/.env ]; then
        if [ -f ../.env.new ]; then
            cp ../.env.new backend/.env
            log_success "Created backend/.env from ../.env.new"
        elif [ -f .env.example ]; then
            cp .env.example backend/.env
            log_warn "Created backend/.env from template - PLEASE UPDATE WITH REAL VALUES"
        else
            log_warn "No env template found. Please create backend/.env manually."
        fi
    else
        log_info "backend/.env already exists"
    fi
    
    # Frontend environment
    if [ ! -f frontend/.env ]; then
        if [ -f frontend/.env.example ]; then
            cp frontend/.env.example frontend/.env
            log_warn "Created frontend/.env from template - PLEASE UPDATE WITH REAL VALUES"
        else
            # Create minimal frontend env
            cat > frontend/.env << 'EOF'
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=/api/v1
EOF
            log_warn "Created frontend/.env with placeholders - PLEASE UPDATE WITH REAL VALUES"
        fi
    else
        log_info "frontend/.env already exists"
    fi
    
    # Root environment for docker-compose
    if [ ! -f .env ]; then
        if [ -f ../.env.new ]; then
            cp ../.env.new .env
            log_success "Created .env from ../.env.new"
        else
            log_warn "Please create .env file with your configuration"
        fi
    fi
}

# ============================================================================
# Backend Setup
# ============================================================================

setup_backend() {
    log_info "Setting up backend..."
    
    cd backend
    
    # Create virtual environment if it doesn't exist
    if [ ! -d venv ]; then
        log_info "Creating Python virtual environment..."
        python3 -m venv venv
        log_success "Virtual environment created"
    fi
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    log_info "Upgrading pip..."
    pip install --upgrade pip setuptools wheel
    
    # Install dependencies
    log_info "Installing Python dependencies..."
    pip install -r requirements.txt
    
    log_success "Backend dependencies installed"
    
    cd ..
}

# ============================================================================
# Frontend Setup
# ============================================================================

setup_frontend() {
    log_info "Setting up frontend..."
    
    cd frontend
    
    # Check if node_modules exists
    if [ ! -d node_modules ]; then
        log_info "Installing npm dependencies..."
        npm install
        log_success "Frontend dependencies installed"
    else
        log_info "node_modules already exists, running npm install to ensure consistency..."
        npm install
    fi
    
    log_success "Frontend setup complete"
    
    cd ..
}

# ============================================================================
# Database Setup
# ============================================================================

setup_database() {
    log_info "Setting up database..."
    
    if command_exists supabase; then
        log_info "Supabase CLI found, checking project..."
        
        if [ -f supabase/config.toml ]; then
            log_info "Supabase project already initialized"
        else
            log_warn "Supabase project not initialized. Run 'supabase init' if you want local development."
        fi
        
        # Note: We don't auto-run migrations as they require connection to the actual Supabase project
        log_info "Database schema is in database_schema.sql"
        log_info "Run this in your Supabase SQL Editor to set up the database"
    else
        log_warn "Supabase CLI not found. Skipping database setup."
        log_info "Database schema is in database_schema.sql"
        log_info "Run this in your Supabase SQL Editor to set up the database"
    fi
}

# ============================================================================
# Build Frontend
# ============================================================================

build_frontend() {
    log_info "Building frontend for production..."
    
    cd frontend
    npm run build
    
    log_success "Frontend built successfully"
    
    cd ..
}

# ============================================================================
# Docker Setup
# ============================================================================

setup_docker() {
    log_info "Setting up with Docker..."
    
    # Ensure .env exists
    if [ ! -f .env ]; then
        log_error ".env file not found. Please create it first."
        exit 1
    fi
    
    # Build and start services
    log_info "Building Docker images..."
    docker-compose build
    
    log_success "Docker images built successfully"
    log_info "Run 'docker-compose up -d' to start all services"
}

# ============================================================================
# Start Services
# ============================================================================

start_services() {
    log_info "Starting services..."
    
    if $DOCKER_MODE; then
        docker-compose up -d
        log_success "Services started with Docker"
        echo ""
        echo "Frontend: http://localhost"
        echo "Backend API: http://localhost:5000"
        echo "Health Check: http://localhost:5000/health"
    else
        # Start backend in background
        log_info "Starting backend server..."
        cd backend
        source venv/bin/activate
        
        # Check if gunicorn is available
        if command_exists gunicorn || [ -f venv/bin/gunicorn ]; then
            gunicorn -w 4 -b 0.0.0.0:5000 --reload main:app &
        else
            python main.py &
        fi
        BACKEND_PID=$!
        cd ..
        
        # Start frontend dev server
        log_info "Starting frontend dev server..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        
        # Save PIDs for cleanup
        echo $BACKEND_PID > .backend.pid
        echo $FRONTEND_PID > .frontend.pid
        
        log_success "Services started!"
        echo ""
        echo "Frontend: http://localhost:5173"
        echo "Backend API: http://localhost:5000"
        echo "Health Check: http://localhost:5000/health"
        echo ""
        echo "Press Ctrl+C to stop both services"
        
        # Wait for interrupt
        trap 'kill $(cat .backend.pid) $(cat .frontend.pid) 2>/dev/null; rm -f .backend.pid .frontend.pid; exit' INT
        wait
    fi
}

# ============================================================================
# Print Summary
# ============================================================================

print_summary() {
    echo ""
    echo "=========================================="
    echo -e "${GREEN}  Setup Complete!${NC}"
    echo "=========================================="
    echo ""
    
    if $DOCKER_MODE; then
        echo "Services are running in Docker:"
        echo "  Frontend: http://localhost"
        echo "  Backend:  http://localhost:5000"
        echo ""
        echo "Commands:"
        echo "  docker-compose logs -f    # View logs"
        echo "  docker-compose down       # Stop services"
        echo "  docker-compose ps         # Check status"
    else
        echo "Development environment ready:"
        echo "  Frontend: cd frontend && npm run dev"
        echo "  Backend:  cd backend && source venv/bin/activate && python main.py"
        echo ""
        echo "URLs:"
        echo "  Frontend: http://localhost:5173"
        echo "  Backend:  http://localhost:5000"
        echo "  Health:   http://localhost:5000/health"
    fi
    
    echo ""
    echo "Next steps:"
    echo "  1. Ensure your .env files have correct API keys"
    echo "  2. Run database_schema.sql in your Supabase SQL Editor"
    echo "  3. Test the critical path: Signup → Upload → Analysis"
    echo ""
    echo "Documentation:"
    echo "  - TESTING.md    for testing checklist"
    echo "  - DEPLOYMENT.md for deployment guide"
    echo ""
}

# ============================================================================
# Main
# ============================================================================

main() {
    echo "=========================================="
    echo "  Sales Call Analyzer - Setup"
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    if ! $QUICK_MODE; then
        check_prerequisites
    fi
    
    # Setup environment files
    setup_environment
    
    if $DOCKER_MODE; then
        setup_docker
    else
        # Setup based on flags
        if $BACKEND_ONLY; then
            setup_backend
        elif $FRONTEND_ONLY; then
            setup_frontend
        else
            setup_backend
            setup_frontend
        fi
        
        # Database setup
        setup_database
        
        # Build frontend
        if ! $BACKEND_ONLY; then
            build_frontend
        fi
    fi
    
    # Print summary
    print_summary
    
    # Ask to start services (unless in CI)
    if [ -t 0 ] && ! $DOCKER_MODE && ! $BACKEND_ONLY && ! $FRONTEND_ONLY; then
        echo ""
        read -p "Start services now? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            start_services
        fi
    fi
}

# Run main function
main
