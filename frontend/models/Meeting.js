const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  meetingId: { type: String, required: true, trim: true },
  title: { type: String, required: [true, 'Meeting title is required'], trim: true, maxlength: 300 },
  description: { type: String, trim: true },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['video', 'audio', 'chat'], default: 'video' },
  status: { type: String, enum: ['scheduled', 'live', 'ended', 'cancelled'], default: 'scheduled' },
  scheduledTime: { type: Date },
  startTime: { type: Date },
  endTime: { type: Date },
  duration: { type: Number, default: 0 }, // seconds
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    email: { type: String, trim: true },
    role: { type: String, enum: ['host', 'co_host', 'participant'], default: 'participant' },
    joinedAt: { type: Date },
    leftAt: { type: Date },
    isExternal: { type: Boolean, default: false },
  }],
  maxParticipants: { type: Number, default: 50 },
  isPublic: { type: Boolean, default: true },
  password: { type: String, trim: true },
  publicUrl: { type: String, trim: true },
  recording: {
    enabled: { type: Boolean, default: false },
    url: { type: String },
    size: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    createdDate: { type: Date },
  },
  settings: {
    muteOnEntry: { type: Boolean, default: false },
    videoOffOnEntry: { type: Boolean, default: false },
    allowScreenShare: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    allowRecording: { type: Boolean, default: true },
    waitingRoom: { type: Boolean, default: false },
  },
  agenda: { type: String, trim: true },
  notes: { type: String, trim: true },
  recurrence: {
    type: { type: String, enum: ['none', 'daily', 'weekly', 'monthly'], default: 'none' },
    endDate: { type: Date },
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

meetingSchema.index({ company: 1, meetingId: 1 }, { unique: true });
meetingSchema.index({ company: 1, host: 1 });
meetingSchema.index({ company: 1, status: 1 });
meetingSchema.index({ company: 1, scheduledTime: 1 });

module.exports = mongoose.model('Meeting', meetingSchema);