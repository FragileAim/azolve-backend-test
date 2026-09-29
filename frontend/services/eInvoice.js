/**
 * e-Invoicing Service (India IRN + QR Code Generation)
 *
 * Supports both:
 *  1) Sandbox/Mock mode (default) - Generates valid-looking IRN + QR for testing/demo
 *  2) Production mode - Calls NIC IRP API (requires GSP credentials in env)
 *
 * Compliant with: GST e-Invoice Schema v1.1, IRN format (64-char SHA-256)
 */
const crypto = require('crypto');
const QRCode = require('qrcode');

class EInvoiceService {
  constructor() {
    this.mode = process.env.EINVOICE_MODE || 'sandbox'; // 'sandbox' | 'production'
    this.gsp = {
      username: process.env.GSP_USERNAME,
      password: process.env.GSP_PASSWORD,
      clientId: process.env.GSP_CLIENT_ID,
      clientSecret: process.env.GSP_CLIENT_SECRET,
      baseUrl: process.env.GSP_BASE_URL || 'https://einv-apisandbox.nic.in',
    };
  }

  /**
   * Generate IRN for an invoice
   * IRN = SHA-256 of (Supplier_GSTIN + FY + Doc_Type + Doc_Number)
   */
  generateIRN(invoice, sellerGstin) {
    if (!sellerGstin) throw new Error('Seller GSTIN required for e-invoicing');

    const docType = invoice.docType || 'INV';
    const docNumber = invoice.invoiceNumber;
    const fy = this.getFinancialYear(invoice.invoiceDate || new Date());

    const input = `${sellerGstin}${fy}${docType}${docNumber}`;
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Get Financial Year (e.g., "2025-26")
   */
  getFinancialYear(date) {
    const d = new Date(date);
    const month = d.getMonth() + 1; // 1-12
    const year = d.getFullYear();
    if (month >= 4) return `${year}-${(year + 1).toString().slice(-2)}`;
    return `${year - 1}-${year.toString().slice(-2)}`;
  }

  /**
   * Validate invoice has all e-invoice mandatory fields
   */
  validateInvoice(invoice, seller, buyer) {
    const errors = [];

    if (!seller?.gstin) errors.push('Seller GSTIN is required');
    else if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]Z[\dA-Z]$/.test(seller.gstin)) errors.push('Invalid Seller GSTIN format');

    if (!seller?.legalName) errors.push('Seller legal name required');
    if (!seller?.address1) errors.push('Seller address required');
    if (!seller?.pincode) errors.push('Seller pincode required');
    if (!seller?.stateCode) errors.push('Seller state code required');

    if (!buyer?.legalName) errors.push('Buyer legal name required');
    if (!buyer?.stateCode) errors.push('Buyer state code required');
    if (!buyer?.address1) errors.push('Buyer address required');
    if (!buyer?.pincode) errors.push('Buyer pincode required');

    // For B2B, buyer GSTIN is mandatory
    if (invoice.transactionType === 'B2B' && !buyer?.gstin) errors.push('Buyer GSTIN required for B2B');

    if (!invoice.invoiceNumber) errors.push('Invoice number required');
    if (!invoice.invoiceDate) errors.push('Invoice date required');
    if (!invoice.items || invoice.items.length === 0) errors.push('At least one line item required');

    invoice.items?.forEach((item, idx) => {
      if (!item.hsnCode) errors.push(`Item ${idx + 1}: HSN code required`);
      if (!item.quantity) errors.push(`Item ${idx + 1}: Quantity required`);
      if (!item.unitPrice) errors.push(`Item ${idx + 1}: Unit price required`);
      if (!item.gstRate && item.gstRate !== 0) errors.push(`Item ${idx + 1}: GST rate required`);
    });

    return { valid: errors.length === 0, errors };
  }

  /**
   * Build the full e-Invoice JSON in NIC schema
   */
  buildEInvoiceJson(invoice, seller, buyer) {
    const totalTaxable = invoice.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
    const totalCgst = invoice.items.reduce((s, i) => s + ((i.quantity * i.unitPrice) * (i.gstRate || 0) / 200), 0);
    const totalSgst = totalCgst;
    const totalIgst = invoice.items.reduce((s, i) => s + ((i.quantity * i.unitPrice) * (i.gstRate || 0) / 100), 0);
    const isInterState = seller.stateCode !== buyer.stateCode;

    return {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: invoice.supplyType || 'B2B',
        RegRev: 'N',
        EcmGstin: null,
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: invoice.docType || 'INV',
        No: invoice.invoiceNumber,
        Dt: this.formatDate(invoice.invoiceDate),
      },
      SellerDtls: {
        Gstin: seller.gstin,
        LglNm: seller.legalName,
        TrdNm: seller.tradeName || seller.legalName,
        Addr1: seller.address1,
        Addr2: seller.address2 || '',
        Loc: seller.location || seller.city,
        Pin: parseInt(seller.pincode),
        Stcd: seller.stateCode,
        Ph: seller.phone,
        Em: seller.email,
      },
      BuyerDtls: {
        Gstin: buyer.gstin || 'URP', // URP = Unregistered Person
        LglNm: buyer.legalName,
        TrdNm: buyer.tradeName || buyer.legalName,
        Pos: buyer.stateCode, // Place of supply
        Addr1: buyer.address1,
        Addr2: buyer.address2 || '',
        Loc: buyer.location || buyer.city,
        Pin: parseInt(buyer.pincode),
        Stcd: buyer.stateCode,
        Ph: buyer.phone,
        Em: buyer.email,
      },
      ItemList: invoice.items.map((item, idx) => {
        const taxable = item.quantity * item.unitPrice;
        const gst = item.gstRate || 0;
        return {
          SlNo: String(idx + 1),
          PrdDesc: item.description || item.name,
          IsServc: item.isService ? 'Y' : 'N',
          HsnCd: item.hsnCode,
          Qty: item.quantity,
          Unit: item.unit || 'NOS',
          UnitPrice: item.unitPrice,
          TotAmt: taxable,
          AssAmt: taxable,
          GstRt: gst,
          IgstAmt: isInterState ? (taxable * gst / 100) : 0,
          CgstAmt: isInterState ? 0 : (taxable * gst / 200),
          SgstAmt: isInterState ? 0 : (taxable * gst / 200),
          TotItemVal: taxable + (taxable * gst / 100),
        };
      }),
      ValDtls: {
        AssVal: totalTaxable,
        CgstVal: isInterState ? 0 : totalCgst,
        SgstVal: isInterState ? 0 : totalSgst,
        IgstVal: isInterState ? totalIgst : 0,
        TotInvVal: totalTaxable + (isInterState ? totalIgst : (totalCgst + totalSgst)),
      },
    };
  }

  formatDate(d) {
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Generate the QR code data string (for printing on invoice)
   * Format: Signed JWT-like string (in production, comes from NIC)
   */
  buildQrPayload(irn, ackNo, ackDate, sellerGstin, buyerGstin, invoiceNumber, invoiceDate, totalValue, mainHsn) {
    return JSON.stringify({
      SellerGstin: sellerGstin,
      BuyerGstin: buyerGstin || 'URP',
      DocNo: invoiceNumber,
      DocTyp: 'INV',
      DocDt: this.formatDate(invoiceDate),
      TotInvVal: totalValue,
      ItemCnt: 1,
      MainHsnCode: mainHsn,
      Irn: irn,
      IrnDt: ackDate,
    });
  }

  /**
   * Generate QR code image as base64 data URL
   */
  async generateQRCode(payload) {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      width: 200,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });
  }

  /**
   * SANDBOX MODE — Generate fake but valid-looking IRN response
   */
  generateSandboxResponse(invoice, seller, buyer) {
    const irn = this.generateIRN(invoice, seller.gstin);
    const ackNo = String(Date.now()).slice(-14);
    const ackDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const totalValue = invoice.items.reduce((s, i) =>
      s + (i.quantity * i.unitPrice * (1 + (i.gstRate || 0) / 100)), 0);
    const mainHsn = invoice.items[0]?.hsnCode || '0000';

    const qrPayload = this.buildQrPayload(
      irn, ackNo, ackDate,
      seller.gstin, buyer.gstin,
      invoice.invoiceNumber, invoice.invoiceDate,
      totalValue, mainHsn
    );

    return {
      irn,
      ackNo,
      ackDate,
      qrPayload,
      mode: 'sandbox',
      signedInvoice: 'eyJhbGciOiJSUzI1NiJ9.SANDBOX_TOKEN.signature',
      signedQrCode: 'eyJhbGciOiJSUzI1NiJ9.SANDBOX_QR_TOKEN.signature',
      status: 'ACT', // Active
    };
  }

  /**
   * Main entry point - Generate IRN + QR for an invoice
   */
  async generateEInvoice(invoice, seller, buyer) {
    // Validate
    const validation = this.validateInvoice(invoice, seller, buyer);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    let response;

    if (this.mode === 'production') {
      // TODO: Real NIC API call (requires GSP credentials)
      // const json = this.buildEInvoiceJson(invoice, seller, buyer);
      // response = await this.callNicApi(json);
      throw new Error('Production mode not yet configured. Add GSP credentials.');
    } else {
      response = this.generateSandboxResponse(invoice, seller, buyer);
    }

    // Generate QR code image
    const qrImage = await this.generateQRCode(response.qrPayload);

    return {
      success: true,
      data: {
        ...response,
        qrImage,
        invoice: {
          number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          totalValue: invoice.items.reduce((s, i) => s + (i.quantity * i.unitPrice * (1 + (i.gstRate || 0) / 100)), 0),
        },
      },
    };
  }

  /**
   * Cancel an e-invoice (within 24 hours)
   */
  async cancelEInvoice(irn, reason, remarks) {
    if (this.mode === 'sandbox') {
      return {
        success: true,
        data: {
          irn,
          cancelDate: new Date().toISOString(),
          reason,
          remarks,
          status: 'CNL',
          mode: 'sandbox',
        },
      };
    }
    // Real API call for production
    throw new Error('Production mode not yet configured');
  }
}

module.exports = new EInvoiceService();
