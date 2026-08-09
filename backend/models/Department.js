const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
}, { timestamps: true });

departmentSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
