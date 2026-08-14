import React, { useEffect, useState } from 'react';
import { CloudUpload, File, FileCode, Image, LoaderCircle } from 'lucide-react';
import api, { formatFileSize } from '../services/api';

const ALLOWED_EXTS = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];
const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

function getFileIcon(ext) {
  switch (ext) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image size={18} />;
    case 'doc':
    case 'docx':
      return <FileCode size={18} />;
    default:
      return <File size={18} />;
  }
}

function AdminUploadPage() {
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    departmentId: '',
    semesterId: '',
    subjectId: '',
    title: '',
    type: 'Assignment',
    file: null,
  });
  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/departments').then((res) => {
      setDepartments(res.data || []);
    });
  }, []);

  // When department changes, load semesters for that department
  const handleDepartmentChange = (deptId) => {
    setForm((prev) => ({ ...prev, departmentId: deptId, semesterId: '', subjectId: '' }));
    setSubjects([]);
    if (deptId) {
      api.get(`/departments/${deptId}/semesters`).then((res) => setSemesters(res.data || []));
    } else {
      setSemesters([]);
    }
  };

  // When semester changes, load subjects for that semester
  const handleSemesterChange = (semId) => {
    setForm((prev) => ({ ...prev, semesterId: semId, subjectId: '' }));
    if (semId) {
      api.get(`/semesters/${semId}/subjects`).then((res) => setSubjects(res.data || []));
    } else {
      setSubjects([]);
    }
  };

  const onFilePick = (file) => {
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      setIsSuccess(false);
      setMessage('Invalid format. Allowed: PDF (.pdf), Word (.doc, .docx), Images (.jpg, .jpeg, .png)');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setIsSuccess(false);
      setMessage(`File exceeds 25MB limit (${formatFileSize(file.size)}). Please choose a smaller file.`);
      return;
    }

    setMessage('');
    setForm((prev) => ({
      ...prev,
      file,
      // Autofill title with cleaned filename if empty
      title: prev.title || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' '),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.file) {
      setIsSuccess(false);
      setMessage('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');
    setIsSuccess(false);

    const data = new FormData();
    data.append('departmentId', form.departmentId);
    data.append('semesterId', form.semesterId);
    data.append('subjectId', form.subjectId);
    data.append('title', form.title);
    data.append('type', form.type);
    data.append('file', form.file);

    try {
      await api.post('/admin/document', data, {
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        },
      });
      setIsSuccess(true);
      setMessage('Document uploaded successfully!');
      setForm({ departmentId: '', semesterId: '', subjectId: '', title: '', type: 'Assignment', file: null });
      setSemesters([]);
      setSubjects([]);
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pickedExt = form.file ? (form.file.name.split('.').pop() || '').toLowerCase() : '';

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Upload Study Document</h1>
        <p className="muted-text">Upload study materials in PDF, Microsoft Word (.doc, .docx), or Image (.jpg, .png) formats.</p>

        <form className="upload-form" onSubmit={handleSubmit}>
          <div className="form-grid two-column">
            <select
              value={form.departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              required
            >
              <option value="">Select department</option>
              {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>

            <select
              value={form.semesterId}
              onChange={(e) => handleSemesterChange(e.target.value)}
              disabled={!form.departmentId}
              required
            >
              <option value="">Select semester</option>
              {semesters.map((semester) => <option key={semester._id} value={semester._id}>{semester.name}</option>)}
            </select>

            <select
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              disabled={!form.semesterId}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
            </select>

            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Document title"
              required
            />

            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="Assignment">Assignment</option>
              <option value="Book">Book</option>
              <option value="Notes">Notes</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {!departments.length && (
            <p className="muted-text">Create a department, semester, and subject in Manage section before uploading documents.</p>
          )}

          <label
            className={`dropzone ${form.file ? 'dropzone--has-file' : ''}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFilePick(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              type="file"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
              onChange={(e) => onFilePick(e.target.files?.[0])}
              className="file-hidden"
            />
            {form.file ? (
              <div className="dropzone-file-info">
                {getFileIcon(pickedExt)}
                <div>
                  <strong>{form.file.name}</strong>
                  <span className="muted-text font-12"> ({formatFileSize(form.file.size)} • {pickedExt.toUpperCase()})</span>
                </div>
              </div>
            ) : (
              <>
                <CloudUpload size={24} />
                <span>Drop file here or click to browse (PDF, DOCX, DOC, JPG, PNG up to 25MB)</span>
              </>
            )}
          </label>

          {uploading && (
            <div className="progress-wrap" aria-label="Upload progress">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
              <span>{progress}%</span>
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={uploading}>
            {uploading ? (
              <><LoaderCircle size={16} className="spin" /> Uploading…</>
            ) : (
              <><File size={16} /> Upload Document</>
            )}
          </button>

          {message && (
            <p className={`form-message ${isSuccess ? 'form-message--success' : 'form-message--error'}`}>
              {message}
            </p>
          )}
        </form>
      </section>
    </section>
  );
}

export default AdminUploadPage;

