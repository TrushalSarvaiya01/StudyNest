import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, PlusCircle, Save, Trash2, X, Building2, GraduationCap, BookOpen } from 'lucide-react';
import api from '../services/api';

function AdminManagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'all';

  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Create form inputs
  const [departmentName, setDepartmentName] = useState('');
  const [semesterName, setSemesterName] = useState('');
  const [subjectName, setSubjectName] = useState('');

  // Dropdown selections for create forms
  const [semFormDept, setSemFormDept] = useState('');
  const [subFormDept, setSubFormDept] = useState('');
  const [subFormSem, setSubFormSem] = useState('');

  // Dropdown filter for Subject list view
  const [viewSemesterId, setViewSemesterId] = useState('');

  // Edit states
  const [editingDept, setEditingDept] = useState(null);
  const [editingSemester, setEditingSemester] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);

  const [message, setMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const normalizeName = (value) => String(value || '').trim().toLowerCase();

  const semesterExistsInDepartment = (name, departmentId, excludeId = '') => {
    const norm = normalizeName(name);
    const deptId = String(departmentId || '');

    return semesters.some((semester) => {
      if (excludeId && String(semester._id) === String(excludeId)) {
        return false;
      }
      return (
        String(semester.departmentId) === deptId &&
        normalizeName(semester.name) === norm
      );
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When subject form department changes, reset subject form semester
  const handleSubFormDeptChange = (deptId) => {
    setSubFormDept(deptId);
    const matchingSems = semesters.filter((s) => String(s.departmentId) === String(deptId));
    setSubFormSem(matchingSems.length > 0 ? matchingSems[0]._id : '');
  };

  // Fetch subjects whenever the view selector changes
  useEffect(() => {
    if (!viewSemesterId) {
      setSubjects([]);
      return;
    }
    api.get(`/semesters/${viewSemesterId}/subjects`)
      .then((res) => setSubjects(res.data || []))
      .catch((err) => console.error('Failed to fetch subjects:', err));
  }, [viewSemesterId]);

  async function fetchData() {
    try {
      const [deptRes, semRes] = await Promise.all([api.get('/departments'), api.get('/semesters')]);
      const depts = deptRes.data || [];
      const sems = semRes.data || [];
      setDepartments(depts);
      setSemesters(sems);

      if (depts.length > 0) {
        setSemFormDept((prev) => prev || depts[0]._id);
        setSubFormDept((prev) => prev || depts[0]._id);
      }
      if (sems.length > 0) {
        setSubFormSem((prev) => prev || sems[0]._id);
        setViewSemesterId((prev) => prev || sems[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch admin manage data', error);
    }
  }

  // --- Department Actions ---
  const addDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/department', { name: departmentName });
      setDepartmentName('');
      await fetchData();
      setIsSuccess(true);
      setMessage('Department added successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to add department.');
    }
  };

  const saveDepartmentEdit = async (deptId) => {
    if (!editingDept) return;
    try {
      await api.put(`/admin/department/${deptId}`, { name: editingDept.name });
      setEditingDept(null);
      await fetchData();
      setIsSuccess(true);
      setMessage('Department updated successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to update department.');
    }
  };

  const deleteDepartment = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department? Make sure all semesters, subjects and documents are removed first.')) return;
    try {
      await api.delete(`/admin/department/${deptId}`);
      if (semFormDept === deptId) setSemFormDept('');
      if (subFormDept === deptId) setSubFormDept('');
      await fetchData();
      setIsSuccess(true);
      setMessage('Department deleted successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to delete department.');
    }
  };

  // --- Semester Actions ---
  const addSemester = async (e) => {
    e.preventDefault();
    if (!semFormDept) {
      setIsSuccess(false);
      setMessage('Please select a department.');
      return;
    }
    if (semesterExistsInDepartment(semesterName, semFormDept)) {
      setIsSuccess(false);
      setMessage('Semester already exists in this department.');
      return;
    }

    try {
      await api.post('/admin/semester', { name: semesterName, departmentId: semFormDept });
      setSemesterName('');
      await fetchData();
      setIsSuccess(true);
      setMessage('Semester added successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to add semester.');
    }
  };

  const saveSemesterEdit = async (semesterId) => {
    if (!editingSemester) return;
    if (semesterExistsInDepartment(editingSemester.name, editingSemester.departmentId, semesterId)) {
      setIsSuccess(false);
      setMessage('Semester already exists in this department.');
      return;
    }

    try {
      await api.put(`/admin/semester/${semesterId}`, {
        name: editingSemester.name,
        departmentId: editingSemester.departmentId,
      });
      setEditingSemester(null);
      await fetchData();
      setIsSuccess(true);
      setMessage('Semester updated successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to update semester.');
    }
  };

  const deleteSemester = async (semesterId) => {
    if (!window.confirm('Are you sure you want to delete this semester? Make sure all subjects and documents are removed first.')) return;
    try {
      await api.delete(`/admin/semester/${semesterId}`);
      if (subFormSem === semesterId) setSubFormSem('');
      if (viewSemesterId === semesterId) setViewSemesterId('');
      await fetchData();
      setIsSuccess(true);
      setMessage('Semester deleted successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to delete semester.');
    }
  };

  // --- Subject Actions ---
  const addSubject = async (e) => {
    e.preventDefault();
    if (!subFormDept || !subFormSem) {
      setIsSuccess(false);
      setMessage('Please select a department and semester.');
      return;
    }

    try {
      await api.post('/admin/subject', {
        name: subjectName,
        semesterId: subFormSem,
        departmentId: subFormDept,
      });
      setSubjectName('');
      if (viewSemesterId === subFormSem) {
        const res = await api.get(`/semesters/${subFormSem}/subjects`);
        setSubjects(res.data || []);
      } else {
        setViewSemesterId(subFormSem);
      }
      setIsSuccess(true);
      setMessage('Subject added successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to add subject.');
    }
  };

  const saveSubjectEdit = async (subjectId) => {
    if (!editingSubject) return;

    try {
      await api.put(`/admin/subject/${subjectId}`, {
        name: editingSubject.name,
        semesterId: editingSubject.semesterId,
        departmentId: editingSubject.departmentId,
      });
      setEditingSubject(null);
      if (viewSemesterId) {
        const res = await api.get(`/semesters/${viewSemesterId}/subjects`);
        setSubjects(res.data || []);
      }
      setIsSuccess(true);
      setMessage('Subject updated successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to update subject.');
    }
  };

  const deleteSubject = async (subjectId) => {
    if (!window.confirm('Are you sure you want to delete this subject? Make sure all documents are removed first.')) return;
    try {
      await api.delete(`/admin/subject/${subjectId}`);
      if (viewSemesterId) {
        const res = await api.get(`/semesters/${viewSemesterId}/subjects`);
        setSubjects(res.data || []);
      }
      setIsSuccess(true);
      setMessage('Subject deleted successfully.');
    } catch (error) {
      setIsSuccess(false);
      setMessage(error.response?.data?.message || 'Failed to delete subject.');
    }
  };

  const subFormSemOptions = useMemo(() => {
    return semesters.filter((s) => String(s.departmentId) === String(subFormDept));
  }, [semesters, subFormDept]);

  const showAll = activeSection === 'all';
  const showDepartments = showAll || activeSection === 'departments';
  const showSemesters = showAll || activeSection === 'semesters';
  const showSubjects = showAll || activeSection === 'subjects';

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Manage Academic Structure</h1>
        <p className="muted-text">Create, edit, and organize departments, semesters, and subjects.</p>

        {/* Section Tabs */}
        <div className="admin-tabs">
          <button
            type="button"
            className={`tab-button ${activeSection === 'all' ? 'active' : ''}`}
            onClick={() => setSearchParams({ section: 'all' })}
          >
            All Sections
          </button>
          <button
            type="button"
            className={`tab-button ${activeSection === 'departments' ? 'active' : ''}`}
            onClick={() => setSearchParams({ section: 'departments' })}
          >
            <Building2 size={15} />
            <span>Departments</span>
          </button>
          <button
            type="button"
            className={`tab-button ${activeSection === 'semesters' ? 'active' : ''}`}
            onClick={() => setSearchParams({ section: 'semesters' })}
          >
            <GraduationCap size={15} />
            <span>Semesters</span>
          </button>
          <button
            type="button"
            className={`tab-button ${activeSection === 'subjects' ? 'active' : ''}`}
            onClick={() => setSearchParams({ section: 'subjects' })}
          >
            <BookOpen size={15} />
            <span>Subjects</span>
          </button>
        </div>

        {/* Create Forms Grid */}
        <div className="manage-grid">
          {showDepartments && (
            <form className="form-grid" onSubmit={addDepartment}>
              <h3>Add Department</h3>
              <input
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
                placeholder="e.g. Computer Science"
                required
              />
              <button className="btn-primary" type="submit">
                <PlusCircle size={16} /> Add Department
              </button>
            </form>
          )}

          {showSemesters && (
            <form className="form-grid" onSubmit={addSemester}>
              <h3>Add Semester</h3>
              <select
                value={semFormDept}
                onChange={(e) => setSemFormDept(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
              <input
                value={semesterName}
                onChange={(e) => setSemesterName(e.target.value)}
                placeholder="e.g. Semester 1"
                required
              />
              <button className="btn-primary" type="submit">
                <PlusCircle size={16} /> Add Semester
              </button>
            </form>
          )}

          {showSubjects && (
            <form className="form-grid" onSubmit={addSubject}>
              <h3>Add Subject</h3>
              <select
                value={subFormDept}
                onChange={(e) => handleSubFormDeptChange(e.target.value)}
                required
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
              <select
                value={subFormSem}
                onChange={(e) => setSubFormSem(e.target.value)}
                disabled={!subFormDept || subFormSemOptions.length === 0}
                required
              >
                <option value="">
                  {subFormSemOptions.length === 0 ? 'No semesters in this department' : 'Select semester'}
                </option>
                {subFormSemOptions.map((semester) => (
                  <option key={semester._id} value={semester._id}>{semester.name}</option>
                ))}
              </select>
              <input
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Data Structures"
                required
              />
              <button className="btn-primary" type="submit">
                <PlusCircle size={16} /> Add Subject
              </button>
            </form>
          )}
        </div>

        {message && (
          <p className={`form-message ${isSuccess ? 'form-message--success' : 'form-message--error'}`}>
            {message}
          </p>
        )}
      </section>

      {/* DEPARTMENTS LIST & EDIT/DELETE */}
      {showDepartments && (
        <section className="section-card">
          <h2 className="section-title">Current Departments ({departments.length})</h2>
          <div className="stack-16">
            {departments.map((dept) => (
              <article className="list-item" key={dept._id}>
                {editingDept?.id === dept._id ? (
                  <input
                    value={editingDept.name}
                    onChange={(e) => setEditingDept({ ...editingDept, name: e.target.value })}
                  />
                ) : (
                  <div>
                    <strong>{dept.name}</strong>
                  </div>
                )}

                <div className="card-actions wrap">
                  {editingDept?.id === dept._id ? (
                    <>
                      <button type="button" className="btn-primary" onClick={() => saveDepartmentEdit(dept._id)}>
                        <Save size={16} /> Save
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setEditingDept(null)}>
                        <X size={16} /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => setEditingDept({ id: dept._id, name: dept.name })}>
                        <Pencil size={16} /> Edit
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteDepartment(dept._id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {!departments.length && <p className="muted-text">No departments created yet.</p>}
          </div>
        </section>
      )}

      {/* SEMESTERS LIST & EDIT/DELETE */}
      {showSemesters && (
        <section className="section-card">
          <h2 className="section-title">Current Semesters ({semesters.length})</h2>
          <div className="stack-16">
            {semesters.map((semester) => {
              const dept = departments.find((d) => String(d._id) === String(semester.departmentId));
              return (
                <article className="list-item" key={semester._id}>
                  {editingSemester?.id === semester._id ? (
                    <input
                      value={editingSemester.name}
                      onChange={(e) => setEditingSemester({ ...editingSemester, name: e.target.value })}
                    />
                  ) : (
                    <div>
                      <strong>{semester.name}</strong>
                      {dept && <span className="muted-text font-12 ml-8">({dept.name})</span>}
                    </div>
                  )}

                  <div className="card-actions wrap">
                    {editingSemester?.id === semester._id ? (
                      <>
                        <button type="button" className="btn-primary" onClick={() => saveSemesterEdit(semester._id)}>
                          <Save size={16} /> Save
                        </button>
                        <button type="button" className="btn-secondary" onClick={() => setEditingSemester(null)}>
                          <X size={16} /> Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn-secondary" onClick={() => setEditingSemester({ id: semester._id, name: semester.name, departmentId: String(semester.departmentId || '') })}>
                          <Pencil size={16} /> Edit
                        </button>
                        <button type="button" className="btn-danger" onClick={() => deleteSemester(semester._id)}>
                          <Trash2 size={16} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {!semesters.length && <p className="muted-text">No semesters created yet.</p>}
          </div>
        </section>
      )}

      {/* SUBJECTS LIST & EDIT/DELETE */}
      {showSubjects && (
        <section className="section-card">
          <div className="list-toolbar">
            <h2 className="section-title">Current Subjects ({subjects.length})</h2>
            <div className="list-toolbar-controls">
              <select
                value={viewSemesterId}
                onChange={(e) => setViewSemesterId(e.target.value)}
                aria-label="Filter subjects by semester"
              >
                <option value="">Select a semester</option>
                {semesters.map((s) => {
                  const dept = departments.find((d) => String(d._id) === String(s.departmentId));
                  return (
                    <option key={s._id} value={s._id}>
                      {s.name} {dept ? `(${dept.name})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="stack-16">
            {subjects.map((subject) => (
              <article className="list-item" key={subject._id}>
                {editingSubject?.id === subject._id ? (
                  <input
                    value={editingSubject.name}
                    onChange={(e) => setEditingSubject({ ...editingSubject, name: e.target.value })}
                  />
                ) : (
                  <strong>{subject.name}</strong>
                )}

                <div className="card-actions wrap">
                  {editingSubject?.id === subject._id ? (
                    <>
                      <button type="button" className="btn-primary" onClick={() => saveSubjectEdit(subject._id)}>
                        <Save size={16} /> Save
                      </button>
                      <button type="button" className="btn-secondary" onClick={() => setEditingSubject(null)}>
                        <X size={16} /> Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => setEditingSubject({ id: subject._id, name: subject.name, semesterId: String(subject.semesterId || ''), departmentId: String(subject.departmentId || '') })}>
                        <Pencil size={16} /> Edit
                      </button>
                      <button type="button" className="btn-danger" onClick={() => deleteSubject(subject._id)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
            {!subjects.length && (
              <p className="muted-text">
                {viewSemesterId ? 'No subjects added to this semester yet.' : 'Select a semester above to view and manage its subjects.'}
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}

export default AdminManagePage;

