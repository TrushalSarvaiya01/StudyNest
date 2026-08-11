import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookCopy, FolderOpen } from 'lucide-react';
import Breadcrumbs from '../components/Breadcrumbs';
import api, { isRequestCancelled } from '../services/api';

function SemesterPage() {
  const { id } = useParams();

  const [semester, setSemester] = useState(null);
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    api
      .get(`/semesters/${id}/subjects`, {
        signal: controller.signal,
      })
      .then((res) => {
        setSubjects(res.data);
      })
      .catch((error) => {
        if (isRequestCancelled(error)) {
          return;
        }

        console.error('Failed to load subjects:', error);
      });

    api
      .get(`/semesters/${id}`, {
        signal: controller.signal,
      })
      .then((res) => {
        setSemester(res.data);
      })
      .catch((error) => {
        if (isRequestCancelled(error)) {
          return;
        }

        console.error('Failed to load semester:', error);
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
          ...(semester?.departmentId?.name
            ? [
                {
                  label: semester.departmentId.name,
                  to: `/department/${semester.departmentId._id}`,
                },
              ]
            : []),
          {
            label: semester?.name || 'Semester',
          },
        ]}
      />

      <section className="section-card compact-hero">
        <h1>{semester?.name || 'Semester'}</h1>

        <p className="muted-text">
          Choose a subject to explore notes, assignments, books, and
          previous papers.
        </p>
      </section>

      <section className="section-card">
        <h2 className="section-title">Subjects</h2>

        <div className="subject-grid">
          {subjects.length > 0 ? (
            subjects.map((subject) => (
              <motion.article
                key={subject._id}
                className="subject-card"
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
              >
                <div className="subject-icon">
                  <BookCopy size={18} />
                </div>

                <h3>{subject.name}</h3>

                <p className="muted-text">
                  {subject.totalPdfs || 0} PDFs
                </p>

                <Link
                  className="btn-primary"
                  to={`/subject/${subject._id}`}
                >
                  <FolderOpen size={16} />
                  <span>Open</span>
                </Link>
              </motion.article>
            ))
          ) : (
            <p className="muted-text">
              No subjects have been added for this semester yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export default SemesterPage;