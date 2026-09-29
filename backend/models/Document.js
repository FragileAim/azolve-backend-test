const mongoose = require('mongoose');
const crypto = require('crypto');

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['document', 'spreadsheet', 'presentation'],
    required: true,
    index: true,
  },
  title: {
    type: String,
    default: 'Untitled',
    trim: true,
    maxlength: 200,
  },
  // Free-form content blob — shape depends on `type`
  // - document    : { html: string, plainText: string }
  // - spreadsheet : { sheets: [{ name, rows, cols, cells: { 'A1': { v, f, s } } }] }
  // - presentation: { slides: [{ id, layout, elements: [...], background }] }
  content: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  thumbnail: { type: String, default: '' },

  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastEditedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  starred: { type: Boolean, default: false },
  trashed: { type: Boolean, default: false },

  // Sharing
  shareToken: { type: String, unique: true, sparse: true, index: true },
  sharePermission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
  isPublic: { type: Boolean, default: false },

  // Per-user collaborators
  collaborators: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    permission: { type: String, enum: ['view', 'comment', 'edit'], default: 'view' },
    addedAt: { type: Date, default: Date.now },
  }],

  // Version snapshot history (kept lightweight)
  versions: [{
    savedAt: { type: Date, default: Date.now },
    savedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contentHash: String,
    note: String,
  }],

  size: { type: Number, default: 0 }, // bytes (approx)
}, { timestamps: true });

documentSchema.methods.generateShareToken = function () {
  this.shareToken = crypto.randomBytes(18).toString('base64url');
  this.isPublic = true;
  return this.shareToken;
};

documentSchema.methods.revokeShare = function () {
  this.shareToken = undefined;
  this.isPublic = false;
};

documentSchema.index({ company: 1, type: 1, trashed: 1, updatedAt: -1 });
documentSchema.index({ createdBy: 1, updatedAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
