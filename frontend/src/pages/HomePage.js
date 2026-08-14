import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Download,
  File,
  FileCode,
  GraduationCap,
  Image,
  Layers,
  Search,
  Zap,
} from 'lucide-react';

import api, {
  getDownloadUrl,
  getFileFormat,
  formatFileSize,
  isRequestCancelled,
} from '../services/api';

const features = [
  {
    icon: GraduationCap,
    title: 'Department Wise',
    description:
      'All study resources are organized by department and semester so students find materials faster.',
  },
  {
    icon: BookOpen,
    title: 'Organized Resources',
    description:
      'Easily navigate assignments, textbooks, notes, and previous question papers.',
  },
  {
    icon: Download,
    title: 'Fast Downloads',
    description:
      'One-click reliable downloads with original file preservation and high speed.',
  },
  {
    icon: Layers,
    title: 'Multi-Format Support',
    description:
      'Supports PDFs, Microsoft Word (.docx/.doc), and image formats (JPG/PNG).',
  },
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

function HomePage() {
  const [overview, setOverview] = useState({
    totals: {
      departmentCount: 0,
      semesterCount: 0,
      subjectCount: 0,
      documentCount: 0,
    },
    departments: [],
    semesters: [],
    recentDocuments: [],
  });

  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Load homepage overview
  useEffect(() => {
    const controller = new AbortController();

    api
      .get('/overview', {
        signal: controller.signal,
      })
      .then((res) => {
        setOverview((prev) => ({
          ...prev,
          ...res.data,
        }));
      })
      .catch((error) => {
        if (!isRequestCancelled(error)) {
          console.error('Failed to load homepage overview:', error);
        }
      });

    return () => {
      controller.abort();
    };
  }, []);

  // Fast indexed search documents
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoadingResults(false);
      return undefined;
    }

    const controller = new AbortController();
    setLoadingResults(true);

    api
      .get(`/search?q=${encodeURIComponent(searchQuery.trim())}`, {
        signal: controller.signal,
      })
      .then((res) => {
        setResults(res.data?.documents || []);
      })
      .catch((error) => {
        if (!isRequestCancelled(error)) {
          console.error('Search failed:', error);
          setResults([]);
        }
      })
      .finally(() => {
        setLoadingResults(false);
      });

    return () => {
      controller.abort();
    };
  }, [searchQuery]);

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleSearchIconClick = () => {
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setResults([]);
  };

  const hasResults = useMemo(() => results.length > 0, [results]);

  const departments =
    overview.departments?.length > 0
      ? overview.departments
      : overview.semesters || [];

  return (
    <div className="page-root home-page">
      <div className="container">
        {/* SEARCH SECTION */}
        <section className="section-card home-search-section">
          <div className="home-search-header">
            <h1 className="home-page-title">
              Department &amp; Semester Study Materials
            </h1>

            <p className="muted-text home-page-subtitle">
              Browse assignments, notes, books, previous papers, and study resources across all departments.
            </p>
          </div>

          <form
            className="search-form"
            onSubmit={handleSearch}
            role="search"
          >
            <div className="search-wrap">
              <button
                type="button"
                className="search-icon-button"
                aria-label="Search"
                onClick={handleSearchIconClick}
              >
                <Search size={18} />
              </button>

              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by department, semester, subject, title, or type..."
                aria-label="Search study documents"
              />

              {searchInput && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="Clear search"
                  onClick={clearSearch}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="submit"
              className="btn-primary search-button"
            >
              <Search size={17} />
              <span>Search</span>
            </button>
          </form>

          {/* Statistics */}
          <div className="hero-kpis home-kpis">
            <div className="kpi">
              <strong>{overview.totals?.departmentCount || 0}</strong>
              <span>Departments</span>
            </div>

            <div className="kpi">
              <strong>{overview.totals?.subjectCount || 0}</strong>
              <span>Subjects</span>
            </div>

            <div className="kpi">
              <strong>{overview.totals?.documentCount || 0}</strong>
              <span>Documents</span>
            </div>
          </div>
        </section>

        {/* SEARCH RESULTS */}
        <AnimatePresence>
          {searchQuery.trim() && (
            <motion.section
              className="section-card"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <div className="section-heading-row">
                <div>
                  <h2 className="section-title">Search Results</h2>
                  <p className="muted-text">Results for “{searchQuery}”</p>
                </div>

                <button
                  type="button"
                  className="btn-secondary"
                  onClick={clearSearch}
                >
                  Clear
                </button>
              </div>

              {loadingResults ? (
                <div className="document-grid">
                  {[1, 2, 3].map((k) => (
                    <div key={k} className="document-card skeleton-card">
                      <div className="skeleton-line skeleton-badge" />
                      <div className="skeleton-line skeleton-title" />
                      <div className="skeleton-line skeleton-subtitle" />
                      <div className="skeleton-line skeleton-btn" />
                    </div>
                  ))}
                </div>
              ) : hasResults ? (
                <div className="document-grid">
                  {results.map((doc) => {
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

                        <p className="muted-text">
                          {doc.departmentId?.name || 'Department'}
                          {' • '}
                          {doc.semesterId?.name || 'Semester'}
                          {' • '}
                          {doc.subjectId?.name || 'Subject'}
                        </p>

                        <div className="card-actions">
                          <a className="btn-primary w-full" href={downloadUrl}>
                            <Download size={16} />
                            Download
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p className="muted-text">No documents found for “{searchQuery}”.</p>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* FEATURES */}
        <section className="home-features-section">
          <h2 className="section-title">Everything you need to study efficiently</h2>

          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <motion.article
                  key={feature.title}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="feature-card"
                >
                  <div className="feature-icon">
                    <Icon size={18} />
                  </div>

                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* DEPARTMENTS */}
        <section className="section-card" id="departments">
          <div className="section-heading-row">
            <div>
              <h2 className="section-title">Browse by Department</h2>
              <p className="muted-text">Select your department to explore semesters and study materials.</p>
            </div>
          </div>

          {departments.length > 0 ? (
            <div className="semester-grid">
              {departments.map((dept) => (
                <motion.article
                  key={dept._id}
                  className="semester-card"
                  whileHover={{ y: -5 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="semester-gradient">
                    <GraduationCap size={18} />
                    <span>{dept.name}</span>
                  </div>

                  <div className="semester-meta">
                    <div>
                      <strong>{dept.totalSemesters || 0}</strong>
                      <span>Semesters</span>
                    </div>

                    <div>
                      <strong>{dept.totalSubjects || 0}</strong>
                      <span>Subjects</span>
                    </div>

                    <div>
                      <strong>{dept.totalPdfs || 0}</strong>
                      <span>Documents</span>
                    </div>
                  </div>

                  <Link className="btn-primary w-full" to={`/department/${dept._id}`}>
                    Open Department
                  </Link>
                </motion.article>
              ))}
            </div>
          ) : (
            <p className="muted-text">No departments have been created yet.</p>
          )}
        </section>

        {/* RECENT UPLOADS */}
        <section className="section-card">
          <div className="section-heading-row">
            <div>
              <h2 className="section-title">Recent Uploads</h2>
              <p className="muted-text">Recently added study materials and notes.</p>
            </div>
          </div>

          {overview.recentDocuments?.length > 0 ? (
            <div className="document-grid">
              {overview.recentDocuments.map((doc) => {
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

                    <p className="muted-text">
                      {doc.departmentId?.name ? `${doc.departmentId.name} • ` : ''}
                      {doc.semesterId?.name || 'Semester'}
                      {' • '}
                      {doc.subjectId?.name || 'Subject'}
                    </p>

                    <div className="card-actions">
                      <a className="btn-primary w-full" href={downloadUrl}>
                        <Download size={16} />
                        Download
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted-text">No recent uploads available.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default HomePage;