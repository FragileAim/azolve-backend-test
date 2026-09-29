const fs = require('fs');
const path = require('path');

function searchFiles(dir, term) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            searchFiles(fullPath, term);
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.toLowerCase().includes(term.toLowerCase())) {
                console.log(`Found "${term}" in ${fullPath}`);
            }
        }
    }
}

console.log('Searching for Quotation sections...');
searchFiles(path.join(__dirname, '../frontend'), 'quotations-section');
searchFiles(path.join(__dirname, '../frontend'), 'quotationList');

console.log('Searching for Create Invoice...');
searchFiles(path.join(__dirname, '../frontend'), 'createInvoiceModal');
searchFiles(path.join(__dirname, '../frontend'), 'invoice-modal');
