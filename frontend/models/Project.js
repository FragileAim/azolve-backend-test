const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: [true, 'Project name is required'], trim: true, maxlength: 300 },
  description: { type: String, trim: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
  deal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal' },
  status: { type: String, enum: ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'], default: 'planning' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  startDate: { type: Date },
  endDate: { type: Date },
  actualEndDate: { type: Date },
  budget: { type: Number, default: 0 },
  spent: { type: Number, default: 0 },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  location: { type: String, trim: true },
  tags: [{ type: String, trim: true }],
  attachments: [{ name: String, url: String, size: Number, uploadedAt: { type: Date, default: Date.now } }],
  milestones: [{
    title: { type: String, trim: true },
    description: { type: String, trim: true },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    completedDate: { type: Date },
  }],
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

projectSchema.index({ company: 1, status: 1 });
projectSchema.index({ company: 1, manager: 1 });
projectSchema.index({ company: 1, client: 1 });

module.exports = mongoose.model('Project', projectSchema);