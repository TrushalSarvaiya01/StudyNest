import React, { useEffect, useState, useCallback } from 'react';
import { Download, Pencil, Save, Trash2, X, ChevronLeft, ChevronRight, Search, File, Image, FileCode } from 'lucide-react';
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
      return <Image size={12} />;
    case 'doc':
    case 'docx':
      return <FileCode size={12} />;
    default:
      return <File size={12} />;
  }
}

function AdminFilesPage() {
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState('');
  const [form, setForm] = useState({ title: '', type: 'Assignment' });

  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [type, setType] = useState('');
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocuments = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({ page: String(page), limit: '10', sort });
    if (type) params.set('type', type);
    if (query) params.set('q', query);

    api
      .get(`/admin/documents?${params.toString()}`, { signal: controller.signal })
      .then((res) => {
        setDocuments(res.data.documents || []);
        setTotal(res.data.total || 0);
        setTotalPages(res.data.totalPages || 1);
      })
      .catch((err) => {
        if (!isRequestCancelled(err)) console.error('Failed to fetch documents:', err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [page, type, sort, query]);

  useEffect(() => {
    const cleanup = fetchDocuments();
    return () => cleanup && cleanup();
  }, [fetchDocuments]);

  const handleTypeChange = (e) => {
    setType(e.target.value);
    setPage(1);
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
    setPage(1);
  };

  const startEdit = (doc) => {
    setEditingId(doc._id);
    setForm({ title: doc.title, type: doc.type });
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/admin/document/${id}`, form);
      setEditingId('');
      fetchDocuments();
    } catch (error) {
      console.error('Failed to save edit:', error);
    }
  };

  const deleteDoc = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/admin/document/${id}`);
      fetchDocuments();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const documentCard = (doc) => {
    const format = getFileFormat(doc);
    const downloadUrl = getDownloadUrl(doc._id);

    return (
      <article key={doc._id} className="manage-mobile-card">
        <div className="manage-mobile-row">
          <strong>{doc.title}</strong>
          <div className="badge-group">
            <span className="type-badge">{doc.type}</span>
            <span className={`format-badge format-badge--${format}`}>
              {getFormatIcon(format)}
              <span>{format.toUpperCase()}</span>
            </span>
          </div>
        </div>
        <p className="muted-text">{doc.departmentId?.name} • {doc.semesterId?.name} • {doc.subjectId?.name}</p>
        <p className="muted-text">
          {new Date(doc.uploadDate).toLocaleDateString()}
          {doc.fileSize > 0 && ` • ${formatFileSize(doc.fileSize)}`}
        </p>
        <div className="card-actions wrap">
          <a className="btn-secondary" href={downloadUrl}>
            <Download size={16} /> Download
          </a>
          <button type="button" className="btn-secondary" onClick={() => startEdit(doc)}>
            <Pencil size={16} /> Edit
          </button>
          <button type="button" className="btn-danger" onClick={() => deleteDoc(doc._id)}>
            <Trash2 size={16} /> Delete
          </button>
        </div>
      </article>
    );
  };

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Manage Documents</h1>
        <p className="muted-text">Edit metadata, download files, and remove outdated uploads across all formats.</p>

        <div className="list-toolbar">
          <form className="search-wrap compact" onSubmit={handleSearchSubmit}>
            <button type="submit" className="search-icon-button" aria-label="Search documents">
              <Search size={16} />
            </button>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by title"
              aria-label="Search documents by title"
            />
          </form>

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

        <p className="muted-text">{total} document{total === 1 ? '' : 's'} found</p>

        {loading ? (
          <div className="stack-16">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="list-item skeleton-card">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="table-shell desktop-only">
              <table>
                <thead>
                  <tr>
                    <th>Format</th>
                    <th>Department</th>
                    <th>Semester</th>
                    <th>Subject</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const format = getFileFormat(doc);
                    const downloadUrl = getDownloadUrl(doc._id);

                    return (
                      <tr key={doc._id}>
                        <td>
                          <span className={`format-badge format-badge--${format}`}>
                            {getFormatIcon(format)}
                            <span>{format.toUpperCase()}</span>
                          </span>
                        </td>
                        <td>{doc.departmentId?.name || '—'}</td>
                        <td>{doc.semesterId?.name || '—'}</td>
                        <td>{doc.subjectId?.name || '—'}</td>
                        <td>
                          {editingId === doc._id ? (
                            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                          ) : (
                            <div>
                              <div>{doc.title}</div>
                              {doc.fileSize > 0 && <span className="muted-text font-12">{formatFileSize(doc.fileSize)}</span>}
                            </div>
                          )}
                        </td>
                        <td>
                          {editingId === doc._id ? (
                            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                            </select>
                          ) : (
                            <span className="type-badge">{doc.type}</span>
                          )}
                        </td>
                        <td>{doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}</td>
                        <td>
                          {editingId === doc._id ? (
                            <div className="card-actions wrap">
                              <button type="button" className="btn-primary" onClick={() => saveEdit(doc._id)}>
                                <Save size={16} /> Save
                              </button>
                              <button type="button" className="btn-secondary" onClick={() => setEditingId('')}>
                                <X size={16} /> Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="card-actions wrap">
                              <a className="btn-secondary" href={downloadUrl}>
                                <Download size={16} /> Download
                              </a>
                              <button type="button" className="btn-secondary" onClick={() => startEdit(doc)}>
                                <Pencil size={16} /> Edit
                              </button>
                              <button type="button" className="btn-danger" onClick={() => deleteDoc(doc._id)}>
                                <Trash2 size={16} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!documents.length && (
                    <tr>
                      <td colSpan="8" className="text-center muted-text p-16">
                        No documents found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mobile-only stack-16">
              {documents.map((doc) => documentCard(doc))}
              {!documents.length && <p className="muted-text">No documents found.</p>}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="muted-text">Page {page} of {totalPages}</span>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </section>
    </section>
  );
}

export default AdminFilesPage;

