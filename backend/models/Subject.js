const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
}, { timestamps: true });

// Unique subject name per semester (and department for extra safety)
subjectSchema.index({ name: 1, semesterId: 1, departmentId: 1 }, { unique: true });

module.exports = mongoose.model('Subject', subjectSchema);
