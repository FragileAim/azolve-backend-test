const fs = require('fs');
const content = fs.readFileSync('c:/Users/dodiy/Downloads/azolve-dashboard-hubspot-update (3)/frontend/app-dashboard.html', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('function renderInvoices') || line.includes('renderInvoices() {')) {
        console.log('Found at line:', i + 1);
    }
});
