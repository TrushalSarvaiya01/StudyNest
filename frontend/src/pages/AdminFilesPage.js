import React, { useEffect, useState } from 'react';
import { Download, ExternalLink, Pencil, Save, Trash2, X, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import api, { getAuthHeaders, getDownloadUrl } from '../services/api';

const DOCUMENT_TYPES = ['Assignment', 'Book', 'Notes', 'Other'];
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A-Z' },
  { value: 'title_desc', label: 'Title Z-A' },
];

function AdminFilesPage({ auth, onLogout }) {
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

  useEffect(() => {
    setPage(1);
  }, [type, sort, query]);

  useEffect(() => {
    fetchDocuments();
    
  }, [auth.token, page, type, sort, query]);

  const fetchDocuments = async () => {
    const params = new URLSearchParams({ page: String(page), limit: '10', sort });
    if (type) params.set('type', type);
    if (query) params.set('q', query);

    const res = await api.get(`/admin/documents?${params.toString()}`, { headers: getAuthHeaders(auth.token) });
    setDocuments(res.data.documents || []);
    setTotal(res.data.total || 0);
    setTotalPages(res.data.totalPages || 1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setQuery(searchInput.trim());
  };

  const startEdit = (doc) => {
    setEditingId(doc._id);
    setForm({ title: doc.title, type: doc.type });
  };

  const saveEdit = async (id) => {
    await api.put(`/admin/document/${id}`, form, { headers: getAuthHeaders(auth.token) });
    setEditingId('');
    fetchDocuments();
  };

  const deleteDoc = async (id) => {
    await api.delete(`/admin/document/${id}`, { headers: getAuthHeaders(auth.token) });
    fetchDocuments();
  };

  const documentCard = (doc) => (
    <article key={doc._id} className="manage-mobile-card">
      <div className="manage-mobile-row">
        <strong>{doc.title}</strong>
        <span className="type-badge">{doc.type}</span>
      </div>
      <p className="muted-text">{doc.departmentId?.name} • {doc.semesterId?.name} • {doc.subjectId?.name}</p>
      <p className="muted-text">{new Date(doc.uploadDate).toLocaleDateString()}</p>
      <div className="card-actions wrap">
        <a className="btn-secondary" href={doc.cloudinaryUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> View</a>
        <a className="btn-secondary" href={getDownloadUrl(doc._id)}><Download size={16} /> Download</a>
        <button type="button" className="btn-secondary" onClick={() => startEdit(doc)}><Pencil size={16} /> Edit</button>
        <button type="button" className="btn-danger" onClick={() => deleteDoc(doc._id)}><Trash2 size={16} /> Delete</button>
      </div>
    </article>
  );

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Manage Documents</h1>
        <p className="muted-text">Edit metadata, preview files, and remove outdated uploads.</p>

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
            <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type">
              <option value="">All types</option>
              {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort documents">
              {SORT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <p className="muted-text">{total} document{total === 1 ? '' : 's'} found</p>

        <div className="table-shell desktop-only">
          <table>
            <thead>
              <tr>
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
              {documents.map((doc) => (
                <tr key={doc._id}>
                  <td>{doc.departmentId?.name}</td>
                  <td>{doc.semesterId?.name}</td>
                  <td>{doc.subjectId?.name}</td>
                  <td>
                    {editingId === doc._id ? (
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    ) : (
                      doc.title
                    )}
                  </td>
                  <td>
                    {editingId === doc._id ? (
                      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                        {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      doc.type
                    )}
                  </td>
                  <td>{new Date(doc.uploadDate).toLocaleDateString()}</td>
                  <td>
                    {editingId === doc._id ? (
                      <div className="card-actions wrap">
                        <button type="button" className="btn-primary" onClick={() => saveEdit(doc._id)}><Save size={16} /> Save</button>
                        <button type="button" className="btn-secondary" onClick={() => setEditingId('')}><X size={16} /> Cancel</button>
                      </div>
                    ) : (
                      <div className="card-actions wrap">
                        <a className="btn-secondary" href={doc.cloudinaryUrl} target="_blank" rel="noreferrer"><ExternalLink size={16} /> View</a>
                        <a className="btn-secondary" href={getDownloadUrl(doc._id)}><Download size={16} /> Download</a>
                        <button type="button" className="btn-secondary" onClick={() => startEdit(doc)}><Pencil size={16} /> Edit</button>
                        <button type="button" className="btn-danger" onClick={() => deleteDoc(doc._id)}><Trash2 size={16} /> Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only stack-16">
          {documents.map((doc) => documentCard(doc))}
        </div>

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
    </section>
  );
}

export default AdminFilesPage;
