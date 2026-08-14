import React, { useEffect, useState, useCallback } from 'react';
import { FileText, GraduationCap, Download, ChevronLeft, ChevronRight, File, Image, FileCode } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import api, { getDownloadUrl, getFileFormat, formatFileSize, isRequestCancelled } from '../services/api';

const DOCUMENT_TYPES = ['Assignment', 'Book', 'Notes', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
];

function getFormatIcon(format) {
  switch (format) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return <Image size={13} />;
    case 'doc':
    case 'docx':
      return <FileCode size={13} />;
    default:
      return <File size={13} />;
  }
}

function SubjectPage() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(true);

  // Load subject details and breadcrumbs data
  useEffect(() => {
    const controller = new AbortController();
    api.get(`/subjects/${id}`, { signal: controller.signal })
      .then((res) => setSubject(res.data))
      .catch((err) => {
        if (!isRequestCancelled(err)) console.error('Failed to load subject:', err);
      });

    return () => controller.abort();
  }, [id]);

  // Single controlled data fetch - eliminating double-fetch race conditions
  const fetchDocs = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), limit: '9', sort });
    if (type) params.set('type', type);

    api
      .get(`/subjects/${id}/documents?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        setDocuments(res.data.documents || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch((err) => {
        if (!isRequestCancelled(err)) console.error('Failed to load documents:', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [id, page, type, sort]);

  useEffect(() => {
    const cleanup = fetchDocs();
    return () => cleanup && cleanup();
  }, [fetchDocs]);

  const handleTypeChange = (e) => {
    setType(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const departmentObj = subject?.departmentId || subject?.semesterId?.departmentId;

  return (
    <div className="space-y-24">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          ...(departmentObj ? [{ label: departmentObj.name, to: `/department/${departmentObj._id}` }] : []),
          ...(subject?.semesterId ? [{ label: subject.semesterId.name, to: `/semester/${subject.semesterId._id}` }] : []),
          { label: subject?.name || 'Subject' },
        ]}
      />

      <section className="section-card compact-hero">
        <h1>{subject?.name || 'Subject Documents'}</h1>
        <p className="muted-text">Access study resources with instant in-browser preview and fast downloads for PDF, Word documents, and images.</p>
      </section>

      <section className="section-card">
        <div className="list-toolbar">
          <h2 className="section-title">Available Resources ({total})</h2>
          <div className="list-toolbar-controls">
            <select value={type} onChange={handleTypeChange} aria-label="Filter by type">
              <option value="">All types</option>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={sort} onChange={handleSortChange} aria-label="Sort documents">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="document-grid">
            {[1, 2, 3, 4, 5, 6].map((k) => (
              <div key={k} className="document-card skeleton-card">
                <div className="skeleton-line skeleton-badge" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
                <div className="skeleton-line skeleton-btn" />
              </div>
            ))}
          </div>
        ) : (
          <div className="document-grid">
            {documents.length > 0 ? documents.map((doc) => {
              const format = getFileFormat(doc);
              const downloadUrl = getDownloadUrl(doc._id);

              return (
                <article key={doc._id} className="document-card">
                  <div className="card-top">
                    <div className="badge-group">
                      <span className="type-badge">{doc.type}</span>
                      <span className={`format-badge format-badge--${format}`}>
                        {getFormatIcon(format)}
                        <span>{format.toUpperCase()}</span>
                      </span>
                    </div>
                    <span className="muted-text">
                      {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : ''}
                    </span>
                  </div>

                  <h3>{doc.title}</h3>
                  <div className="doc-meta-list">
                    <span><GraduationCap size={15} /> {doc.semesterId?.name || 'Semester'}</span>
                    <span><FileText size={15} /> {doc.subjectId?.name || 'Subject'}</span>
                    {doc.fileSize > 0 && <span className="muted-text font-12">{formatFileSize(doc.fileSize)}</span>}
                  </div>

                  <div className="card-actions">
                    <a className="btn-primary w-full" href={downloadUrl}>
                      <Download size={16} />
                      <span>Download</span>
                    </a>
                  </div>
                </article>
              );
            }) : (
              <p className="muted-text">No documents match these filters.</p>
            )}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="muted-text">Page {page} of {totalPages}</span>
            <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default SubjectPage;

