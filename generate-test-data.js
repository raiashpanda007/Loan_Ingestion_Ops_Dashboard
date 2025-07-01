const fs = require('fs');

// Sample data arrays
const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Tom', 'Emily', 'Chris', 'Amanda', 'Kevin', 'Rachel', 'Brian', 'Jessica', 'Mark', 'Ashley', 'Steve', 'Michelle', 'Ryan', 'Nicole'];
const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez'];
const purposes = ['Home improvement', 'Car purchase', 'Business expansion', 'Debt consolidation', 'Education', 'Medical expenses', 'Wedding', 'Vacation', 'Home purchase', 'Investment'];
const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'email.com', 'test.com'];

function generateRandomPhone() {
    return Math.floor(1000000000 + Math.random() * 9000000000).toString();
}

function generateRandomEmail(firstName, lastName) {
    const domain = domains[Math.floor(Math.random() * domains.length)];
    return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`;
}

function generateLoanRequest(index) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    
    // Generate base data
    const age = Math.floor(Math.random() * 50) + 18; // 18-67
    const income = Math.floor(Math.random() * 150000) + 20000; // 20k-170k
    const baseAmount = Math.floor(Math.random() * 200000) + 5000; // 5k-205k
    const baseCreditScore = Math.floor(Math.random() * 500) + 300; // 300-800
    
    let loanRequest = {
        loanId: `LOAN-${String(index + 1).padStart(6, '0')}`,
        application: {
            name: `${firstName} ${lastName}`,
            age: age,
            email: generateRandomEmail(firstName, lastName),
            phone: generateRandomPhone()
        },
        amount: baseAmount,
        income: income,
        creditScore: baseCreditScore,
        purpose: purposes[Math.floor(Math.random() * purposes.length)]
    };
    
    // Introduce failures based on your validation logic:
    // 1. Invalid data format (missing required fields) - 5%
    // 2. Credit score < 600 - 15%
    // 3. Loan amount > 5 * income - 10%
    // 4. Age < 18 - 3%
    // 5. Invalid email - 2%
    
    const failureType = Math.random();
    
    if (failureType < 0.05) {
        // Missing required fields (5%)
        if (Math.random() < 0.5) {
            delete loanRequest.loanId; // Missing loanId
        } else {
            delete loanRequest.application.name; // Missing name
        }
    } else if (failureType < 0.20) {
        // Low credit score (15%)
        loanRequest.creditScore = Math.floor(Math.random() * 300) + 300; // 300-599
    } else if (failureType < 0.30) {
        // Loan amount too high (10%)
        loanRequest.amount = income * (6 + Math.random() * 4); // 6-10x income
    } else if (failureType < 0.33) {
        // Age too low (3%)
        loanRequest.application.age = Math.floor(Math.random() * 18) + 1; // 1-17
    } else if (failureType < 0.35) {
        // Invalid email (2%)
        loanRequest.application.email = "invalid-email-format";
    }
    
    return loanRequest;
}

// Generate 10,000 loan requests
const loanRequests = [];
for (let i = 0; i < 10000; i++) {
    loanRequests.push(generateLoanRequest(i));
}

// Write to JSON file
fs.writeFileSync('loan-test-data.json', JSON.stringify(loanRequests, null, 2));

console.log('Generated 10,000 loan requests in loan-test-data.json');
console.log('Expected failure rates:');
console.log('- Invalid data format: ~5%');
console.log('- Low credit score (<600): ~15%');
console.log('- Loan amount too high (>5x income): ~10%');
console.log('- Age too low (<18): ~3%');
console.log('- Invalid email: ~2%');
console.log('- Total expected failures: ~35%');
console.log('- Expected successful requests: ~65%');