#!/bin/bash

# Trash Collection App - Test Runner Script
# Runs comprehensive tests for both photo and video flows

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

# Check if server is running
check_server() {
    if curl -s http://localhost:8000/ > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Run pytest for a specific test file
run_pytest() {
    local test_file=$1
    local test_name=$2
    
    print_status "Running $test_name tests..."
    echo "=================================================="
    
    if python -m pytest "$test_file" -v --tb=short; then
        print_success "✅ $test_name tests passed"
        return 0
    else
        print_error "❌ $test_name tests failed"
        return 1
    fi
}

# Main function
main() {
    print_status "🚀 Starting Trash Collection App Tests"
    echo "============================================================"
    
    # Check if server is running
    print_status "🔍 Checking if server is running..."
    if ! check_server; then
        print_error "❌ Server is not running on http://localhost:8000"
        print_warning "   Please start the server with: python app.py"
        echo
        print_warning "💡 You can still run individual tests with:"
        echo "   python -m pytest tests/test_photo_flow.py -v"
        echo "   python -m pytest tests/test_video_flow.py -v"
        echo "   python -m pytest tests/test_both_flows.py -v"
        echo "   python -m pytest tests/test_ui_state_management.py -v"
        exit 1
    else
        print_success "✅ Server is running"
    fi
    
    echo
    
    # Test files
    declare -A test_files=(
        ["tests/test_photo_flow.py"]="Photo Flow"
        ["tests/test_video_flow.py"]="Video Flow"
        ["tests/test_both_flows.py"]="Both Flows Integration"
        ["tests/test_ui_state_management.py"]="UI State Management"
    )
    
    total_passed=0
    total_failed=0
    failed_tests=()
    
    # Run each test file
    for test_file in "${!test_files[@]}"; do
        test_name="${test_files[$test_file]}"
        
        if [ -f "$test_file" ]; then
            if run_pytest "$test_file" "$test_name"; then
                ((total_passed++))
            else
                ((total_failed++))
                failed_tests+=("$test_name")
            fi
        else
            print_error "❌ Test file not found: $test_file"
            ((total_failed++))
            failed_tests+=("$test_name")
        fi
        
        echo
    done
    
    # Summary
    echo "📊 TEST SUMMARY"
    echo "============================================================"
    
    if [ ${#failed_tests[@]} -gt 0 ]; then
        for failed_test in "${failed_tests[@]}"; do
            print_error "❌ FAIL $failed_test"
        done
    fi
    
    echo
    echo "📈 Overall Results:"
    echo "   ✅ Passed: $total_passed"
    echo "   ❌ Failed: $total_failed"
    echo "   📊 Total: $((total_passed + total_failed))"
    echo
    
    if [ $total_failed -gt 0 ]; then
        print_warning "⚠️  $total_failed test(s) failed. Please check the output above."
        exit 1
    else
        print_success "🎉 All tests passed!"
        exit 0
    fi
}

# Handle command line arguments
if [ $# -gt 0 ]; then
    test_type=$1
    
    case $test_type in
        "photo")
            run_pytest "tests/test_photo_flow.py" "Photo Flow"
            ;;
        "video")
            run_pytest "tests/test_video_flow.py" "Video Flow"
            ;;
        "both")
            run_pytest "tests/test_both_flows.py" "Both Flows Integration"
            ;;
        "ui")
            run_pytest "tests/test_ui_state_management.py" "UI State Management"
            ;;
        *)
            print_error "Unknown test type: $test_type"
            echo "Available types: photo, video, both, ui"
            exit 1
            ;;
    esac
else
    # Run all tests
    main
fi 