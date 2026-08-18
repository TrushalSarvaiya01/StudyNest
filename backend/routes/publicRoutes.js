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
const {
  parsePagination,
  parseSort,
  buildMeta,
} = require('../utils/queryHelpers');

const router = express.Router();

const DOCUMENT_SORT_OPTIONS = {
  newest: { uploadDate: -1 },
  oldest: { uploadDate: 1 },
  title_asc: { title: 1 },
  title_desc: { title: -1 },
};

/*
 * ============================================================
 * MIME TYPES
 * ============================================================
 *
 * These MIME types are used when sending the original file
 * to the user's browser.
 *
 * DOCX -> DOCX
 * DOC  -> DOC
 * PDF  -> PDF
 */
const MIME_TYPES = {
  pdf: 'application/pdf',

  docx:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  doc: 'application/msword',

  jpg: 'image/jpeg',

  jpeg: 'image/jpeg',

  png: 'image/png',
};

/*
 * ============================================================
 * OBJECT ID VALIDATION
 * ============================================================
 */

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/*
 * ============================================================
 * FILE EXTENSION HELPER
 * ============================================================
 *
 * Gets the extension from the ORIGINAL filename.
 *
 * Example:
 *
 * notes.docx -> docx
 * assignment.pdf -> pdf
 * file.doc -> doc
 */
function getFileExtension(
  filename = '',
  defaultExt = ''
) {
  const cleanName = String(filename || '').trim();

  if (!cleanName || !cleanName.includes('.')) {
    return defaultExt;
  }

  const extension = cleanName
    .split('.')
    .pop()
    .toLowerCase();

  return extension || defaultExt;
}

/*
 * ============================================================
 * DOWNLOAD FILE NAME
 * ============================================================
 *
 * IMPORTANT:
 *
 * The original filename is given priority.
 *
 * If MongoDB contains:
 *
 * originalFileName: "notes.docx"
 * fileFormat: "pdf"
 *
 * this function still returns:
 *
 * notes.docx
 *
 * This protects old records where fileFormat may have
 * incorrectly been saved as PDF.
 */
function normalizeDownloadFileName(
  originalName,
  title,
  format = 'pdf'
) {
  /*
   * First try to detect the extension from the original
   * uploaded filename.
   */
  const originalExt = getFileExtension(
    originalName,
    ''
  );

  /*
   * If the original extension is a supported MIME type,
   * use it.
   *
   * Otherwise use fileFormat from MongoDB.
   */
  const ext = MIME_TYPES[originalExt]
    ? originalExt
    : String(format || 'pdf').toLowerCase();

  /*
   * Remove the existing extension from the base filename.
   */
  const base = String(
    originalName || title || 'document'
  )
    .trim()
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_');

  /*
   * Return filename with the CORRECT original extension.
   */
  return `${base || 'document'}.${ext}`;
}

/*
 * ============================================================
 * FILE STREAM / DOWNLOAD
 * ============================================================
 *
 * This function downloads the original file from Cloudinary.
 *
 * IMPORTANT:
 *
 * There is NO conversion here.
 *
 * DOCX remains DOCX.
 * DOC remains DOC.
 * PDF remains PDF.
 */
function streamFile(
  url,
  res,
  fileName,
  format = 'pdf',
  depth = 0
) {
  /*
   * Protect against endless redirects.
   */
  if (depth > 4) {
    res.status(502).json({
      message:
        'Too many redirects while fetching file',
    });

    return;
  }

  https
    .get(url, (streamRes) => {
      const redirectCodes = [
        301,
        302,
        303,
        307,
        308,
      ];

      /*
       * Handle Cloudinary redirects.
       */
      if (
        redirectCodes.includes(
          streamRes.statusCode
        ) &&
        streamRes.headers.location
      ) {
        /*
         * Close the current response stream before
         * following the redirect.
         */
        streamRes.resume();

        streamFile(
          streamRes.headers.location,
          res,
          fileName,
          format,
          depth + 1
        );

        return;
      }

      /*
       * Cloudinary/source server must return 200.
       */
      if (streamRes.statusCode !== 200) {
        streamRes.resume();

        if (!res.headersSent) {
          res.status(502).json({
            message:
              'Failed to fetch source file from cloud storage',
          });
        }

        return;
      }

      /*
       * Normalize format.
       */
      const normalizedFormat = String(
        format || ''
      ).toLowerCase();

      /*
       * IMPORTANT:
       *
       * Content-Type is based on the ORIGINAL file format.
       *
       * DOCX:
       * application/vnd.openxmlformats-officedocument.wordprocessingml.document
       *
       * PDF:
       * application/pdf
       */
      const contentType =
        MIME_TYPES[normalizedFormat] ||
        streamRes.headers['content-type'] ||
        'application/octet-stream';

      /*
       * Tell the browser exactly what type of file
       * it is receiving.
       */
      res.setHeader(
        'Content-Type',
        contentType
      );

      /*
       * Force download instead of allowing the browser
       * to interpret/convert the document.
       */
      const safeFileName = String(fileName)
        .replace(/["\\]/g, '_');

      /*
       * Standard filename.
       */
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${safeFileName}"`
      );

      /*
       * Prevent browser MIME sniffing.
       */
      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      /*
       * Preserve content length when Cloudinary provides it.
       */
      if (streamRes.headers['content-length']) {
        res.setHeader(
          'Content-Length',
          streamRes.headers['content-length']
        );
      }

      /*
       * Pipe the ORIGINAL file directly to the user.
       */
      streamRes.pipe(res);
    })
    .on('error', (error) => {
      console.error(
        'File download error:',
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          message: 'Download failed',
        });
      }
    });
}

/*
 * ============================================================
 * SEMESTERS
 * ============================================================
 */

router.get(
  '/semesters',
  async (req, res) => {
    try {
      const semesters =
        await Semester.find()
          .sort({
            createdAt: 1,
          })
          .lean();

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json(semesters);
    } catch (error) {
      console.error(
        'Fetch semesters error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch semesters',
      });
    }
  }
);

/*
 * ============================================================
 * DEPARTMENTS
 * ============================================================
 */

router.get(
  '/departments',
  async (req, res) => {
    try {
      const departments =
        await Department.find()
          .sort({
            name: 1,
          })
          .lean();

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json(departments);
    } catch (error) {
      console.error(
        'Fetch departments error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch departments',
      });
    }
  }
);

router.get(
  '/departments/:id',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Department not found',
        });
      }

      const department =
        await Department.findById(
          req.params.id
        ).lean();

      if (!department) {
        return res.status(404).json({
          message:
            'Department not found',
        });
      }

      /*
       * Embed semesters directly so DepartmentPage
       * can make a single request.
       */
      const semesters =
        await getSemestersWithCounts(
          req.params.id
        );

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json({
        ...department,
        semesters,
      });
    } catch (error) {
      console.error(
        'Fetch department error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch department',
      });
    }
  }
);

/*
 * ============================================================
 * SEMESTERS WITH COUNTS
 * ============================================================
 */

async function getSemestersWithCounts(
  departmentId
) {
  const departmentObjectId =
    new mongoose.Types.ObjectId(
      departmentId
    );

  const semesters =
    await Semester.find({
      departmentId,
    })
      .sort({
        createdAt: 1,
      })
      .lean();

  const semesterIds =
    semesters.map(
      (semester) => semester._id
    );

  const [
    subjectCounts,
    pdfCounts,
  ] = await Promise.all([
    Subject.aggregate([
      {
        $match: {
          departmentId:
            departmentObjectId,

          semesterId: {
            $in: semesterIds,
          },
        },
      },

      {
        $group: {
          _id: '$semesterId',

          totalSubjects: {
            $sum: 1,
          },
        },
      },
    ]),

    Document.aggregate([
      {
        $match: {
          departmentId:
            departmentObjectId,

          semesterId: {
            $in: semesterIds,
          },
        },
      },

      {
        $group: {
          _id: '$semesterId',

          totalPdfs: {
            $sum: 1,
          },
        },
      },
    ]),
  ]);

  const subjectCountMap =
    new Map(
      subjectCounts.map(
        (item) => [
          String(item._id),
          item.totalSubjects,
        ]
      )
    );

  const pdfCountMap =
    new Map(
      pdfCounts.map(
        (item) => [
          String(item._id),
          item.totalPdfs,
        ]
      )
    );

  return semesters.map(
    (semester) => ({
      ...semester,

      totalSubjects:
        subjectCountMap.get(
          String(semester._id)
        ) || 0,

      totalPdfs:
        pdfCountMap.get(
          String(semester._id)
        ) || 0,
    })
  );
}

/*
 * ============================================================
 * SUBJECTS WITH COUNTS
 * ============================================================
 */

async function getSubjectsWithCounts(
  semesterId
) {
  const subjects =
    await Subject.find({
      semesterId,
    })
      .sort({
        name: 1,
      })
      .lean();

  const subjectIds =
    subjects.map(
      (subject) => subject._id
    );

  const counts =
    await Document.aggregate([
      {
        $match: {
          subjectId: {
            $in: subjectIds,
          },
        },
      },

      {
        $group: {
          _id: '$subjectId',

          totalPdfs: {
            $sum: 1,
          },
        },
      },
    ]);

  const countMap =
    new Map(
      counts.map(
        (item) => [
          String(item._id),
          item.totalPdfs,
        ]
      )
    );

  return subjects.map(
    (subject) => ({
      ...subject,

      totalPdfs:
        countMap.get(
          String(subject._id)
        ) || 0,
    })
  );
}

/*
 * ============================================================
 * DEPARTMENT SEMESTERS
 * ============================================================
 */

router.get(
  '/departments/:id/semesters',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Department not found',
        });
      }

      const semesters =
        await getSemestersWithCounts(
          req.params.id
        );

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json(semesters);
    } catch (error) {
      console.error(
        'Fetch department semesters error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch semesters for department',
      });
    }
  }
);

/*
 * ============================================================
 * SEMESTER
 * ============================================================
 */

router.get(
  '/semesters/:id',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Semester not found',
        });
      }

      const semester =
        await Semester.findById(
          req.params.id
        )
          .populate(
            'departmentId'
          )
          .lean();

      if (!semester) {
        return res.status(404).json({
          message:
            'Semester not found',
        });
      }

      const subjects =
        await getSubjectsWithCounts(
          req.params.id
        );

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json({
        ...semester,
        subjects,
      });
    } catch (error) {
      console.error(
        'Fetch semester error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch semester',
      });
    }
  }
);

/*
 * ============================================================
 * SEMESTER SUBJECTS
 * ============================================================
 */

router.get(
  '/semesters/:id/subjects',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Semester not found',
        });
      }

      const semester =
        await Semester.findById(
          req.params.id
        ).lean();

      if (!semester) {
        return res.status(404).json({
          message:
            'Semester not found',
        });
      }

      const subjects =
        await getSubjectsWithCounts(
          req.params.id
        );

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json(subjects);
    } catch (error) {
      console.error(
        'Fetch subjects error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch subjects',
      });
    }
  }
);

/*
 * ============================================================
 * SUBJECT DOCUMENTS
 * ============================================================
 */

router.get(
  '/subjects/:id/documents',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Subject not found',
        });
      }

      const subject =
        await Subject.findById(
          req.params.id
        ).lean();

      if (!subject) {
        return res.status(404).json({
          message:
            'Subject not found',
        });
      }

      const {
        page,
        limit,
        skip,
      } = parsePagination(req);

      const { sort } =
        parseSort(
          req,
          DOCUMENT_SORT_OPTIONS,
          'newest'
        );

      const filter = {
        subjectId:
          req.params.id,
      };

      if (req.query.type) {
        filter.type =
          req.query.type;
      }

      const [
        documents,
        total,
      ] = await Promise.all([
        Document.find(filter)
          .populate(
            'departmentId'
          )
          .populate(
            'subjectId'
          )
          .populate(
            'semesterId'
          )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        Document.countDocuments(
          filter
        ),
      ]);

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json({
        documents,

        ...buildMeta({
          total,
          page,
          limit,
        }),
      });
    } catch (error) {
      console.error(
        'Fetch subject documents error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch documents',
      });
    }
  }
);

/*
 * ============================================================
 * SUBJECT
 * ============================================================
 */

router.get(
  '/subjects/:id',
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Subject not found',
        });
      }

      const subject =
        await Subject.findById(
          req.params.id
        )
          .populate(
            'semesterId'
          )
          .populate(
            'departmentId'
          )
          .lean();

      if (!subject) {
        return res.status(404).json({
          message:
            'Subject not found',
        });
      }

      const totalPdfs =
        await Document.countDocuments({
          subjectId:
            req.params.id,
        });

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json({
        ...subject,
        totalPdfs,
      });
    } catch (error) {
      console.error(
        'Fetch subject error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch subject',
      });
    }
  }
);

/*
 * ============================================================
 * DEPARTMENT COUNT HELPER
 * ============================================================
 */

function countByDepartment(Model) {
  return Model.aggregate([
    {
      $group: {
        _id: '$departmentId',

        count: {
          $sum: 1,
        },
      },
    },
  ]).then((rows) => {
    const map = new Map();

    let total = 0;

    rows.forEach((row) => {
      map.set(
        String(row._id),
        row.count
      );

      total += row.count;
    });

    return {
      map,
      total,
    };
  });
}

/*
 * ============================================================
 * OVERVIEW
 * ============================================================
 */

router.get(
  '/overview',
  async (req, res) => {
    try {
      const [
        departments,
        semesterStats,
        subjectStats,
        documentStats,
        recentDocuments,
      ] = await Promise.all([
        Department.find()
          .sort({
            name: 1,
          })
          .lean(),

        countByDepartment(
          Semester
        ),

        countByDepartment(
          Subject
        ),

        countByDepartment(
          Document
        ),

        Document.find()
          .populate(
            'departmentId'
          )
          .populate(
            'semesterId'
          )
          .populate(
            'subjectId'
          )
          .sort({
            uploadDate: -1,
          })
          .limit(10)
          .lean(),
      ]);

      const departmentsWithStats =
        departments.map(
          (dept) => {
            const key =
              String(dept._id);

            return {
              ...dept,

              totalSemesters:
                semesterStats.map.get(
                  key
                ) || 0,

              totalSubjects:
                subjectStats.map.get(
                  key
                ) || 0,

              totalPdfs:
                documentStats.map.get(
                  key
                ) || 0,
            };
          }
        );

      res.set(
        'Cache-Control',
        'public, max-age=30'
      );

      res.json({
        totals: {
          departmentCount:
            departments.length,

          semesterCount:
            semesterStats.total,

          subjectCount:
            subjectStats.total,

          documentCount:
            documentStats.total,
        },

        departments:
          departmentsWithStats,

        recentDocuments,
      });
    } catch (error) {
      console.error(
        'Overview error:',
        error
      );

      res.status(500).json({
        message:
          'Failed to fetch overview',
      });
    }
  }
);

/*
 * ============================================================
 * ADMIN LOGIN
 * ============================================================
 */

router.post(
  '/admin/login',
  async (req, res) => {
    const {
      username,
      password,
    } = req.body;

    try {
      const admin =
        await Admin.findOne({
          username,
        });

      if (!admin) {
        return res.status(401).json({
          message:
            'Invalid credentials',
        });
      }

      const isMatch =
        await bcrypt.compare(
          password,
          admin.password
        );

      if (!isMatch) {
        return res.status(401).json({
          message:
            'Invalid credentials',
        });
      }

      const token = jwt.sign(
        {
          id: admin._id,
          username:
            admin.username,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '8h',
        }
      );

      res.json({
        token,
        username:
          admin.username,
      });
    } catch (error) {
      console.error(
        'Admin login error:',
        error
      );

      res.status(500).json({
        message: 'Login failed',
      });
    }
  }
);

/*
 * ============================================================
 * SEARCH
 * ============================================================
 */

router.get(
  '/search',
  async (req, res) => {
    const { q } = req.query;

    try {
      const search = String(
        q || ''
      ).trim();

      if (!search) {
        return res.json({
          documents: [],
          total: 0,
          page: 1,
          limit: 0,
          totalPages: 1,
        });
      }

      const {
        page,
        limit,
        skip,
      } = parsePagination(
        req,
        20
      );

      const { sort } =
        parseSort(
          req,
          DOCUMENT_SORT_OPTIONS,
          'newest'
        );

      /*
       * Escape regex special characters.
       */
      const escaped =
        search.replace(
          /[.*+?^${}()|[\]\\]/g,
          '\\$&'
        );

      const searchRegex =
        new RegExp(
          escaped,
          'i'
        );

      /*
       * Search parent collections.
       */
      const [
        matchingDepts,
        matchingSems,
        matchingSubs,
      ] = await Promise.all([
        Department.find({
          name: searchRegex,
        })
          .select('_id')
          .lean(),

        Semester.find({
          name: searchRegex,
        })
          .select('_id')
          .lean(),

        Subject.find({
          name: searchRegex,
        })
          .select('_id')
          .lean(),
      ]);

      const orConditions = [
        {
          title: searchRegex,
        },

        {
          originalFileName:
            searchRegex,
        },

        {
          type: searchRegex,
        },
      ];

      if (
        matchingDepts.length >
        0
      ) {
        orConditions.push({
          departmentId: {
            $in:
              matchingDepts.map(
                (d) => d._id
              ),
          },
        });
      }

      if (
        matchingSems.length >
        0
      ) {
        orConditions.push({
          semesterId: {
            $in:
              matchingSems.map(
                (s) => s._id
              ),
          },
        });
      }

      if (
        matchingSubs.length >
        0
      ) {
        orConditions.push({
          subjectId: {
            $in:
              matchingSubs.map(
                (s) => s._id
              ),
          },
        });
      }

      const filter = {
        $or: orConditions,
      };

      if (req.query.type) {
        filter.type =
          req.query.type;
      }

      const [
        documents,
        total,
      ] = await Promise.all([
        Document.find(filter)
          .populate(
            'departmentId'
          )
          .populate(
            'subjectId'
          )
          .populate(
            'semesterId'
          )
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),

        Document.countDocuments(
          filter
        ),
      ]);

      res.json({
        documents,

        ...buildMeta({
          total,
          page,
          limit,
        }),
      });
    } catch (error) {
      console.error(
        'Search query error:',
        error
      );

      res.status(500).json({
        message: 'Search failed',
      });
    }
  }
);

/*
 * ============================================================
 * DOCUMENT DOWNLOAD
 * ============================================================
 *
 * THIS IS THE MAIN FIX.
 *
 * Example:
 *
 * MongoDB:
 *
 * originalFileName = "Operating_System.docx"
 * fileFormat = "pdf"   <-- even if old/wrong
 *
 * We detect:
 *
 * originalFileName -> .docx
 *
 * Therefore:
 *
 * Content-Type = DOCX MIME
 * Download name = Operating_System.docx
 *
 * No PDF conversion happens.
 */

router.get(
  '/documents/:id/download',
  async (req, res) => {
    try {
      /*
       * Validate document ID.
       */
      if (
        !isValidObjectId(
          req.params.id
        )
      ) {
        return res.status(404).json({
          message:
            'Document not found',
        });
      }

      /*
       * Get document from MongoDB.
       */
      const document =
        await Document.findById(
          req.params.id
        ).lean();

      if (!document) {
        return res.status(404).json({
          message:
            'Document not found',
        });
      }

      /*
       * ======================================================
       * DETECT ACTUAL FILE FORMAT
       * ======================================================
       *
       * FIRST:
       * Use originalFileName.
       *
       * SECOND:
       * Fall back to fileFormat.
       *
       * This is important for older documents.
       */
      const originalExt =
        getFileExtension(
          document.originalFileName,
          ''
        );

      let format;

      if (
        originalExt &&
        MIME_TYPES[originalExt]
      ) {
        /*
         * Original filename has a valid extension.
         *
         * Example:
         * notes.docx -> docx
         */
        format =
          originalExt;
      } else {
        /*
         * Fallback for records without a valid
         * original filename.
         */
        format = String(
          document.fileFormat ||
            'pdf'
        ).toLowerCase();
      }

      /*
       * Create the final download filename.
       */
      const fileName =
        normalizeDownloadFileName(
          document.originalFileName,
          document.title,
          format
        );

      /*
       * Debug information.
       *
       * You will see this in the backend console.
       */
      console.log(
        'Document download:',
        {
          id: String(
            document._id
          ),

          originalFileName:
            document.originalFileName,

          storedFileFormat:
            document.fileFormat,

          detectedFormat:
            format,

          downloadFileName:
            fileName,

          cloudinaryUrl:
            document.cloudinaryUrl,
        }
      );

      /*
       * Stream the ORIGINAL file.
       */
      streamFile(
        document.cloudinaryUrl,
        res,
        fileName,
        format
      );
    } catch (error) {
      console.error(
        'Download failed:',
        error
      );

      if (!res.headersSent) {
        res.status(500).json({
          message:
            'Download failed',
        });
      }
    }
  }
);

module.exports = router;