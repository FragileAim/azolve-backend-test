const mongoose = require('mongoose');

const leaveSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, enum: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'unpaid', 'compensatory'], required: [true, 'Leave type is required'] },
  startDate: { type: Date, required: [true, 'Start date is required'] },
  endDate: { type: Date, required: [true, 'End date is required'] },
  totalDays: { type: Number, required: true },
  reason: { type: String, required: [true, 'Reason is required'], trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedDate: { type: Date },
  rejectionReason: { type: String, trim: true },
  isHalfDay: { type: Boolean, default: false },
  halfDayType: { type: String, enum: ['first_half', 'second_half', ''], default: '' },
  attachments: [{ name: String, url: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

leaveSchema.index({ company: 1, employee: 1 });
leaveSchema.index({ company: 1, status: 1 });
leaveSchema.index({ company: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Leave', leaveSchema);