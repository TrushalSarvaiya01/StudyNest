import React, { useMemo, useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Home, Building2, LayoutDashboard, Upload, Files, GraduationCap, BookOpen, User, LogOut } from 'lucide-react';
import BrandLogo from './BrandLogo';

function Navbar({ auth, onLogout, onMenuToggle, mobileSidebarOpen, isAdminLayout = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isAdminLayout && typeof mobileSidebarOpen === 'boolean') {
      setMobileOpen(mobileSidebarOpen);
    }
  }, [isAdminLayout, mobileSidebarOpen]);

  const links = useMemo(() => {
    const base = [{ label: 'Home', to: '/' }];
    if (auth.token) {
      base.push({ label: 'Dashboard', to: '/admin' });
    }
    return base;
  }, [auth.token]);

  const closeMobile = () => setMobileOpen(false);

  const mobileItems = useMemo(() => {
    const main = [
      { label: 'Home', to: '/', icon: Home },
      { label: 'Departments', to: '/#departments', icon: Building2 },
    ];

    if (!auth.token) {
      return {
        title: 'Main',
        main,
        admin: [],
        account: null,
      };
    }

    return {
      title: 'Navigation',
      main,
      admin: [
        { label: 'Dashboard', to: '/admin', icon: LayoutDashboard },
        { label: 'Upload Document', to: '/admin/upload', icon: Upload },
        { label: 'Documents', to: '/admin/files', icon: Files },
        { label: 'Departments', to: '/admin/manage?section=departments', icon: Building2 },
        { label: 'Semesters', to: '/admin/manage?section=semesters', icon: GraduationCap },
        { label: 'Subjects', to: '/admin/manage?section=subjects', icon: BookOpen },
      ],
      account: {
        label: auth.username || 'Admin',
      },
    };
  }, [auth.token, auth.username]);

  return (
    <>
      <header className="topbar">
        <div className="container nav-inner">
          <Link className="brand" to="/" aria-label="StudyNest home">
            <BrandLogo />
          </Link>

          <nav className="nav-desktop" aria-label="Main navigation">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {link.label}
              </NavLink>
            ))}

            {auth.token ? (
              <button type="button" className="btn-ghost" onClick={onLogout}>
                Logout
              </button>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                Login
              </NavLink>
            )}
          </nav>

          <button
            className="menu-button"
            type="button"
            aria-label="Toggle navigation"
            aria-expanded={isAdminLayout ? mobileSidebarOpen : mobileOpen}
            onClick={() => {
              if (isAdminLayout) {
                onMenuToggle?.();
                return;
              }
              setMobileOpen((prev) => !prev);
            }}
          >
            {isAdminLayout ? (mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />) : (mobileOpen ? <X size={20} /> : <Menu size={20} />)}
          </button>
        </div>
      </header>

      {/* Rendered as a sibling of <header>, not inside it: .topbar uses
          backdrop-filter, which creates a CSS containing block for any
          position:fixed descendant. Nesting the drawer inside header would
          trap it inside the header's own (small) box instead of letting it
          cover the full viewport. */}
      <AnimatePresence>
        {mobileOpen && !isAdminLayout && (
          <>
            <motion.button
              type="button"
              className="mobile-drawer-backdrop"
              aria-label="Close navigation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
            />

            <motion.div
              className="mobile-drawer"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              role="dialog"
              aria-label="Navigation menu"
            >
              <div className="mobile-drawer-header">
                <div className="mobile-drawer-brand">
                  <BrandLogo compact />
                  <div>
                    <strong>StudyNest</strong>
                    <span>Study Materials Portal</span>
                  </div>
                </div>
                <button type="button" className="btn-ghost" onClick={closeMobile}>Close</button>
              </div>

              <div className="mobile-drawer-links">
                <div className="mobile-drawer-section">
                  <div className="sidebar-section-title">Main</div>
                  {mobileItems.main.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
                      onClick={closeMobile}
                    >
                      <link.icon size={16} />
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>

                {auth.token && (
                  <div className="mobile-drawer-section">
                    <div className="sidebar-section-title">Admin</div>
                    {mobileItems.admin.map((link) => (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        className={({ isActive }) => `drawer-link ${isActive ? 'active' : ''}`}
                        onClick={closeMobile}
                      >
                        <link.icon size={16} />
                        <span>{link.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}

                <div className="mobile-drawer-section">
                  <div className="sidebar-section-title">Account</div>
                  {auth.token ? (
                    <>
                      <div className="mobile-account-card">
                        <User size={16} />
                        <div>
                          <strong>{mobileItems.account.label}</strong>
                          <span>Admin</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary w-full"
                        onClick={() => {
                          onLogout();
                          closeMobile();
                        }}
                      >
                        <LogOut size={16} />
                        <span>Logout</span>
                      </button>
                    </>
                  ) : (
                    <NavLink to="/login" className="btn-primary w-full" onClick={closeMobile}>
                      Login
                    </NavLink>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
