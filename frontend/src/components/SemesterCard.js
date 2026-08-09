import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, GraduationCap, FileText } from 'lucide-react';

function SemesterCard({ semester }) {
  return (
    <motion.article
      className="premium-semester-card"
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <div className="premium-semester-card__top">
        <div className="premium-semester-card__icon" aria-hidden="true">
          <GraduationCap size={20} />
        </div>
        <div className="premium-semester-card__headline">
          <span className="premium-semester-card__eyebrow">Semester</span>
          <h3 className="premium-semester-card__title">{semester.name}</h3>
        </div>
      </div>

      <div className="premium-semester-card__meta">
        <div className="premium-semester-card__meta-item">
          <BookOpen size={16} />
          <span>{semester.totalSubjects || 0} Subjects</span>
        </div>
        <div className="premium-semester-card__meta-item">
          <FileText size={16} />
          <span>{semester.totalPdfs || 0} PDFs</span>
        </div>
      </div>

      <div className="premium-semester-card__divider" />

      <Link className="btn-primary premium-semester-card__button" to={`/semester/${semester._id}`}>
        <span>Open</span>
        <ArrowRight size={16} />
      </Link>
    </motion.article>
  );
}

export default SemesterCard;
