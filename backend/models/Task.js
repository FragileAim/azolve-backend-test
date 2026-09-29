const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: 300 },
  description: { type: String, trim: true },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  completedDate: { type: Date },
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  tags: [{ type: String, trim: true }],
  attachments: [{ name: String, url: String, size: Number }],
  checklist: [{
    text: { type: String, trim: true },
    completed: { type: Boolean, default: false },
  }],
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, trim: true },
    text: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  }],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

taskSchema.index({ company: 1, project: 1 });
taskSchema.index({ company: 1, assignedTo: 1 });
taskSchema.index({ company: 1, status: 1 });
taskSchema.index({ company: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);