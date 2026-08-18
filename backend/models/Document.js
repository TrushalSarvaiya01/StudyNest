const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    /*
     * =========================================================
     * DOCUMENT TITLE
     * =========================================================
     */
    title: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * =========================================================
     * DOCUMENT TYPE
     * =========================================================
     *
     * Example:
     * Assignment
     * Notes
     * Question Paper
     * Study Material
     */
    type: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * =========================================================
     * DEPARTMENT
     * =========================================================
     */
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },

    /*
     * =========================================================
     * SEMESTER
     * =========================================================
     */
    semesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: true,
    },

    /*
     * =========================================================
     * SUBJECT
     * =========================================================
     */
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true,
    },

    /*
     * =========================================================
     * ORIGINAL FILE NAME
     * =========================================================
     *
     * This stores the REAL uploaded filename.
     *
     * Examples:
     *
     * assignment.pdf
     * notes.doc
     * operating-system.docx
     *
     * The extension is preserved.
     */
    originalFileName: {
      type: String,
      trim: true,
    },

    /*
     * =========================================================
     * FILE FORMAT
     * =========================================================
     *
     * IMPORTANT:
     *
     * Do NOT use:
     *
     * default: 'pdf'
     *
     * because that can make DOC/DOCX files appear as PDF.
     *
     * The upload route determines the actual extension and
     * stores it here.
     *
     * Possible values:
     *
     * pdf
     * doc
     * docx
     * jpg
     * jpeg
     * png
     */
    fileFormat: {
      type: String,
      trim: true,
      lowercase: true,
      required: true,
      enum: [
        'pdf',
        'doc',
        'docx',
        'jpg',
        'jpeg',
        'png',
      ],
    },

    /*
     * =========================================================
     * FILE SIZE
     * =========================================================
     *
     * Stored in bytes.
     */
    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
     * =========================================================
     * CLOUDINARY URL
     * =========================================================
     *
     * This points to the ORIGINAL uploaded file.
     */
    cloudinaryUrl: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * =========================================================
     * CLOUDINARY PUBLIC ID
     * =========================================================
     *
     * Used when deleting the file from Cloudinary.
     */
    cloudinaryPublicId: {
      type: String,
      required: true,
      trim: true,
    },

    /*
     * =========================================================
     * UPLOAD DATE
     * =========================================================
     */
    uploadDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    /*
     * Adds:
     *
     * createdAt
     * updatedAt
     */
    timestamps: true,
  }
);

/*
 * =========================================================
 * INDEXES
 * =========================================================
 *
 * These improve document filtering/searching.
 */

/*
 * Find documents by department.
 */
documentSchema.index({
  departmentId: 1,
});

/*
 * Find documents by semester.
 */
documentSchema.index({
  semesterId: 1,
});

/*
 * Find documents by subject.
 */
documentSchema.index({
  subjectId: 1,
});

/*
 * Common filtering combination.
 */
documentSchema.index({
  departmentId: 1,
  semesterId: 1,
  subjectId: 1,
});

/*
 * Newest documents.
 */
documentSchema.index({
  uploadDate: -1,
});

/*
 * Search/filter by document type.
 */
documentSchema.index({
  type: 1,
});

/*
 * =========================================================
 * EXPORT MODEL
 * =========================================================
 */

module.exports = mongoose.model(
  'Document',
  documentSchema
);