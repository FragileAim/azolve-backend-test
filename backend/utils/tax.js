/**
 * Utility functions for GST Tax Calculation
 */

/**
 * Parses state code from a place of supply string.
 * Example: '24-GUJARAT' returns '24'
 * @param {string} posString - Place of supply or state string
 * @returns {string} The state code or normalized state name
 */
const parseStateCode = (posString) => {
  if (!posString) return '';
  const parts = posString.split('-');
  return parts[0].trim().toUpperCase();
};

/**
 * Calculates whether a transaction is intra-state (CGST/SGST) or inter-state (IGST)
 * @param {string} companyState - State of the selling company
 * @param {string} clientState - State of the client or Place of Supply
 * @returns {boolean} true if intra-state (same state), false if inter-state
 */
const isIntraState = (companyState, clientState) => {
  const cState = parseStateCode(companyState);
  const pState = parseStateCode(clientState);
  
  if (!cState || !pState) {
    // Default to intra-state if states are not clearly provided, 
    // depending on business requirements. Here we default to true.
    return true; 
  }
  
  return cState === pState;
};

/**
 * Calculates tax split for a line item
 * @param {number} amount - The taxable amount (price * quantity - discount)
 * @param {number} gstRate - The GST rate percentage (e.g., 18)
 * @param {boolean} isIntra - Whether transaction is intra-state
 * @returns {Object} Object containing cgst, sgst, igst, and totalTax
 */
const calculateItemTax = (amount, gstRate, isIntra) => {
  const totalTax = (amount * gstRate) / 100;
  
  if (isIntra) {
    return {
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      igst: 0,
      totalTax
    };
  } else {
    return {
      cgst: 0,
      sgst: 0,
      igst: totalTax,
      totalTax
    };
  }
};

/**
 * Recalculates total tax summary for an invoice based on line items
 * @param {Array} items - Array of line items with their computed taxes
 * @returns {Object} Total tax summary {cgst, sgst, igst, totalTax}
 */
const aggregateTaxSummary = (items) => {
  const summary = { cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
  
  items.forEach(item => {
    summary.cgst += item.cgst || 0;
    summary.sgst += item.sgst || 0;
    summary.igst += item.igst || 0;
    summary.totalTax += item.taxAmount || 0;
  });
  
  return summary;
};

module.exports = {
  parseStateCode,
  isIntraState,
  calculateItemTax,
  aggregateTaxSummary
};
