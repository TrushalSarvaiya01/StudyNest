const mongoose = require('mongoose');

function normalizeSemesterName(value) {
  return String(value || '').trim().toLowerCase();
}

const semesterSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  normalizedName: { type: String, required: true, trim: true, lowercase: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
}, { timestamps: true });

// Unique semester name per department, normalized to avoid case/spacing-only drift
semesterSchema.index({ departmentId: 1, normalizedName: 1 }, { unique: true });

semesterSchema.pre('validate', function preValidate(next) {
  if (!this.normalizedName && this.name) {
    this.normalizedName = normalizeSemesterName(this.name);
  }

  this.normalizedName = normalizeSemesterName(this.normalizedName || this.name);
  next();
});

module.exports = mongoose.model('Semester', semesterSchema);
