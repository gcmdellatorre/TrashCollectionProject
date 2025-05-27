// Frontend Test Helper
const TestHelper = {
    // Test image preview
    testImagePreview: function() {
        console.log('Testing image preview...');
        // Simulate file selection
        const fileInput = document.getElementById('file');
        // Note: You can't programmatically set file input values for security reasons
        console.log('Please select a file manually to test preview');
    },
    
    // Test form toggle
    testFormToggle: function() {
        console.log('Testing form toggle...');
        const checkbox = document.getElementById('fill-form-check');
        const detailsForm = document.getElementById('details-form');
        
        // Test showing form
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change'));
        console.log('Form visible:', !detailsForm.classList.contains('d-none'));
        
        // Test hiding form
        checkbox.checked = false;
        checkbox.dispatchEvent(new Event('change'));
        console.log('Form hidden:', detailsForm.classList.contains('d-none'));
    },
    
    // Test map refresh
    testMapRefresh: function() {
        console.log('Testing map refresh...');
        document.getElementById('refresh-map').click();
        console.log('Refresh button clicked, check network tab for API requests');
    },
    
    // Generate random test data
    generateTestData: function() {
        // Generate random coordinates near San Francisco
        const lat = 37.7749 + (Math.random() - 0.5) * 0.1;
        const lng = -122.4194 + (Math.random() - 0.5) * 0.1;
        
        document.getElementById('test-latitude').value = lat.toFixed(4);
        document.getElementById('test-longitude').value = lng.toFixed(4);
        
        // Set random trash type
        const trashTypes = ['plastic', 'paper', 'metal', 'glass', 'organic', 'electronic'];
        const randomType = trashTypes[Math.floor(Math.random() * trashTypes.length)];
        document.getElementById('test-trash-type').value = randomType;
        
        // Set random weight
        document.getElementById('test-estimated-kg').value = (Math.random() * 5).toFixed(1);
        
        // Set random sparcity
        const sparcities = ['low', 'medium', 'high'];
        document.getElementById('test-sparcity').value = sparcities[Math.floor(Math.random() * sparcities.length)];
        
        // Set random cleanliness
        const cleanliness = ['good', 'moderate', 'poor', 'very_poor'];
        document.getElementById('test-cleanliness').value = cleanliness[Math.floor(Math.random() * cleanliness.length)];
        
        console.log('Test data generated');
    },
    
    // Submit test data
    submitTestData: function() {
        this.generateTestData();
        console.log('Submitting test data...');
        // Trigger form submission
        const form = document.getElementById('test-data-form');
        const submitEvent = new Event('submit', {cancelable: true});
        form.dispatchEvent(submitEvent);
    },
    
    // Run all tests
    runAllTests: function() {
        console.log('Running all frontend tests...');
        this.testFormToggle();
        this.testMapRefresh();
        console.log('Test data generation ready. Use TestHelper.submitTestData() to submit random data.');
        console.log('Note: File upload needs to be tested manually due to browser security restrictions.');
    }
};

// Add to window for console access
window.TestHelper = TestHelper;

console.log('Test helper loaded. Access via TestHelper in the console.');
console.log('To run all tests: TestHelper.runAllTests()'); 