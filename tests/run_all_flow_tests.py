#!/usr/bin/env python3
"""
Master Test Runner for Trash Collection App
Runs all flow tests with proper pytest integration
"""

import sys
import os
import subprocess
import time
import requests
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

def check_server():
    """Check if the server is running"""
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        return response.status_code == 200
    except requests.RequestException:
        return False

def run_pytest_file(test_file, test_type=""):
    """Run a pytest file and return results"""
    print(f"Running {test_file}...")
    print("=" * 60)
    
    try:
        # Run pytest with verbose output
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            test_file, 
            "-v", 
            "--tb=short",
            "--no-header",
            "--no-summary"
        ], capture_output=True, text=True, cwd=project_root)
        
        # Parse results
        output = result.stdout
        error_output = result.stderr
        
        # Count passed/failed tests
        passed = output.count("PASSED")
        failed = output.count("FAILED")
        errors = output.count("ERROR")
        
        print(output)
        if error_output:
            print("STDERR:")
            print(error_output)
        
        print("=" * 60)
        print(f"Results: {passed} passed, {failed + errors} failed")
        print()
        
        return passed, failed + errors, result.returncode == 0
        
    except Exception as e:
        print(f"❌ Error running {test_file}: {e}")
        return 0, 1, False

def main():
    """Main test runner"""
    print("🚀 Starting Comprehensive Flow Tests")
    print("=" * 60)
    
    # Check if server is running
    print("🔍 Checking if server is running...")
    if not check_server():
        print("❌ Server is not running on http://localhost:8000")
        print("   Please start the server with: python app.py")
        print()
        print("💡 You can still run individual tests with:")
        print("   python -m pytest tests/test_photo_flow.py -v")
        print("   python -m pytest tests/test_video_flow.py -v")
        print("   python -m pytest tests/test_both_flows.py -v")
        print("   python -m pytest tests/test_ui_state_management.py -v")
        return 1
    else:
        print("✅ Server is running")
    
    print()
    
    # Test files to run
    test_files = [
        "tests/test_photo_flow.py",
        "tests/test_video_flow.py", 
        "tests/test_both_flows.py",
        "tests/test_ui_state_management.py"
    ]
    
    total_passed = 0
    total_failed = 0
    failed_files = []
    
    # Run each test file
    for test_file in test_files:
        if os.path.exists(test_file):
            passed, failed, success = run_pytest_file(test_file)
            total_passed += passed
            total_failed += failed
            if not success:
                failed_files.append(test_file)
        else:
            print(f"❌ Test file not found: {test_file}")
            total_failed += 1
            failed_files.append(test_file)
    
    # Summary
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    if failed_files:
        for failed_file in failed_files:
            print(f"❌ FAIL {failed_file}")
    
    print()
    print("📈 Overall Results:")
    print(f"   ✅ Passed: {total_passed}")
    print(f"   ❌ Failed: {total_failed}")
    print(f"   📊 Total: {total_passed + total_failed}")
    print()
    
    if total_failed > 0:
        print(f"⚠️  {total_failed} test(s) failed. Please check the output above.")
        return 1
    else:
        print("🎉 All tests passed!")
        return 0

if __name__ == "__main__":
    # Handle command line arguments
    if len(sys.argv) > 1:
        test_type = sys.argv[1].lower()
        
        if test_type == "photo":
            test_files = ["tests/test_photo_flow.py"]
        elif test_type == "video":
            test_files = ["tests/test_video_flow.py"]
        elif test_type == "both":
            test_files = ["tests/test_both_flows.py"]
        elif test_type == "ui":
            test_files = ["tests/test_ui_state_management.py"]
        else:
            print(f"Unknown test type: {test_type}")
            print("Available types: photo, video, both, ui")
            sys.exit(1)
        
        # Run specific tests
        total_passed = 0
        total_failed = 0
        
        for test_file in test_files:
            passed, failed, success = run_pytest_file(test_file, test_type)
            total_passed += passed
            total_failed += failed
        
        print(f"📊 {test_type.upper()} FLOW RESULTS:")
        print(f"   ✅ Passed: {total_passed}")
        print(f"   ❌ Failed: {total_failed}")
        
        sys.exit(1 if total_failed > 0 else 0)
    else:
        # Run all tests
        sys.exit(main()) 