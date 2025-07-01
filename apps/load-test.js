const autocannon = require('autocannon');
const fs = require('fs');

// Load the test data
const loanData = JSON.parse(fs.readFileSync('loan-test-data.json', 'utf8'));

let currentIndex = 0;

const instance = autocannon({
    url: 'http://localhost:3000', // Adjust to your server URL
    connections: 50, // Number of concurrent connections
    duration: 60, // Duration in seconds
    requests: [
        {
            method: 'POST',
            path: '/api/loans/request', // Adjust to your endpoint
            headers: {
                'content-type': 'application/json'
            },
            setupRequest: (req) => {
                // Cycle through the loan data
                const data = loanData[currentIndex % loanData.length];
                currentIndex++;
                return {
                    ...req,
                    body: JSON.stringify(data)
                };
            }
        }
    ]
}, (err, result) => {
    if (err) {
        console.error('Error during load test:', err);
    } else {
        console.log('Load test completed:');
        console.log(`Requests sent: ${result.requests.sent}`);
        console.log(`Requests completed: ${result.requests.total}`);
        console.log(`Average latency: ${result.latency.average}ms`);
        console.log(`Requests per second: ${result.requests.average}`);
    }
});

// Handle graceful shutdown
process.once('SIGINT', () => {
    instance.stop();
});