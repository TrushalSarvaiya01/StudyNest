import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Upload, Files, LogOut, Home, Building2, GraduationCap, BookOpen, User } from 'lucide-react';
import BrandLogo from './BrandLogo';

const publicItems = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Departments', to: '/#departments', icon: Building2 },
];

const adminItems = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
  { label: 'Upload Document', to: '/admin/upload', icon: Upload },
  { label: 'Manage Documents', to: '/admin/files', icon: Files },
  { label: 'Manage Departments', to: '/admin/manage?section=departments', icon: Building2 },
  { label: 'Manage Semesters', to: '/admin/manage?section=semesters', icon: GraduationCap },
  { label: 'Manage Subjects', to: '/admin/manage?section=subjects', icon: BookOpen },
];

function SidebarLink({ to, label, icon: Icon, onNavigate }) {
  const location = useLocation();
  const [pathWithHash, search] = to.split('?');
  const [pathname, hash = ''] = pathWithHash.split('#');
  const isSelected = location.pathname === pathname && location.search === (search ? `?${search}` : '') && location.hash === (hash ? `#${hash}` : '');

  return (
    <Link
      to={to}
      className={`sidebar-link ${isSelected ? 'active' : ''}`}
      onClick={onNavigate}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}

function SidebarContent({ auth, onLogout, onNavigate }) {
  const username = auth?.username || 'Admin';

  return (
    <>
      <div className="sidebar-brand">
        <BrandLogo compact />
        <div className="sidebar-brand-copy">
          <strong>StudyNest</strong>
          <span>Study Materials Portal</span>
        </div>
      </div>

      <div className="sidebar-divider" />

      <section className="sidebar-section">
        <div className="sidebar-section-title">Main</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {publicItems.map((item) => (
            <SidebarLink key={item.label} {...item} onNavigate={onNavigate} />
          ))}
        </nav>
      </section>

      <div className="sidebar-divider" />

      <section className="sidebar-section">
        <div className="sidebar-section-title">Admin</div>
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          {adminItems.map((item) => (
            <SidebarLink key={item.label} {...item} onNavigate={onNavigate} />
          ))}
        </nav>
      </section>

      <div className="sidebar-divider" />

      <section className="sidebar-section sidebar-account">
        <div className="sidebar-section-title">Account</div>
        <div className="sidebar-account-card">
          <div className="sidebar-account-meta">
            <User size={16} />
            <div>
              <strong>{username}</strong>
              <span>Admin</span>
            </div>
          </div>
          <button type="button" className="sidebar-logout" onClick={onLogout}>
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </section>
    </>
  );
}

function AdminSidebar({ auth, onLogout, onNavigate }) {
  return (
    <div className="admin-sidebar-desktop">
      <SidebarContent auth={auth} onLogout={onLogout} onNavigate={onNavigate} />
    </div>
  );
}

export default AdminSidebar;
