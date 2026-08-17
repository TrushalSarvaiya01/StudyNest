const express = require('express');
const multer = require('multer');
const streamifier = require('streamifier');
const cloudinary = require('../config/cloudinary');
const authenticateToken = require('../middleware/auth');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const Document = require('../models/Document');
const Department = require('../models/Department');
const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');
const { parsePagination, parseSort, buildMeta } = require('../utils/queryHelpers');

const router = express.Router();

const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — matches Cloudinary plan limit
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Word (.doc, .docx), JPG, PNG'));
    }
  },
});

const DOCUMENT_SORT_OPTIONS = {
  newest: { uploadDate: -1 },
  oldest: { uploadDate: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

function normalizeDownloadFileName(originalName, title, format = 'pdf') {
  const ext = format || 'pdf';
  const base = String(originalName || title || 'document')
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${base || 'document'}.${ext}`;
}

function normalizeSemesterName(value) {
  return String(value || '').trim().toLowerCase();
}

async function semesterAlreadyExists({ name, departmentId, excludeId = null }) {
  const normalizedName = normalizeSemesterName(name);
  const query = {
    normalizedName,
    departmentId,
  };

  if (excludeId) {
    query._id = { $ne: excludeId };
  }

  return Semester.exists(query);
}

router.post('/admin/init', async (req, res) => {
  try {
    const existing = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
      await Admin.create({ username: process.env.ADMIN_USERNAME || 'admin', password: hashedPassword });
    }
    res.json({ message: 'Admin initialized' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to initialize admin' });
  }
});

router.use(authenticateToken);

// Departments
router.post('/admin/department', async (req, res) => {
  try {
    const department = new Department({ name: req.body.name });
    await department.save();
    res.status(201).json(department);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Department already exists' });
    res.status(500).json({ message: 'Failed to create department' });
  }
});

router.get('/admin/departments', async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch departments' });
  }
});

router.put('/admin/department/:id', async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true, runValidators: true });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    res.json(department);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Department already exists' });
    res.status(500).json({ message: 'Failed to update department' });
  }
});

router.delete('/admin/department/:id', async (req, res) => {
  try {
    const deptId = req.params.id;
    const semesterCount = await Semester.countDocuments({ departmentId: deptId });
    const subjectCount = await Subject.countDocuments({ departmentId: deptId });
    const documentCount = await Document.countDocuments({ departmentId: deptId });

    if (semesterCount > 0 || subjectCount > 0 || documentCount > 0) {
      return res.status(400).json({ message: 'Delete semesters, subjects and documents for this department first' });
    }

    await Department.findByIdAndDelete(deptId);
    res.json({ message: 'Department deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete department' });
  }
});

router.post('/admin/semester', async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    if (!departmentId) return res.status(400).json({ message: 'departmentId is required' });
    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    const normalizedName = normalizeSemesterName(name);

    if (await semesterAlreadyExists({ name: normalizedName, departmentId })) {
      return res.status(409).json({ message: 'Semester already exists in this department' });
    }

    const semester = new Semester({ name, normalizedName, departmentId });
    await semester.save();
    res.status(201).json(semester);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Semester already exists in this department' });
    res.status(500).json({ message: 'Failed to create semester' });
  }
});

router.post('/admin/subject', async (req, res) => {
  try {
    const { name, semesterId, departmentId } = req.body;
    if (!semesterId || !departmentId) return res.status(400).json({ message: 'semesterId and departmentId are required' });
    const sem = await Semester.findById(semesterId);
    if (!sem) return res.status(404).json({ message: 'Semester not found' });

    const subject = new Subject({ name, semesterId, departmentId });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Subject already exists for this semester' });
    res.status(500).json({ message: 'Failed to create subject' });
  }
});

router.post('/admin/document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const rawExt = (req.file.originalname.split('.').pop() || 'pdf').toLowerCase();
    const fileFormat = ALLOWED_EXTENSIONS.has(rawExt) ? rawExt : 'pdf';
    const isImage = ['jpg', 'jpeg', 'png'].includes(fileFormat);
    const resourceType = isImage ? 'image' : 'raw';

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'study-portal', resource_type: resourceType },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          const isTooLarge = error.http_code === 400 && /file size too large/i.test(error.message || '');
          const message = isTooLarge
            ? `File is too large (${(req.file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 10MB.`
            : `Cloudinary upload failed: ${error.message || 'Unknown error'}`;
          return res.status(isTooLarge ? 400 : 500).json({ message, reason: error.message });
        }

        const { departmentId, semesterId, subjectId } = req.body;
        if (!departmentId || !semesterId || !subjectId) {
          return res.status(400).json({ message: 'departmentId, semesterId and subjectId are required' });
        }

        const fileName = normalizeDownloadFileName(req.file.originalname, req.body.title, fileFormat);

        const document = new Document({
          title: req.body.title,
          type: req.body.type,
          departmentId,
          semesterId,
          subjectId,
          fileFormat,
          fileSize: req.file.size || 0,
          originalFileName: fileName,
          cloudinaryUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
        });

        await document.save();
        res.status(201).json(document);
      }
    );

    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Document upload failed' });
  }
});

router.get('/admin/documents', async (req, res) => {
  try {
    const { page, limit, skip } = parsePagination(req, 20);
    const { sort } = parseSort(req, DOCUMENT_SORT_OPTIONS, 'newest');

    const filter = {};
    if (req.query.departmentId) filter.departmentId = req.query.departmentId;
    if (req.query.semesterId) filter.semesterId = req.query.semesterId;
    if (req.query.subjectId) filter.subjectId = req.query.subjectId;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.q) filter.title = { $regex: String(req.query.q).trim(), $options: 'i' };

    const [documents, total] = await Promise.all([
      Document.find(filter)
        .populate('subjectId')
        .populate('semesterId')
        .populate('departmentId')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Document.countDocuments(filter),
    ]);

    res.json({ documents, ...buildMeta({ total, page, limit }) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
});

router.put('/admin/document/:id', async (req, res) => {
  try {
    const document = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update document' });
  }
});

router.put('/admin/semester/:id', async (req, res) => {
  try {
    const existingSemester = await Semester.findById(req.params.id);
    if (!existingSemester) return res.status(404).json({ message: 'Semester not found' });

    const nextName = String(req.body.name || '').trim();
    const nextDepartmentId = req.body.departmentId;
    const nextNormalizedName = normalizeSemesterName(nextName);

    if (await semesterAlreadyExists({ name: nextNormalizedName, departmentId: nextDepartmentId, excludeId: req.params.id })) {
      return res.status(409).json({ message: 'Semester already exists in this department' });
    }

    const semester = await Semester.findByIdAndUpdate(
      req.params.id,
      { name: nextName, normalizedName: nextNormalizedName, departmentId: nextDepartmentId },
      { new: true, runValidators: true }
    );

    if (!semester) return res.status(404).json({ message: 'Semester not found' });
    res.json(semester);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Semester already exists in this department' });
    }
    res.status(500).json({ message: 'Failed to update semester' });
  }
});

router.delete('/admin/semester/:id', async (req, res) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) return res.status(404).json({ message: 'Semester not found' });

    const subjectCount = await Subject.countDocuments({ semesterId: req.params.id });
    const documentCount = await Document.countDocuments({ semesterId: req.params.id });

    if (subjectCount > 0 || documentCount > 0) {
      return res.status(400).json({ message: 'Delete subjects and documents for this semester first' });
    }

    await Semester.findByIdAndDelete(req.params.id);
    res.json({ message: 'Semester deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete semester' });
  }
});

router.put('/admin/subject/:id', async (req, res) => {
  try {
    const subject = await Subject.findByIdAndUpdate(
      req.params.id,
      { name: req.body.name, semesterId: req.body.semesterId, departmentId: req.body.departmentId },
      { new: true, runValidators: true }
    );

    if (!subject) return res.status(404).json({ message: 'Subject not found' });
    res.json(subject);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Subject already exists for this semester' });
    }
    res.status(500).json({ message: 'Failed to update subject' });
  }
});

router.delete('/admin/subject/:id', async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Subject not found' });

    const documentCount = await Document.countDocuments({ subjectId: req.params.id });
    if (documentCount > 0) {
      return res.status(400).json({ message: 'Delete documents for this subject first' });
    }

    await Subject.findByIdAndDelete(req.params.id);
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete subject' });
  }
});

router.delete('/admin/document/:id', async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });

    if (document.cloudinaryPublicId) {
      const isImage = ['jpg', 'jpeg', 'png'].includes(document.fileFormat);
      try {
        await cloudinary.uploader.destroy(document.cloudinaryPublicId, { resource_type: isImage ? 'image' : 'raw' });
      } catch (cloudErr) {
        console.warn('Cloudinary destroy error (continuing with DB deletion):', cloudErr);
      }
    }

    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document' });
  }
});

router.get('/admin/stats', async (req, res) => {
  try {
    const [departmentCount, semesterCount, subjectCount, documentCount] = await Promise.all([
      Department.countDocuments(),
      Semester.countDocuments(),
      Subject.countDocuments(),
      Document.countDocuments(),
    ]);
    res.json({ departmentCount, semesterCount, subjectCount, documentCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch admin stats' });
  }
});

router.get('/admin/recent-documents', async (req, res) => {
  try {
    const documents = await Document.find()
      .populate('departmentId')
      .populate('semesterId')
      .populate('subjectId')
      .sort({ uploadDate: -1 })
      .limit(8)
      .lean();

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch recent uploads' });
  }
});

module.exports = router;