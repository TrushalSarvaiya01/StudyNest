const express = require('express');
const https = require('https');
const mongoose = require('mongoose');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Document = require('../models/Document');
const Department = require('../models/Department');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { parsePagination, parseSort, buildMeta } = require('../utils/queryHelpers');

const router = express.Router();

const DOCUMENT_SORT_OPTIONS = {
  newest: { uploadDate: -1 },
  oldest: { uploadDate: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function normalizePdfFileName(name = 'document.pdf') {
  const trimmed = String(name).trim() || 'document.pdf';
  const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return sanitized.toLowerCase().endsWith('.pdf') ? sanitized : `${sanitized}.pdf`;
}

function streamPdf(url, res, fileName, depth = 0) {
  if (depth > 4) {
    res.status(502).json({ message: 'Too many redirects while fetching PDF' });
    return;
  }

  https.get(url, (streamRes) => {
    const redirectCodes = [301, 302, 303, 307, 308];
    if (redirectCodes.includes(streamRes.statusCode) && streamRes.headers.location) {
      streamPdf(streamRes.headers.location, res, fileName, depth + 1);
      return;
    }

    if (streamRes.statusCode !== 200) {
      res.status(502).json({ message: 'Failed to fetch source PDF from cloud storage' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    streamRes.pipe(res);
  }).on('error', () => {
    res.status(500).json({ message: 'Download failed' });
  });
}

router.get('/semesters', async (req, res) => {
  try {
    const semesters = await Semester.find().sort({ createdAt: 1 });
    res.set('Cache-Control', 'public, max-age=30');
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch semesters' });
  }
});

// Departments listing
router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    res.set('Cache-Control', 'public, max-age=30');
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

router.get('/departments/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Department not found' });

    const department = await Department.findById(req.params.id).lean();
    if (!department) return res.status(404).json({ message: 'Department not found' });

    // Embed semesters directly so DepartmentPage can make a single request
    // instead of two (GET /departments/:id + GET /departments/:id/semesters).
    const semesters = await getSemestersWithCounts(req.params.id);

    res.set('Cache-Control', 'public, max-age=30');
    res.json({ ...department, semesters });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch department' });
  }
});

// Shared helper: semesters for a department, each annotated with
// totalSubjects/totalPdfs. Used by both the standalone
// /departments/:id/semesters endpoint (kept for backward compatibility)
// and the merged /departments/:id response below.
async function getSemestersWithCounts(departmentId) {
  const departmentObjectId = new mongoose.Types.ObjectId(departmentId);
  const semesters = await Semester.find({ departmentId }).sort({ createdAt: 1 }).lean();
  const semesterIds = semesters.map((semester) => semester._id);

  const [subjectCounts, pdfCounts] = await Promise.all([
    Subject.aggregate([
      { $match: { departmentId: departmentObjectId, semesterId: { $in: semesterIds } } },
      { $group: { _id: '$semesterId', totalSubjects: { $sum: 1 } } },
    ]),
    Document.aggregate([
      { $match: { departmentId: departmentObjectId, semesterId: { $in: semesterIds } } },
      { $group: { _id: '$semesterId', totalPdfs: { $sum: 1 } } },
    ]),
  ]);

  const subjectCountMap = new Map(subjectCounts.map((item) => [String(item._id), item.totalSubjects]));
  const pdfCountMap = new Map(pdfCounts.map((item) => [String(item._id), item.totalPdfs]));

  return semesters.map((semester) => ({
    ...semester,
    totalSubjects: subjectCountMap.get(String(semester._id)) || 0,
    totalPdfs: pdfCountMap.get(String(semester._id)) || 0,
  }));
}

// Shared helper: subjects for a semester, each annotated with totalPdfs.
// Used by both the standalone /semesters/:id/subjects endpoint (kept for
// backward compatibility) and the merged /semesters/:id response below.
async function getSubjectsWithCounts(semesterId) {
  const subjects = await Subject.find({ semesterId }).sort({ name: 1 }).lean();
  const subjectIds = subjects.map((subject) => subject._id);

  const counts = await Document.aggregate([
    { $match: { subjectId: { $in: subjectIds } } },
    { $group: { _id: '$subjectId', totalPdfs: { $sum: 1 } } },
  ]);

  const countMap = new Map(counts.map((item) => [String(item._id), item.totalPdfs]));
  return subjects.map((subject) => ({ ...subject, totalPdfs: countMap.get(String(subject._id)) || 0 }));
}

// Semesters for a department (standalone - kept for backward compatibility;
// DepartmentPage now uses the embedded `semesters` field on /departments/:id
// instead of calling this separately).
router.get('/departments/:id/semesters', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Department not found' });

    const semesters = await getSemestersWithCounts(req.params.id);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(semesters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch semesters for department' });
  }
});

router.get('/semesters/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Semester not found' });

    const semester = await Semester.findById(req.params.id).populate('departmentId').lean();
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    // Embed subjects directly so SemesterPage can make a single request
    // instead of two (GET /semesters/:id + GET /semesters/:id/subjects).
    const subjects = await getSubjectsWithCounts(req.params.id);

    res.set('Cache-Control', 'public, max-age=30');
    res.json({ ...semester, subjects });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch semester' });
  }
});

// Subjects for a semester (standalone - kept for backward compatibility;
// SemesterPage now uses the embedded `subjects` field on /semesters/:id
// instead of calling this separately).
router.get('/semesters/:id/subjects', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Semester not found' });

    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    const subjects = await getSubjectsWithCounts(req.params.id);
    res.set('Cache-Control', 'public, max-age=30');
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subjects' });
  }
});

router.get('/subjects/:id/documents', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Subject not found' });

    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const { page, limit, skip } = parsePagination(req);
    const { sort } = parseSort(req, DOCUMENT_SORT_OPTIONS, 'newest');

    const filter = { subjectId: req.params.id };
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('departmentId')
        .populate('subjectId')
        .populate('semesterId')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Document.countDocuments(filter),
    ]);

    res.set('Cache-Control', 'public, max-age=30');
    res.json({ documents, ...buildMeta({ total, page, limit }) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

router.get('/subjects/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Subject not found' });

    const subject = await Subject.findById(req.params.id).populate('semesterId');
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const totalPdfs = await Document.countDocuments({ subjectId: req.params.id });
    res.set('Cache-Control', 'public, max-age=30');
    res.json({ ...subject.toObject(), totalPdfs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch subject' });
  }
});

// Groups a collection by departmentId and returns { deptIdString -> count }
// via the database instead of pulling every document over the wire.
function countByDepartment(Model) {
  return Model.aggregate([
    { $group: { _id: '$departmentId', count: { $sum: 1 } } },
  ]).then((rows) => {
    const map = new Map();
    let total = 0;
    rows.forEach((row) => {
      map.set(String(row._id), row.count);
      total += row.count;
    });
    return { map, total };
  });
}

router.get('/overview', async (req, res) => {
  try {
    // Every query below is independent, so they all run concurrently in a
    // single Promise.all instead of one-after-another. The three counts are
    // computed in MongoDB with $group (grouped by department), so we never
    // pull the full Subject/Semester/Document collections into Node just to
    // count them in JS - only the small, already-aggregated result comes
    // back over the wire.
    const [departments, semesterStats, subjectStats, documentStats, recentDocuments] = await Promise.all([
      Department.find().sort({ name: 1 }).lean(),
      countByDepartment(Semester),
      countByDepartment(Subject),
      countByDepartment(Document),
      Document.find().populate('departmentId').populate('semesterId').populate('subjectId').sort({ uploadDate: -1 }).limit(10).lean(),
    ]);

    const departmentsWithStats = departments.map((dept) => {
      const key = String(dept._id);
      return {
        ...dept,
        totalSemesters: semesterStats.map.get(key) || 0,
        totalSubjects: subjectStats.map.get(key) || 0,
        totalPdfs: documentStats.map.get(key) || 0,
      };
    });

    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      totals: {
        departmentCount: departments.length,
        semesterCount: semesterStats.total,
        subjectCount: subjectStats.total,
        documentCount: documentStats.total,
      },
      departments: departmentsWithStats,
      recentDocuments,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch overview' });
  }
});

router.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: admin._id, username: admin.username }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, username: admin.username });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const search = (q || '').trim();
    if (!search) return res.json({ documents: [], total: 0, page: 1, limit: 0, totalPages: 1 });

    const { page, limit, skip } = parsePagination(req, 20);
    const { sort } = parseSort(req, DOCUMENT_SORT_OPTIONS, 'newest');

    const lowered = search.toLowerCase();
    const documents = await Document.find()
      .populate('departmentId')
      .populate('subjectId')
      .populate('semesterId')
      .sort(sort);

    let filtered = documents.filter((doc) => {
      const departmentName = String(doc.departmentId?.name || '').toLowerCase();
      const semesterName = String(doc.semesterId?.name || '').toLowerCase();
      const subjectName = String(doc.subjectId?.name || '').toLowerCase();
      const title = String(doc.title || '').toLowerCase();
      const type = String(doc.type || '').toLowerCase();

      return (
        departmentName.includes(lowered) ||
        semesterName.includes(lowered) ||
        subjectName.includes(lowered) ||
        title.includes(lowered) ||
        type.includes(lowered)
      );
    });

    if (req.query.type) {
      filtered = filtered.filter((doc) => doc.type === req.query.type);
    }

    const total = filtered.length;
    const paged = filtered.slice(skip, skip + limit);

    res.json({ documents: paged, ...buildMeta({ total, page, limit }) });
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
});

router.get('/documents/:id/download', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return res.status(404).json({ message: 'Document not found' });

    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const fileName = normalizePdfFileName(document.originalFileName || `${document.title}.pdf`);

    streamPdf(document.cloudinaryUrl, res, fileName);
  } catch (error) {
    res.status(500).json({ message: 'Download failed' });
  }
});

module.exports = router;