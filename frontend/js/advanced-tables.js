// Advanced Table System - Inspired by WorkDo Dash
// Sophisticated data tables with sorting, filtering, pagination, and bulk actions

class AdvancedTable {
    constructor(options) {
        this.options = {
            container: null,
            columns: [],
            data: [],
            sortable: true,
            filterable: true,
            searchable: true,
            paginated: true,
            pageSize: 10,
            selectable: true,
            exportable: true,
            emptyMessage: 'No data available',
            ...options
        };
        
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.currentPage = 1;
        this.filters = {};
        this.searchQuery = '';
        this.selectedRows = new Set();
        this.filteredData = [];
        
        this.init();
    }

    init() {
        this.render();
        this.attachEventListeners();
    }

    render() {
        const container = document.getElementById(this.options.container);
        if (!container) {
            console.error(`Container with id "${this.options.container}" not found`);
            return;
        }

        this.applyFilters();
        this.applyPagination();
        
        container.innerHTML = this.getTableHTML();
        this.attachRowEventListeners();
    }

    getTableHTML() {
        const headerHTML = this.getHeaderHTML();
        const bodyHTML = this.getBodyHTML();
        const footerHTML = this.getFooterHTML();
        const toolbarHTML = this.getToolbarHTML();

        return `
            <div class="advanced-table-wrapper">
                ${toolbarHTML}
                <div class="table-container">
                    <table class="advanced-table">
                        <thead>${headerHTML}</thead>
                        <tbody>${bodyHTML}</tbody>
                    </table>
                </div>
                ${footerHTML}
            </div>
        `;
    }

    getToolbarHTML() {
        const searchHTML = this.options.searchable ? `
            <div class="table-search">
                <input type="text" 
                       class="search-input" 
                       placeholder="Search..." 
                       value="${this.searchQuery}"
                       data-table-search>
                <i class="fas fa-search search-icon"></i>
            </div>
        ` : '';

        const filterHTML = this.options.filterable ? `
            <div class="table-filters">
                <button class="btn btn-outline btn-sm" data-table-filter>
                    <i class="fas fa-filter"></i> Filters
                    ${Object.keys(this.filters).length > 0 ? 
                        `<span class="filter-count">${Object.keys(this.filters).length}</span>` : ''}
                </button>
            </div>
        ` : '';

        const exportHTML = this.options.exportable ? `
            <div class="table-actions">
                <button class="btn btn-outline btn-sm" data-table-export="csv">
                    <i class="fas fa-download"></i> Export CSV
                </button>
            </div>
        ` : '';

        return `
            <div class="table-toolbar">
                <div class="toolbar-left">
                    <h3 class="table-title">${this.options.title || 'Data Table'}</h3>
                    ${this.selectedRows.size > 0 ? `
                        <div class="bulk-actions">
                            <span class="selected-count">${this.selectedRows.size} selected</span>
                            <button class="btn btn-sm btn-primary" data-table-bulk-action="edit">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-danger" data-table-bulk-action="delete">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="toolbar-right">
                    ${searchHTML}
                    ${filterHTML}
                    ${exportHTML}
                </div>
            </div>
        `;
    }

    getHeaderHTML() {
        const selectHTML = this.options.selectable ? `
            <th class="table-header checkbox-column">
                <input type="checkbox" class="select-all" data-table-select-all>
            </th>
        ` : '';

        const columnsHTML = this.options.columns.map(column => {
            const sortableHTML = this.options.sortable && column.sortable !== false ? `
                <span class="sort-icon ${this.sortColumn === column.key ? this.sortDirection : ''}">
                    <i class="fas fa-sort"></i>
                </span>
            ` : '';

            return `
                <th class="table-header ${column.key}" 
                    data-sort="${column.key}"
                    style="${column.width ? `width: ${column.width}` : ''}">
                    ${column.label}
                    ${sortableHTML}
                </th>
            `;
        }).join('');

        return `<tr>${selectHTML}${columnsHTML}</tr>`;
    }

    getBodyHTML() {
        if (this.paginatedData.length === 0) {
            return `
                <tr class="empty-row">
                    <td colspan="${this.options.columns.length + (this.options.selectable ? 1 : 0)}">
                        <div class="empty-state">
                            <i class="fas fa-inbox empty-icon"></i>
                            <p>${this.options.emptyMessage}</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        return this.paginatedData.map((row, index) => {
            const selectHTML = this.options.selectable ? `
                <td class="table-cell checkbox-column">
                    <input type="checkbox" 
                           class="row-select" 
                           data-row-id="${row.id || index}"
                           ${this.selectedRows.has(row.id || index) ? 'checked' : ''}>
                </td>
            ` : '';

            const cellsHTML = this.options.columns.map(column => {
                const value = this.getColumnValue(row, column);
                const cellHTML = column.render ? column.render(value, row) : this.formatCellValue(value, column);
                
                return `<td class="table-cell">${cellHTML}</td>`;
            }).join('');

            return `<tr class="table-row" data-row-id="${row.id || index}">${selectHTML}${cellsHTML}</tr>`;
        }).join('');
    }

    getFooterHTML() {
        if (!this.options.paginated) return '';

        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        const startRecord = ((this.currentPage - 1) * this.options.pageSize) + 1;
        const endRecord = Math.min(this.currentPage * this.options.pageSize, this.filteredData.length);
        const totalRecords = this.filteredData.length;

        const paginationHTML = totalPages > 1 ? `
            <div class="pagination">
                <button class="pagination-btn prev" 
                        ${this.currentPage === 1 ? 'disabled' : ''} 
                        data-table-page="prev">
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${this.getPageNumbers().map(page => `
                    <button class="pagination-btn ${page === this.currentPage ? 'active' : ''}" 
                            data-table-page="${page}">
                        ${page}
                    </button>
                `).join('')}
                <button class="pagination-btn next" 
                        ${this.currentPage === totalPages ? 'disabled' : ''} 
                        data-table-page="next">
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        ` : '';

        return `
            <div class="table-footer">
                <div class="table-info">
                    Showing ${startRecord} to ${endRecord} of ${totalRecords} entries
                </div>
                ${paginationHTML}
            </div>
        `;
    }

    getPageNumbers() {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            const endPage = Math.min(totalPages, startPage + maxVisible - 1);

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
        }

        return pages;
    }

    getColumnValue(row, column) {
        const keys = column.key.split('.');
        let value = row;
        
        for (const key of keys) {
            if (value && value[key] !== undefined) {
                value = value[key];
            } else {
                value = '';
                break;
            }
        }
        
        return value;
    }

    formatCellValue(value, column) {
        if (value === null || value === undefined) return '-';
        
        switch (column.type) {
            case 'currency':
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD'
                }).format(value);
            case 'number':
                return new Intl.NumberFormat('en-US').format(value);
            case 'date':
                return new Date(value).toLocaleDateString();
            case 'datetime':
                return new Date(value).toLocaleString();
            case 'badge':
                return `<span class="badge ${column.badgeClass || 'badge-secondary'}">${value}</span>`;
            case 'status':
                const statusConfig = this.getStatusConfig(value, column);
                return `<span class="badge ${statusConfig.className}" title="${statusConfig.label}">
                    <i class="fas ${statusConfig.icon}"></i> ${value}
                </span>`;
            default:
                return value;
        }
    }

    getStatusConfig(status, column) {
        const defaultConfig = {
            className: 'badge-secondary',
            icon: 'fa-question-circle',
            label: status
        };

        if (column.statusConfig && column.statusConfig[status]) {
            return column.statusConfig[status];
        }

        // Default status configurations
        const commonStatuses = {
            active: { className: 'badge-success', icon: 'fa-check-circle', label: 'Active' },
            inactive: { className: 'badge-secondary', icon: 'fa-minus-circle', label: 'Inactive' },
            pending: { className: 'badge-warning', icon: 'fa-clock', label: 'Pending' },
            completed: { className: 'badge-success', icon: 'fa-check-circle', label: 'Completed' },
            cancelled: { className: 'badge-danger', icon: 'fa-times-circle', label: 'Cancelled' },
            draft: { className: 'badge-secondary', icon: 'fa-file-alt', label: 'Draft' },
            sent: { className: 'badge-warning', icon: 'fa-paper-plane', label: 'Sent' },
            paid: { className: 'badge-success', icon: 'fa-check-circle', label: 'Paid' },
            overdue: { className: 'badge-danger', icon: 'fa-exclamation-circle', label: 'Overdue' }
        };

        return commonStatuses[status?.toLowerCase()] || defaultConfig;
    }

    applyFilters() {
        this.filteredData = [...this.options.data];

        // Apply search filter
        if (this.searchQuery) {
            const search = this.searchQuery.toLowerCase();
            this.filteredData = this.filteredData.filter(row => {
                return this.options.columns.some(column => {
                    const value = this.getColumnValue(row, column);
                    return String(value).toLowerCase().includes(search);
                });
            });
        }

        // Apply column filters
        Object.keys(this.filters).forEach(columnKey => {
            const filterValue = this.filters[columnKey];
            if (filterValue) {
                this.filteredData = this.filteredData.filter(row => {
                    const value = this.getColumnValue(row, { key: columnKey });
                    return String(value).toLowerCase().includes(filterValue.toLowerCase());
                });
            }
        });
    }

    applyPagination() {
        const startIndex = (this.currentPage - 1) * this.options.pageSize;
        const endIndex = startIndex + this.options.pageSize;
        this.paginatedData = this.filteredData.slice(startIndex, endIndex);
    }

    sortData(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        const column = this.options.columns.find(col => col.key === columnKey);
        
        this.filteredData.sort((a, b) => {
            const aVal = this.getColumnValue(a, column);
            const bVal = this.getColumnValue(b, column);

            let comparison = 0;
            
            if (column.type === 'number' || column.type === 'currency') {
                comparison = parseFloat(aVal || 0) - parseFloat(bVal || 0);
            } else if (column.type === 'date' || column.type === 'datetime') {
                comparison = new Date(aVal) - new Date(bVal);
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }

            return this.sortDirection === 'desc' ? -comparison : comparison;
        });

        this.applyPagination();
        this.render();
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredData.length / this.options.pageSize);
        
        if (page === 'prev') {
            this.currentPage = Math.max(1, this.currentPage - 1);
        } else if (page === 'next') {
            this.currentPage = Math.min(totalPages, this.currentPage + 1);
        } else {
            this.currentPage = page;
        }

        this.applyPagination();
        this.render();
    }

    toggleRowSelection(rowId) {
        if (this.selectedRows.has(rowId)) {
            this.selectedRows.delete(rowId);
        } else {
            this.selectedRows.add(rowId);
        }
        this.render();
    }

    toggleAllRows() {
        const allSelected = this.paginatedData.every(row => 
            this.selectedRows.has(row.id || this.paginatedData.indexOf(row))
        );

        if (allSelected) {
            this.paginatedData.forEach(row => {
                this.selectedRows.delete(row.id || this.paginatedData.indexOf(row));
            });
        } else {
            this.paginatedData.forEach(row => {
                this.selectedRows.add(row.id || this.paginatedData.indexOf(row));
            });
        }

        this.render();
    }

    search(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.applyFilters();
        this.applyPagination();
        this.render();
    }

    setFilter(columnKey, value) {
        if (value) {
            this.filters[columnKey] = value;
        } else {
            delete this.filters[columnKey];
        }
        this.currentPage = 1;
        this.applyFilters();
        this.applyPagination();
        this.render();
    }

    updateData(newData) {
        this.options.data = newData;
        this.currentPage = 1;
        this.applyFilters();
        this.applyPagination();
        this.render();
    }

    exportCSV() {
        const headers = this.options.columns.map(col => col.label);
        const rows = this.filteredData.map(row => 
            this.options.columns.map(col => {
                const value = this.getColumnValue(row, col);
                return `"${String(value).replace(/"/g, '""')}"`;
            })
        );

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.options.title || 'export'}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    attachEventListeners() {
        const container = document.getElementById(this.options.container);
        if (!container) return;

        // Search input
        container.addEventListener('input', (e) => {
            if (e.target.dataset.tableSearch) {
                this.search(e.target.value);
            }
        });

        // Sort headers
        container.addEventListener('click', (e) => {
            const header = e.target.closest('[data-sort]');
            if (header && this.options.sortable) {
                this.sortData(header.dataset.sort);
            }
        });

        // Pagination
        container.addEventListener('click', (e) => {
            const pageBtn = e.target.closest('[data-table-page]');
            if (pageBtn) {
                this.changePage(pageBtn.dataset.tablePage);
            }
        });

        // Row selection
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-select')) {
                this.toggleRowSelection(e.target.dataset.rowId);
            } else if (e.target.classList.contains('select-all')) {
                this.toggleAllRows();
            }
        });

        // Export
        container.addEventListener('click', (e) => {
            const exportBtn = e.target.closest('[data-table-export]');
            if (exportBtn && exportBtn.dataset.tableExport === 'csv') {
                this.exportCSV();
            }
        });

        // Row click
        container.addEventListener('click', (e) => {
            const row = e.target.closest('.table-row');
            const checkbox = e.target.closest('input[type="checkbox"]');
            
            if (row && !checkbox && this.options.onRowClick) {
                const rowId = row.dataset.rowId;
                const rowData = this.paginatedData.find(r => 
                    r.id === rowId || this.paginatedData.indexOf(r).toString() === rowId
                );
                if (rowData) {
                    this.options.onRowClick(rowData);
                }
            }
        });
    }

    attachRowEventListeners() {
        // Additional row-specific event listeners can be added here
    }
}

// Export for global use
window.AdvancedTable = AdvancedTable;

console.log('Advanced Tables loaded successfully!');