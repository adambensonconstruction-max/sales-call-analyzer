#!/bin/bash
# ============================================================================
# Sales Call Analyzer — Integration Test Script
# ============================================================================
# This script runs a series of integration tests to verify the application
# is working correctly end-to-end.
#
# Usage:
#   ./test-integration.sh              # Run all tests
#   ./test-integration.sh --api        # Test API only
#   ./test-integration.sh --frontend   # Test frontend build only
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
API_PREFIX="/api/v1"

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
log_info() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((TESTS_PASSED++))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((TESTS_FAILED++))
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test functions
test_health_endpoint() {
    log_info "Testing health endpoint..."
    
    if curl -s "${BACKEND_URL}/health" | grep -q '"status":"healthy"'; then
        log_pass "Health endpoint responding"
        return 0
    else
        log_fail "Health endpoint not responding correctly"
        return 1
    fi
}

test_cors_headers() {
    log_info "Testing CORS headers..."
    
    RESPONSE=$(curl -s -X OPTIONS "${BACKEND_URL}${API_PREFIX}/calls" \
        -H "Origin: http://localhost:5173" \
        -H "Access-Control-Request-Method: GET" \
        -I)
    
    if echo "$RESPONSE" | grep -qi "access-control-allow-origin"; then
        log_pass "CORS headers present"
        return 0
    else
        log_warn "CORS headers may not be configured (this is OK if using proxy)"
        return 0
    fi
}

test_auth_required() {
    log_info "Testing authentication required..."
    
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${BACKEND_URL}${API_PREFIX}/calls")
    
    if [ "$STATUS" = "401" ]; then
        log_pass "Authentication required (401 received)"
        return 0
    else
        log_fail "Expected 401, got $STATUS"
        return 1
    fi
}

test_frontend_build() {
    log_info "Testing frontend build..."
    
    if [ -d "frontend/dist" ]; then
        log_pass "Frontend dist folder exists"
        
        if [ -f "frontend/dist/index.html" ]; then
            log_pass "index.html exists in dist"
        else
            log_fail "index.html missing from dist"
        fi
        
        return 0
    else
        log_fail "Frontend dist folder not found"
        return 1
    fi
}

test_backend_dependencies() {
    log_info "Testing backend dependencies..."
    
    cd backend
    
    if [ -d "venv" ]; then
        log_pass "Virtual environment exists"
    else
        log_fail "Virtual environment not found"
        cd ..
        return 1
    fi
    
    # Check key imports
    if source venv/bin/activate && python -c "import flask, supabase, openai" 2>/dev/null; then
        log_pass "Key Python packages installed"
    else
        log_fail "Some Python packages missing"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

test_frontend_dependencies() {
    log_info "Testing frontend dependencies..."
    
    cd frontend
    
    if [ -d "node_modules" ]; then
        log_pass "node_modules exists"
    else
        log_fail "node_modules not found"
        cd ..
        return 1
    fi
    
    cd ..
    return 0
}

test_docker_files() {
    log_info "Testing Docker configuration..."
    
    FILES=(
        "docker-compose.yml"
        "backend/Dockerfile"
        "frontend/Dockerfile"
        "backend/.dockerignore"
        "frontend/.dockerignore"
    )
    
    ALL_PRESENT=true
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            log_pass "Found $file"
        else
            log_fail "Missing $file"
            ALL_PRESENT=false
        fi
    done
    
    $ALL_PRESENT && return 0 || return 1
}

test_environment_files() {
    log_info "Testing environment files..."
    
    FILES=(
        "backend/.env.example"
        "frontend/.env.example"
        ".env.example"
    )
    
    ALL_PRESENT=true
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            log_pass "Found $file"
        else
            log_fail "Missing $file"
            ALL_PRESENT=false
        fi
    done
    
    $ALL_PRESENT && return 0 || return 1
}

test_documentation() {
    log_info "Testing documentation..."
    
    FILES=(
        "README.md"
        "TESTING.md"
        "DEPLOYMENT.md"
    )
    
    ALL_PRESENT=true
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            log_pass "Found $file"
        else
            log_fail "Missing $file"
            ALL_PRESENT=false
        fi
    done
    
    $ALL_PRESENT && return 0 || return 1
}

test_typescript_types() {
    log_info "Testing TypeScript compilation..."
    
    cd frontend
    
    if npm run build 2>&1 | grep -qi "error"; then
        log_fail "TypeScript compilation errors found"
        cd ..
        return 1
    else
        log_pass "TypeScript compilation successful"
        cd ..
        return 0
    fi
}

test_api_routes() {
    log_info "Testing API routes configuration..."
    
    cd backend
    source venv/bin/activate
    
    # Check if routes are properly registered
    if python -c "
from main import create_app
app = create_app(testing=True)
rules = [str(r) for r in app.url_map.iter_rules()]
required = ['/health', '/api/v1/calls', '/api/v1/analysis', '/api/v1/dashboard']
missing = [r for r in required if not any(r in rule for rule in rules)]
if missing:
    print(f'Missing routes: {missing}')
    exit(1)
" 2>/dev/null; then
        log_pass "All required API routes registered"
        cd ..
        return 0
    else
        log_fail "Some API routes missing"
        cd ..
        return 1
    fi
}

# Main test execution
main() {
    echo "=========================================="
    echo "  Sales Call Analyzer - Integration Tests"
    echo "=========================================="
    echo ""
    
    # Parse arguments
    RUN_API=true
    RUN_FRONTEND=true
    
    for arg in "$@"; do
        case $arg in
            --api)
                RUN_FRONTEND=false
                ;;
            --frontend)
                RUN_API=false
                ;;
        esac
    done
    
    # Run tests
    if $RUN_API; then
        echo "=== API Tests ==="
        test_health_endpoint
        test_cors_headers
        test_auth_required
        test_backend_dependencies
        test_api_routes
        echo ""
    fi
    
    if $RUN_FRONTEND; then
        echo "=== Frontend Tests ==="
        test_frontend_dependencies
        test_frontend_build
        test_typescript_types
        echo ""
    fi
    
    echo "=== Configuration Tests ==="
    test_docker_files
    test_environment_files
    test_documentation
    echo ""
    
    # Summary
    echo "=========================================="
    echo "  Test Summary"
    echo "=========================================="
    echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}Failed: $TESTS_FAILED${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}Some tests failed.${NC}"
        exit 1
    fi
}

# Run main
main "$@"
