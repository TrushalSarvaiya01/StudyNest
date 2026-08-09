import React, { useEffect, useState } from 'react';
import { CloudUpload, File, LoaderCircle } from 'lucide-react';
import api, { getAuthHeaders } from '../services/api';

function AdminUploadPage({ auth, onLogout }) {
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({ departmentId: '', semesterId: '', subjectId: '', title: '', type: 'Assignment', file: null });
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.get('/departments').then((res) => {
      setDepartments(res.data);
    });
  }, []);

  useEffect(() => {
    if (form.semesterId) {
      api.get(`/semesters/${form.semesterId}/subjects`).then((res) => setSubjects(res.data));
    } else {
      setSubjects([]);
    }
  }, [form.semesterId]);

  // when department changes, load semesters for that department
  useEffect(() => {
    if (form.departmentId) {
      api.get(`/departments/${form.departmentId}/semesters`).then((res) => setSemesters(res.data));
      setForm((prev) => ({ ...prev, semesterId: '', subjectId: '' }));
      setSubjects([]);
    }
  }, [form.departmentId]);

  const onFilePick = (file) => {
    if (file && file.type !== 'application/pdf') {
      setMessage('Please choose a PDF file only.');
      return;
    }
    setMessage('');
    setForm((prev) => ({ ...prev, file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.file) {
      setMessage('Please select a PDF file to upload.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage('');

    const data = new FormData();
    data.append('departmentId', form.departmentId);
    data.append('semesterId', form.semesterId);
    data.append('subjectId', form.subjectId);
    data.append('title', form.title);
    data.append('type', form.type);
    data.append('file', form.file);

    try {
      await api.post('/admin/document', data, {
        headers: getAuthHeaders(auth.token),
        onUploadProgress: (event) => {
          if (event.total) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        },
      });
      setMessage('Document uploaded successfully');
      setForm({ departmentId: '', semesterId: '', subjectId: '', title: '', type: 'Assignment', file: null });
      setSubjects([]);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Upload Study Document</h1>
        <p className="muted-text">Drag and drop a PDF or select one from your device.</p>

          <form className="upload-form" onSubmit={handleSubmit}>
            <div className="form-grid two-column">
              <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>

              <select value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: e.target.value, subjectId: '' })} required>
                <option value="">Select semester</option>
                {semesters.map((semester) => <option key={semester._id} value={semester._id}>{semester.name}</option>)}
              </select>

              <select value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                <option value="">Select subject</option>
                {subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
              </select>

              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" required />

              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Assignment">Assignment</option>
                <option value="Book">Book</option>
                <option value="Notes">Notes</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {!departments.length && <p className="muted-text">Create a department, semester, and subject before uploading PDFs.</p>}

            <label
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onFilePick(e.dataTransfer.files?.[0]);
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => onFilePick(e.target.files?.[0])}
                className="file-hidden"
              />
              <CloudUpload size={20} />
              <span>{form.file ? form.file.name : 'Drop PDF here or click to browse'}</span>
            </label>

            {uploading && (
              <div className="progress-wrap" aria-label="Upload progress">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
                <span>{progress}%</span>
              </div>
            )}

            <button className="btn-primary" type="submit" disabled={uploading}>
              {uploading ? <><LoaderCircle size={16} className="spin" /> Uploading…</> : <><File size={16} /> Upload PDF</>}
            </button>

            {message && <p className="form-message">{message}</p>}
          </form>
      </section>
    </section>
  );
}

export default AdminUploadPage;
