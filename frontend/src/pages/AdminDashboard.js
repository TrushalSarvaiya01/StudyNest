import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, Clock3, Files, GraduationCap, Building2, Image, FileCode, File } from 'lucide-react';
import api, { getFileFormat } from '../services/api';

function getFormatIcon(format) {
  switch (format) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image size={12} />;
    case 'doc':
    case 'docx':
      return <FileCode size={12} />;
    default:
      return <File size={12} />;
  }
}

function AdminDashboard({ auth }) {
  const [stats, setStats] = useState({ departmentCount: 0, semesterCount: 0, subjectCount: 0, documentCount: 0 });
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/recent-documents'),
    ])
      .then(([statsRes, docsRes]) => {
        setStats(statsRes.data || { departmentCount: 0, semesterCount: 0, subjectCount: 0, documentCount: 0 });
        setRecentDocs(docsRes.data || []);
      })
      .catch((err) => {
        console.error('Failed to load dashboard data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <section className="admin-content admin-page-content">
      <div className="section-card compact-hero">
        <h1>Welcome back, {auth.username || 'Admin'}</h1>
        <p className="muted-text">Manage all academic resources and documents from your central admin dashboard.</p>
      </div>

      <div className="stats-grid">
        <article className="stats-card">
          <div className="stats-icon"><Building2 size={17} /></div>
          <span className="stats-label">Total Departments</span>
          <strong>{stats.departmentCount}</strong>
        </article>
        <article className="stats-card">
          <div className="stats-icon"><GraduationCap size={17} /></div>
          <span className="stats-label">Total Semesters</span>
          <strong>{stats.semesterCount}</strong>
        </article>
        <article className="stats-card">
          <div className="stats-icon"><Activity size={17} /></div>
          <span className="stats-label">Total Subjects</span>
          <strong>{stats.subjectCount}</strong>
        </article>
        <article className="stats-card">
          <div className="stats-icon"><Files size={17} /></div>
          <span className="stats-label">Total Documents</span>
          <strong>{stats.documentCount}</strong>
        </article>
      </div>

      <section className="section-card">
        <h2 className="section-title">Recent Uploads</h2>
        {loading ? (
          <div className="stack-16">
            {[1, 2, 3].map((k) => (
              <div key={k} className="recent-item skeleton-card">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
              </div>
            ))}
          </div>
        ) : recentDocs.length > 0 ? (
          <div className="recent-list">
            {recentDocs.map((doc) => {
              const format = getFileFormat(doc);

              return (
                <article key={doc._id} className="recent-item">
                  <div>
                    <div className="badge-group" style={{ marginBottom: '0.3rem' }}>
                      <span className="type-badge">{doc.type}</span>
                      <span className={`format-badge format-badge--${format}`}>
                        {getFormatIcon(format)}
                        <span>{format.toUpperCase()}</span>
                      </span>
                    </div>
                    <h3>{doc.title}</h3>
                    <p className="muted-text">
                      {doc.departmentId?.name ? `${doc.departmentId.name} • ` : ''}
                      {doc.semesterId?.name || 'Semester'}
                      {' • '}
                      {doc.subjectId?.name || 'Subject'}
                    </p>
                  </div>
                  <span className="recent-date">
                    <Clock3 size={14} /> {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : ''}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted-text">No uploads recorded yet.</p>
        )}
      </section>
    </section>
  );
}

export default AdminDashboard;

