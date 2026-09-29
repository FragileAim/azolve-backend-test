// Enhanced Invoice System - Inspired by WorkDo Dash
// Advanced invoice management with multiple templates, line items, payments, etc.

// Enhanced Invoice Templates
const INVOICE_TEMPLATES = {
    modern: {
        name: 'Modern Professional',
        description: 'Clean and contemporary design with teal accents',
        preview: 'Modern template with clean lines, card-based layout, and professional typography'
    },
    classic: {
        name: 'Classic Corporate',
        description: 'Traditional business invoice with formal styling',
        preview: 'Classic template with serif fonts, border frames, and formal layout'
    },
    detailed: {
        name: 'Comprehensive Detailed',
        description: 'Information-rich with all business details',
        preview: 'Detailed template with comprehensive sections, tax breakdowns, and notes'
    },
    minimal: {
        name: 'Minimal Elegant',
        description: 'Ultra-simple, black and white design',
        preview: 'Minimal template with generous white space and typography focus'
    },
    bold: {
        name: 'Bold Statement',
        description: 'High contrast with strong visual impact',
        preview: 'Bold template with dark background, bright accents, and strong typography'
    },
    elegant: {
        name: 'Elegant Premium',
        description: 'Sophisticated design with premium feel',
        preview: 'Elegant template with gold accents, refined typography, and luxury feel'
    }
};

// Invoice Status Options
const INVOICE_STATUS = {
    draft: { label: 'Draft', color: '#6c757d', icon: 'fa-file-alt' },
    sent: { label: 'Sent', color: '#ffc107', icon: 'fa-paper-plane' },
    viewed: { label: 'Viewed', color: '#17a2b8', icon: 'fa-eye' },
    partial: { label: 'Partial', color: '#fd7e14', icon: 'fa-clock' },
    paid: { label: 'Paid', color: '#28a745', icon: 'fa-check-circle' },
    overdue: { label: 'Overdue', color: '#dc3545', icon: 'fa-exclamation-circle' },
    cancelled: { label: 'Cancelled', color: '#6c757d', icon: 'fa-times-circle' }
};

// Enhanced Invoice Data Structure
class EnhancedInvoice {
    constructor() {
        this.id = null;
        this.number = '';
        this.client = {
            id: null,
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            state: '',
            zip: '',
            country: ''
        };
        this.dates = {
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            sentDate: null,
            paidDate: null
        };
        this.status = 'draft';
        this.template = 'modern';
        this.currency = 'USD';
        this.taxRate = 0;
        this.discountType = 'percentage'; // percentage or fixed
        this.discountValue = 0;
        this.lineItems = [];
        this.payments = [];
        this.notes = '';
        this.terms = '';
        this.attachments = [];
        this.history = [];
        this.createdBy = null;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    // Add line item
    addLineItem(item) {
        const lineItem = {
            id: Date.now(),
            description: item.description || '',
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            taxRate: item.taxRate || this.taxRate,
            discount: item.discount || 0,
            total: 0
        };
        lineItem.total = this.calculateLineItemTotal(lineItem);
        this.lineItems.push(lineItem);
        this.updateTimestamp();
        return lineItem;
    }

    // Calculate line item total
    calculateLineItemTotal(item) {
        const subtotal = item.quantity * item.unitPrice;
        const taxAmount = subtotal * (item.taxRate / 100);
        const discountAmount = item.discountType === 'percentage' 
            ? subtotal * (item.discount / 100)
            : item.discount;
        return subtotal + taxAmount - discountAmount;
    }

    // Calculate invoice totals
    calculateTotals() {
        const subtotal = this.lineItems.reduce((sum, item) => 
            sum + (item.quantity * item.unitPrice), 0);
        
        const totalTax = this.lineItems.reduce((sum, item) => 
            sum + (item.quantity * item.unitPrice * item.taxRate / 100), 0);
        
        const totalDiscount = this.discountType === 'percentage'
            ? subtotal * (this.discountValue / 100)
            : this.discountValue;
        
        const total = subtotal + totalTax - totalDiscount;
        
        const paidAmount = this.payments.reduce((sum, payment) => 
            sum + payment.amount, 0);
        
        const balance = total - paidAmount;

        return {
            subtotal,
            totalTax,
            totalDiscount,
            total,
            paidAmount,
            balance
        };
    }

    // Add payment
    addPayment(payment) {
        const newPayment = {
            id: Date.now(),
            date: payment.date || new Date().toISOString().split('T')[0],
            amount: payment.amount || 0,
            method: payment.method || 'bank_transfer',
            reference: payment.reference || '',
            notes: payment.notes || ''
        };
        this.payments.push(newPayment);
        
        // Update status based on payments
        const totals = this.calculateTotals();
        if (totals.balance <= 0) {
            this.status = 'paid';
            this.dates.paidDate = newPayment.date;
        } else if (totals.paidAmount > 0) {
            this.status = 'partial';
        }
        
        this.updateTimestamp();
        this.addToHistory(`Payment received: ${this.formatCurrency(newPayment.amount)}`);
        return newPayment;
    }

    // Update status
    updateStatus(newStatus) {
        const oldStatus = this.status;
        this.status = newStatus;
        
        if (newStatus === 'sent' && !this.dates.sentDate) {
            this.dates.sentDate = new Date().toISOString().split('T')[0];
        }
        
        this.addToHistory(`Status changed from ${oldStatus} to ${newStatus}`);
        this.updateTimestamp();
    }

    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: this.currency
        }).format(amount);
    }

    // Add to history
    addToHistory(action) {
        this.history.unshift({
            id: Date.now(),
            action,
            timestamp: new Date().toISOString(),
            user: this.createdBy || 'System'
        });
    }

    // Update timestamp
    updateTimestamp() {
        this.updatedAt = new Date().toISOString();
    }

    // Generate invoice number
    generateInvoiceNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
        this.number = `INV-${year}-${month}-${random}`;
        return this.number;
    }

    // Convert to JSON
    toJSON() {
        return {
            ...this,
            totals: this.calculateTotals()
        };
    }
}

// Invoice Manager
class InvoiceManager {
    constructor() {
        this.invoices = [];
        this.clients = [];
        this.settings = {
            defaultTemplate: 'modern',
            defaultTaxRate: 0,
            defaultTerms: 'Payment due within 30 days',
            autoNumber: true,
            currency: 'USD'
        };
    }

    // Create new invoice
    createInvoice(data = {}) {
        const invoice = new EnhancedInvoice();
        
        if (data.id) invoice.id = data.id;
        if (data.client) invoice.client = { ...invoice.client, ...data.client };
        if (data.dates) invoice.dates = { ...invoice.dates, ...data.dates };
        if (data.status) invoice.status = data.status;
        if (data.template) invoice.template = data.template;
        if (data.currency) invoice.currency = data.currency;
        if (data.taxRate !== undefined) invoice.taxRate = data.taxRate;
        if (data.notes) invoice.notes = data.notes;
        if (data.terms) invoice.terms = data.terms;
        
        if (data.lineItems) {
            data.lineItems.forEach(item => invoice.addLineItem(item));
        }
        
        if (data.payments) {
            data.payments.forEach(payment => invoice.addPayment(payment));
        }
        
        if (this.settings.autoNumber) {
            invoice.generateInvoiceNumber();
        }
        
        this.invoices.push(invoice);
        return invoice;
    }

    // Get invoice by ID
    getInvoice(id) {
        return this.invoices.find(inv => inv.id === id);
    }

    // Get all invoices
    getAllInvoices(filters = {}) {
        let filtered = [...this.invoices];
        
        if (filters.status) {
            filtered = filtered.filter(inv => inv.status === filters.status);
        }
        
        if (filters.clientId) {
            filtered = filtered.filter(inv => inv.client.id === filters.clientId);
        }
        
        if (filters.dateFrom) {
            filtered = filtered.filter(inv => inv.dates.issueDate >= filters.dateFrom);
        }
        
        if (filters.dateTo) {
            filtered = filtered.filter(inv => inv.dates.issueDate <= filters.dateTo);
        }
        
        if (filters.search) {
            const search = filters.search.toLowerCase();
            filtered = filtered.filter(inv => 
                inv.number.toLowerCase().includes(search) ||
                inv.client.name.toLowerCase().includes(search) ||
                inv.client.email.toLowerCase().includes(search)
            );
        }
        
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Update invoice
    updateInvoice(id, updates) {
        const invoice = this.getInvoice(id);
        if (!invoice) return null;
        
        Object.keys(updates).forEach(key => {
            if (key === 'client') {
                invoice.client = { ...invoice.client, ...updates[key] };
            } else if (key === 'dates') {
                invoice.dates = { ...invoice.dates, ...updates[key] };
            } else {
                invoice[key] = updates[key];
            }
        });
        
        invoice.updateTimestamp();
        return invoice;
    }

    // Delete invoice
    deleteInvoice(id) {
        const index = this.invoices.findIndex(inv => inv.id === id);
        if (index !== -1) {
            const deleted = this.invoices.splice(index, 1)[0];
            return deleted;
        }
        return null;
    }

    // Get invoice statistics
    getStatistics() {
        const totalInvoices = this.invoices.length;
        const paidInvoices = this.invoices.filter(inv => inv.status === 'paid').length;
        const draftInvoices = this.invoices.filter(inv => inv.status === 'draft').length;
        const overdueInvoices = this.invoices.filter(inv => inv.status === 'overdue').length;
        
        const totalRevenue = this.invoices.reduce((sum, inv) => {
            const totals = inv.calculateTotals();
            return sum + (inv.status === 'paid' ? totals.total : 0);
        }, 0);
        
        const pendingRevenue = this.invoices.reduce((sum, inv) => {
            const totals = inv.calculateTotals();
            return sum + (inv.status !== 'paid' && inv.status !== 'cancelled' ? totals.total : 0);
        }, 0);
        
        return {
            totalInvoices,
            paidInvoices,
            draftInvoices,
            overdueInvoices,
            totalRevenue,
            pendingRevenue,
            paymentRate: totalInvoices > 0 ? (paidInvoices / totalInvoices * 100).toFixed(1) : 0
        };
    }

    // Export invoices to CSV
    exportToCSV(invoices = null) {
        const data = invoices || this.getAllInvoices();
        if (data.length === 0) return '';
        
        const headers = ['Invoice Number', 'Client', 'Date', 'Due Date', 'Status', 'Subtotal', 'Tax', 'Total', 'Paid', 'Balance'];
        const rows = data.map(inv => {
            const totals = inv.calculateTotals();
            return [
                inv.number,
                inv.client.name,
                inv.dates.issueDate,
                inv.dates.dueDate,
                inv.status,
                totals.subtotal.toFixed(2),
                totals.totalTax.toFixed(2),
                totals.total.toFixed(2),
                totals.paidAmount.toFixed(2),
                totals.balance.toFixed(2)
            ];
        });
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
}

// Initialize global invoice manager
let invoiceManager = new InvoiceManager();

// Export functions for use in HTML
window.EnhancedInvoice = EnhancedInvoice;
window.InvoiceManager = InvoiceManager;
window.invoiceManager = invoiceManager;
window.INVOICE_TEMPLATES = INVOICE_TEMPLATES;
window.INVOICE_STATUS = INVOICE_STATUS;

console.log('Enhanced Invoice System loaded successfully!');