const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../frontend/dashboard.html');
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

const terms = ['id="invoiceModal"', 'id="quotations"', 'id="page-invoices"', 'id="page-quotations"'];

terms.forEach(term => {
    console.log(`\nSearching for: ${term}`);
    lines.forEach((line, index) => {
        if (line.includes(term)) {
            console.log(`Line ${index + 1}: ${line.trim()}`);
        }
    });
});
