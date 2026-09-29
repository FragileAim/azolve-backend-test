/**
 * Utility functions for UPI Payment Integration
 */

/**
 * Generates a dynamic UPI string according to NPCI specifications
 * @param {Object} params - The UPI parameters
 * @param {string} params.pa - Payee VPA (Virtual Payment Address) e.g., merchant@upi
 * @param {string} params.pn - Payee Name e.g., Merchant Name
 * @param {number} params.am - Amount to be paid e.g., 1000.50
 * @param {string} params.tr - Transaction Reference Number (usually Invoice Number)
 * @param {string} params.cu - Currency code (default: INR)
 * @returns {string} The formatted UPI string (upi://pay?...)
 */
const generateUpiString = ({ pa, pn, am, tr, cu = 'INR' }) => {
  if (!pa || !pn || !am) {
    throw new Error('Payee VPA (pa), Payee Name (pn), and Amount (am) are required to generate UPI string.');
  }

  const encodedPa = encodeURIComponent(pa);
  const encodedPn = encodeURIComponent(pn);
  const encodedTr = tr ? encodeURIComponent(tr) : '';
  const amount = Number(am).toFixed(2); // Ensure amount is formatted with two decimal places

  let upiString = `upi://pay?pa=${encodedPa}&pn=${encodedPn}&am=${amount}&cu=${cu}`;
  if (encodedTr) {
    upiString += `&tr=${encodedTr}`;
  }

  return upiString;
};

module.exports = {
  generateUpiString
};
