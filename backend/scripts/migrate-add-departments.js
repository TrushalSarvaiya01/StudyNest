const connectDB = require('../config/db');
const mongoose = require('mongoose');
const Department = require('../models/Department');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Document = require('../models/Document');

async function run() {
  try {
    await connectDB();

    const departmentCount = await Department.countDocuments();
    if (!departmentCount) {
      console.log('No departments found. Manual admin setup is required; no default data was created.');
      process.exit(0);
      return;
    }

    const dept = await Department.findOne().sort({ createdAt: 1 });

    // Assign missing departmentId on semesters
    const semRes = await Semester.updateMany(
      { departmentId: { $exists: false } },
      { $set: { departmentId: dept._id } }
    );
    console.log('Updated semesters:', semRes.nModified || semRes.modifiedCount || semRes.n);

    // Assign missing departmentId on subjects
    const subRes = await Subject.updateMany(
      { departmentId: { $exists: false } },
      { $set: { departmentId: dept._id } }
    );
    console.log('Updated subjects:', subRes.nModified || subRes.modifiedCount || subRes.n);

    // Assign missing departmentId on documents
    const docRes = await Document.updateMany(
      { departmentId: { $exists: false } },
      { $set: { departmentId: dept._id } }
    );
    console.log('Updated documents:', docRes.nModified || docRes.modifiedCount || docRes.n);

    console.log('Migration complete. Review and adjust departments as needed.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed', err);
    process.exit(1);
  }
}

run();
