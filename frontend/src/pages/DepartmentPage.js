import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';
import SemesterCard from '../components/SemesterCard';
import api, { isRequestCancelled } from '../services/api';

function DepartmentPage() {
  const { id } = useParams();

  const [department, setDepartment] = useState(null);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);

    api
      .get(`/departments/${id}`, {
        signal: controller.signal,
      })
      .then((res) => {
        const { semesters: embeddedSemesters, ...departmentData } = res.data;
        setDepartment(departmentData);
        setSemesters(embeddedSemesters || []);
      })
      .catch((error) => {
        if (!isRequestCancelled(error)) {
          console.error('Failed to load department:', error);
        }
      })
      .finally(() => {
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [id]);

  return (
    <div className="space-y-24">
      <Breadcrumbs
        items={[
          {
            label: 'Home',
            to: '/',
          },
          {
            label: department?.name || 'Department',
          },
        ]}
      />

      <section className="section-card compact-hero">
        <h1>{department?.name || 'Department'}</h1>

        <p className="muted-text">
          Choose a semester to explore subjects and study resources for this department.
        </p>
      </section>

      <section className="section-card">
        <h2 className="section-title">Semesters</h2>

        {loading ? (
          <div className="premium-semester-grid">
            {[1, 2, 3, 4].map((k) => (
              <div key={k} className="premium-semester-card skeleton-card">
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-subtitle" />
                <div className="skeleton-line skeleton-btn" />
              </div>
            ))}
          </div>
        ) : (
          <div className="premium-semester-grid">
            {semesters.length > 0 ? (
              semesters.map((semester) => (
                <SemesterCard
                  key={semester._id}
                  semester={semester}
                />
              ))
            ) : (
              <p className="muted-text">
                No semesters have been added for this department yet.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

export default DepartmentPage;