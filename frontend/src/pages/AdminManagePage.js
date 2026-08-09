import React, { useEffect, useState } from 'react';
import { Pencil, PlusCircle, Save, Trash2, X } from 'lucide-react';
import api, { getAuthHeaders } from '../services/api';

function AdminManagePage({ auth, onLogout }) {
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [departmentName, setDepartmentName] = useState('');
  const [semesterName, setSemesterName] = useState('');
  const [subjectName, setSubjectName] = useState('');

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');

  const [message, setMessage] = useState('');

  const [editingSemester, setEditingSemester] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);

  const normalizeSemesterName = (value) => String(value || '').trim().toLowerCase();

  const semesterExistsInDepartment = (name, departmentId, excludeId = '') => {
    const normalizedName = normalizeSemesterName(name);
    const normalizedDepartmentId = String(departmentId || '');

    return semesters.some((semester) => {
      if (excludeId && String(semester._id) === String(excludeId)) {
        return false;
      }

      return (
        String(semester.departmentId) === normalizedDepartmentId &&
        normalizeSemesterName(semester.name) === normalizedName
      );
    });
  };

  const startSemesterEdit = (semester) => {
    setEditingSemester({
      id: semester._id,
      name: semester.name,
      departmentId: String(semester.departmentId || ''),
    });
  };

  const startSubjectEdit = (subject) => {
    setEditingSubject({
      id: subject._id,
      name: subject.name,
      semesterId: String(subject.semesterId || ''),
      departmentId: String(subject.departmentId || ''),
    });
  };

  useEffect(() => {
    fetchData();
  }, [auth.token]);

  useEffect(() => {
    if (!selectedSemester) {
      setSubjects([]);
      return;
    }
    api.get(`/semesters/${selectedSemester}/subjects`).then((res) => setSubjects(res.data));
  }, [selectedSemester]);

  async function fetchData() {
    try {
      const [deptRes, semRes] = await Promise.all([api.get('/departments'), api.get('/semesters')]);
      setDepartments(deptRes.data || []);
      setSemesters(semRes.data || []);

      if (deptRes.data && deptRes.data.length > 0) {
        setSelectedDepartment((prev) => prev || deptRes.data[0]._id);
      } else {
        setSelectedDepartment('');
      }

      if (semRes.data && semRes.data.length > 0) {
        setSelectedSemester((prev) => prev || semRes.data[0]._id);
      } else {
        setSelectedSemester('');
      }
    } catch (error) {
      console.error('Failed to fetch admin manage data', error);
    }
  }

  const addDepartment = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/department', { name: departmentName }, { headers: getAuthHeaders(auth.token) });
      setDepartmentName('');
      await fetchData();
      setMessage('Department added successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add department.');
    }
  };

  const addSemester = async (e) => {
    e.preventDefault();

    if (semesterExistsInDepartment(semesterName, selectedDepartment)) {
      setMessage('Semester already exists in this department.');
      return;
    }

    try {
      await api.post('/admin/semester', { name: semesterName, departmentId: selectedDepartment }, { headers: getAuthHeaders(auth.token) });
      setSemesterName('');
      await fetchData();
      setMessage('Semester added successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add semester.');
    }
  };

  const addSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/subject', { name: subjectName, semesterId: selectedSemester, departmentId: selectedDepartment }, { headers: getAuthHeaders(auth.token) });
      setSubjectName('');
      const res = await api.get(`/semesters/${selectedSemester}/subjects`);
      setSubjects(res.data);
      setMessage('Subject added successfully.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to add subject.');
    }
  };

  const saveSemesterEdit = async (semesterId) => {
    if (!editingSemester) {
      return;
    }

    if (semesterExistsInDepartment(editingSemester.name, editingSemester.departmentId, semesterId)) {
      setMessage('Semester already exists in this department.');
      return;
    }

    try {
      await api.put(
        `/admin/semester/${semesterId}`,
        { name: editingSemester.name, departmentId: editingSemester.departmentId },
        { headers: getAuthHeaders(auth.token) }
      );
      setEditingSemester(null);
      await fetchData();
      setMessage('Semester updated.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update semester.');
    }
  };

  const deleteSemester = async (semesterId) => {
    try {
      await api.delete(`/admin/semester/${semesterId}`, { headers: getAuthHeaders(auth.token) });
      await fetchData();
      setMessage('Semester deleted.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete semester.');
    }
  };

  const saveSubjectEdit = async (subjectId) => {
    if (!editingSubject) {
      return;
    }

    try {
      await api.put(
        `/admin/subject/${subjectId}`,
        {
          name: editingSubject.name,
          semesterId: editingSubject.semesterId,
          departmentId: editingSubject.departmentId,
        },
        { headers: getAuthHeaders(auth.token) }
      );
      setEditingSubject(null);
      const res = await api.get(`/semesters/${selectedSemester}/subjects`);
      setSubjects(res.data);
      setMessage('Subject updated.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to update subject.');
    }
  };

  const deleteSubject = async (subjectId) => {
    try {
      await api.delete(`/admin/subject/${subjectId}`, { headers: getAuthHeaders(auth.token) });
      const res = await api.get(`/semesters/${selectedSemester}/subjects`);
      setSubjects(res.data);
      setMessage('Subject deleted.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to delete subject.');
    }
  };

  return (
    <section className="admin-content admin-page-content">
      <section className="section-card">
        <h1>Manage Departments, Semesters & Subjects</h1>
        <p className="muted-text">Add, edit, and organize your academic structure.</p>

          <div className="manage-grid">
            <form className="form-grid" onSubmit={addDepartment}>
              <h3>Add Department</h3>
              <input value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} placeholder="Department name" required />
              <button className="btn-primary" type="submit"><PlusCircle size={16} /> Add department</button>
            </form>

            <form className="form-grid" onSubmit={addSemester}>
              <h3>Add Semester</h3>
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} required>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              <input value={semesterName} onChange={(e) => setSemesterName(e.target.value)} placeholder="Semester name" required />
              <button className="btn-primary" type="submit"><PlusCircle size={16} /> Add semester</button>
            </form>

            <form className="form-grid" onSubmit={addSubject}>
              <h3>Add Subject</h3>
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)} required>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
              </select>
              <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} required>
                <option value="">Select semester</option>
                {semesters.filter((s) => String(s.departmentId) === String(selectedDepartment)).map((semester) => (
                  <option key={semester._id} value={semester._id}>{semester.name}</option>
                ))}
              </select>
              <input value={subjectName} onChange={(e) => setSubjectName(e.target.value)} placeholder="Subject name" required />
              <button className="btn-primary" type="submit"><PlusCircle size={16} /> Add subject</button>
            </form>
          </div>

          {!departments.length && <p className="muted-text">No departments exist yet. Create the first one to begin.</p>}

          {message && <p className="form-message">{message}</p>}
        </section>

        <section className="section-card">
          <h2 className="section-title">Current Semesters</h2>
          <div className="stack-16">
            {semesters.map((semester) => (
              <article className="list-item" key={semester._id}>
                {editingSemester?.id === semester._id ? (
                  <input
                    value={editingSemester.name}
                    onChange={(e) => setEditingSemester({ ...editingSemester, name: e.target.value })}
                  />
                ) : (
                  <strong>{semester.name}</strong>
                )}

                <div className="card-actions wrap">
                  {editingSemester?.id === semester._id ? (
                    <>
                      <button type="button" className="btn-primary" onClick={() => saveSemesterEdit(semester._id)}><Save size={16} /> Save</button>
                      <button type="button" className="btn-secondary" onClick={() => setEditingSemester(null)}><X size={16} /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => startSemesterEdit(semester)}><Pencil size={16} /> Edit</button>
                      <button type="button" className="btn-danger" onClick={() => deleteSemester(semester._id)}><Trash2 size={16} /> Delete</button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section-card">
          <h2 className="section-title">Current Subjects</h2>
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
                      <button type="button" className="btn-primary" onClick={() => saveSubjectEdit(subject._id)}><Save size={16} /> Save</button>
                      <button type="button" className="btn-secondary" onClick={() => setEditingSubject(null)}><X size={16} /> Cancel</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn-secondary" onClick={() => startSubjectEdit(subject)}><Pencil size={16} /> Edit</button>
                      <button type="button" className="btn-danger" onClick={() => deleteSubject(subject._id)}><Trash2 size={16} /> Delete</button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
      </section>
    </section>
  );
}

export default AdminManagePage;
