#!/bin/bash

# Test script for video detection buttons frontend functionality

echo "=== Testing Video Detection Buttons Frontend Functionality ==="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    echo -e "${BLUE}Running test: ${test_name}${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASS: ${test_name}${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL: ${test_name}${NC}"
        echo -e "${YELLOW}Expected: ${expected_result}${NC}"
        ((TESTS_FAILED++))
    fi
    echo
}

# Test 1: Check if JavaScript file contains the new button functions
run_test "Discard Detection Function" \
    "grep -q 'function discardVideoDetection' static/js/modern-app.js" \
    "discardVideoDetection function should be present"

# Test 2: Check if Rerun Detection Function exists
run_test "Rerun Detection Function" \
    "grep -q 'function rerunVideoDetection' static/js/modern-app.js" \
    "rerunVideoDetection function should be present"

# Test 3: Check if event listeners are set up for new buttons
run_test "Discard Button Event Listener" \
    "grep -q 'discard-detection-btn' static/js/modern-app.js" \
    "discard-detection-btn event listener should be present"

# Test 4: Check if Rerun Button Event Listener exists
run_test "Rerun Button Event Listener" \
    "grep -q 'rerun-detection-btn' static/js/modern-app.js" \
    "rerun-detection-btn event listener should be present"

# Test 5: Check if loading state function is enhanced
run_test "Enhanced Loading State Function" \
    "grep -q 'Detecting Trash' static/js/modern-app.js" \
    "Enhanced loading state should be present"

# Test 6: Check if button styling classes are present
run_test "Discard Button Styling" \
    "grep -q 'text-red-700.*bg-red-100' static/js/modern-app.js" \
    "Discard button should have red styling"

# Test 7: Check if Rerun Button Styling exists
run_test "Rerun Button Styling" \
    "grep -q 'text-orange-700.*bg-orange-100' static/js/modern-app.js" \
    "Rerun button should have orange styling"

# Test 8: Check if button icons are present
run_test "Button Icons" \
    "grep -q 'bi-trash' static/js/modern-app.js && grep -q 'bi-arrow-clockwise' static/js/modern-app.js" \
    "Both buttons should have appropriate icons"

# Test 9: Check if notification functions are used
run_test "Notification Integration" \
    "grep -q 'showNotification.*discarded' static/js/modern-app.js" \
    "Discard function should show notifications"

# Test 10: Check if rerun uses correct API endpoint
run_test "Rerun API Endpoint" \
    "grep -q '/api/upload-video' static/js/modern-app.js" \
    "Rerun should use the correct API endpoint"

# Test 11: Check if loading spinner animation is present
run_test "Loading Spinner Animation" \
    "grep -q 'animate-spin' static/js/modern-app.js" \
    "Loading spinner should have animation class"

# Test 12: Check if button layout is properly structured
run_test "Button Layout Structure" \
    "grep -q 'flex justify-between' static/js/modern-app.js" \
    "Button layout should use flexbox with justify-between"

# Test 13: Check if error handling is present
run_test "Error Handling" \
    "grep -q 'catch.*error' static/js/modern-app.js" \
    "Error handling should be present in rerun function"

# Test 14: Check if button states are properly managed
run_test "Button State Management" \
    "grep -q 'disabled.*true' static/js/modern-app.js" \
    "Button states should be properly managed"

# Test 15: Check if form data is properly constructed for rerun
run_test "Form Data Construction" \
    "grep -q 'FormData.*append' static/js/modern-app.js" \
    "Form data should be properly constructed for rerun"

echo "=== Test Summary ==="
echo -e "${GREEN}Tests Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Tests Failed: ${TESTS_FAILED}${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All frontend tests passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the implementation.${NC}"
    exit 1
fi 