import React, { useEffect, useState } from 'react';
import { FileText, GraduationCap, ExternalLink, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import api, { getDownloadUrl } from '../services/api';

const DOCUMENT_TYPES = ['Assignment', 'Book', 'Notes', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
];

function SubjectPage() {
  const { id } = useParams();
  const [subject, setSubject] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/subjects/${id}`).then((res) => setSubject(res.data));
  }, [id]);

  // Reset to page 1 whenever a filter/sort changes (a fresh filter should not
  // stay stuck on a page number that may no longer exist in the new result set)
  useEffect(() => {
    setPage(1);
  }, [type, sort, id]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '9', sort });
    if (type) params.set('type', type);

    api
      .get(`/subjects/${id}/documents?${params.toString()}`)
      .then((res) => {
        setDocuments(res.data.documents || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      })
      .finally(() => setLoading(false));
  }, [id, page, type, sort]);

  return (
    <div className="space-y-24">
      <Breadcrumbs
        items={[
          { label: 'Home', to: '/' },
          ...(subject?.semesterId?.departmentId ? [{ label: subject.semesterId.departmentId.name, to: `/department/${subject.semesterId.departmentId._id}` }] : []),
          ...(subject?.semesterId ? [{ label: subject.semesterId.name, to: `/semester/${subject.semesterId._id}` }] : []),
          { label: subject?.name || 'Subject' },
        ]}
      />

      <section className="section-card compact-hero">
        <h1>{subject?.name || 'Subject Documents'}</h1>
        <p className="muted-text">Professional document access with instant preview and reliable .pdf downloads.</p>
      </section>

      <section className="section-card">
        <div className="list-toolbar">
          <h2 className="section-title">Available PDFs ({total})</h2>
          <div className="list-toolbar-controls">
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
              <option value="">All types</option>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort documents">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="muted-text">Loading documents…</p>
        ) : (
          <div className="document-grid">
            {documents.length > 0 ? documents.map((doc) => (
              <article key={doc._id} className="document-card">
                <div className="card-top">
                  <span className="type-badge">{doc.type}</span>
                  <span className="muted-text">{new Date(doc.uploadDate).toLocaleDateString()}</span>
                </div>

                <h3>{doc.title}</h3>
                <div className="doc-meta-list">
                  <span><GraduationCap size={15} /> {doc.semesterId?.name}</span>
                  <span><FileText size={15} /> {doc.subjectId?.name}</span>
                </div>

                <div className="card-actions">
                  <a className="btn-primary" href={doc.cloudinaryUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={16} />
                    <span>View</span>
                  </a>
                  <a className="btn-secondary" href={getDownloadUrl(doc._id)}>
                    <Download size={16} />
                    <span>Download</span>
                  </a>
                </div>
              </article>
            )) : (
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
