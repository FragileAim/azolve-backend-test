const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, required: true },
  clockIn: { type: Date },
  clockOut: { type: Date },
  breaks: [{
    start: { type: Date },
    end: { type: Date },
    duration: { type: Number, default: 0 }, // minutes
  }],
  totalBreakMinutes: { type: Number, default: 0 },
  totalWorkMinutes: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  overtime: { type: Number, default: 0 }, // minutes
  status: { type: String, enum: ['present', 'absent', 'half_day', 'late', 'on_leave', 'work_from_home', 'holiday'], default: 'present' },
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    address: { type: String, trim: true },
  },
  ipAddress: { type: String, trim: true },
  device: { type: String, trim: true },
  notes: { type: String, trim: true },
  isAutoClockOut: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

attendanceSchema.index({ company: 1, employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ company: 1, date: 1 });
attendanceSchema.index({ company: 1, status: 1 });

// Calculate total hours before save
attendanceSchema.pre('save', function (next) {
  if (this.clockIn && this.clockOut) {
    const diffMs = this.clockOut.getTime() - this.clockIn.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    this.totalWorkMinutes = totalMinutes - this.totalBreakMinutes;
    this.totalHours = parseFloat((this.totalWorkMinutes / 60).toFixed(2));
    // Overtime after 8 hours (480 minutes)
    if (this.totalWorkMinutes > 480) {
      this.overtime = this.totalWorkMinutes - 480;
    }
  }
  next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);