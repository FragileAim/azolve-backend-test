const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  title: { type: String, required: [true, 'Event title is required'], trim: true, maxlength: 300 },
  description: { type: String, trim: true },
  type: { type: String, enum: ['meeting', 'reminder', 'task', 'deadline', 'holiday', 'birthday', 'other'], default: 'other' },
  startDate: { type: Date, required: [true, 'Start date is required'] },
  endDate: { type: Date, required: [true, 'End date is required'] },
  allDay: { type: Boolean, default: false },
  location: { type: String, trim: true },
  color: { type: String, default: '#714B67' },
  attendees: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    status: { type: String, enum: ['pending', 'accepted', 'declined', 'tentative'], default: 'pending' },
  }],
  reminder: {
    enabled: { type: Boolean, default: true },
    minutesBefore: { type: Number, default: 30 },
  },
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },
    endDate: { type: Date },
    daysOfWeek: [{ type: Number }], // 0=Sun, 1=Mon, etc.
  },
  relatedTo: {
    model: { type: String, enum: ['Project', 'Deal', 'Lead', 'Meeting', 'Task', ''], default: '' },
    id: { type: mongoose.Schema.Types.ObjectId },
  },
  isPrivate: { type: Boolean, default: false },
  notes: { type: String, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

eventSchema.index({ company: 1, startDate: 1 });
eventSchema.index({ company: 1, createdBy: 1 });
eventSchema.index({ company: 1, type: 1 });
eventSchema.index({ 'attendees.user': 1 });

module.exports = mongoose.model('Event', eventSchema);