const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  semesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Semester', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  originalFileName: { type: String, trim: true },
  fileFormat: { type: String, trim: true, lowercase: true, default: 'pdf' },
  fileSize: { type: Number, default: 0 },
  cloudinaryUrl: { type: String, required: true },
  cloudinaryPublicId: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now },
}, { timestamps: true });

// Speeds up the common list queries: documents for a subject sorted by
// date, documents for a department/semester filtered by type, admin list
// filtering/sorting, and compound search/filter queries.
documentSchema.index({ subjectId: 1, uploadDate: -1 });
documentSchema.index({ subjectId: 1, type: 1, uploadDate: -1 });
documentSchema.index({ departmentId: 1, uploadDate: -1 });
documentSchema.index({ departmentId: 1, type: 1, uploadDate: -1 });
documentSchema.index({ semesterId: 1, uploadDate: -1 });
documentSchema.index({ semesterId: 1, type: 1, uploadDate: -1 });
documentSchema.index({ type: 1 });
documentSchema.index({ title: 1 });
documentSchema.index({ title: 'text' });
documentSchema.index({ uploadDate: -1 });

module.exports = mongoose.model('Document', documentSchema);

