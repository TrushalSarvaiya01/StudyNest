import React, { useEffect, useState } from 'react';
import { Activity, BookOpen, Clock3, Files } from 'lucide-react';
import api from '../services/api';
import { getAuthHeaders } from '../services/api';

function AdminDashboard({ auth, onLogout }) {
  const [stats, setStats] = useState({ departmentCount: 0, semesterCount: 0, subjectCount: 0, documentCount: 0 });
  const [recentDocs, setRecentDocs] = useState([]);

  useEffect(() => {
    api.get('/admin/stats', { headers: getAuthHeaders(auth.token) }).then((res) => setStats(res.data));
    api.get('/admin/recent-documents', { headers: getAuthHeaders(auth.token) }).then((res) => setRecentDocs(res.data));
  }, [auth.token]);

  return (
    <section className="admin-content admin-page-content">
      <div className="section-card compact-hero">
        <h1>Welcome back, {auth.username}</h1>
        <p className="muted-text">Manage all study resources from your premium admin workspace.</p>
      </div>

        <div className="stats-grid">
          <article className="stats-card">
            <div className="stats-icon"><BookOpen size={17} /></div>
            <span className="stats-label">Total Departments</span>
            <strong>{stats.departmentCount}</strong>
          </article>
          <article className="stats-card">
            <div className="stats-icon"><BookOpen size={17} /></div>
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
            <span className="stats-label">Total PDFs</span>
            <strong>{stats.documentCount}</strong>
          </article>
        </div>

        <section className="section-card">
          <h2 className="section-title">Recent Uploads</h2>
          <div className="recent-list">
            {recentDocs.map((doc) => (
              <article key={doc._id} className="recent-item">
                <div>
                  <h3>{doc.title}</h3>
                  <p className="muted-text">{doc.semesterId?.name} • {doc.subjectId?.name} • {doc.type}</p>
                </div>
                <span className="recent-date"><Clock3 size={14} /> {new Date(doc.uploadDate).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        </section>
    </section>
  );
}

export default AdminDashboard;
