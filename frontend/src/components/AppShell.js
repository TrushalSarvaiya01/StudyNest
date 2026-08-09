import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from './Navbar';
import AdminSidebar from './AdminSidebar';

const DESKTOP_BREAKPOINT = '(min-width: 1024px)';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(DESKTOP_BREAKPOINT).matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT);

    const handleChange = (event) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }

    // Safari < 14 fallback
    mediaQuery.addListener(handleChange);

    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);

  return isDesktop;
}

function AppShell({
  auth,
  onLogout,
  children,
  isAdminLayout = false,
  showSidebar = false,
  mobileSidebarOpen,
  setMobileSidebarOpen,
}) {
  const isDesktop = useIsDesktop();

  /*
   * SIDEBAR BEHAVIOR
   *
   * ADMIN:
   * Desktop  -> fixed sidebar
   * Mobile   -> slide-in sidebar
   *
   * NORMAL / LOGGED OUT:
   * Desktop  -> NO sidebar and NO empty sidebar space
   * Mobile   -> slide-in public sidebar
   */

  // Only admin gets desktop sidebar layout space.
  const hasDesktopSidebar = isAdminLayout;

  // Public sidebar is mobile/tablet only.
  const hasMobileSidebar = showSidebar && !isDesktop;

  // Render sidebar:
  // Admin -> always
  // Public -> only below desktop breakpoint
  const shouldRenderSidebar =
    isAdminLayout || hasMobileSidebar;

  const sidebarOpen =
    isAdminLayout && isDesktop
      ? true
      : Boolean(mobileSidebarOpen);

  /*
   * Prevent background scrolling when mobile sidebar is open.
   */
  useEffect(() => {
    const shouldLockScroll =
      shouldRenderSidebar &&
      mobileSidebarOpen &&
      !isDesktop;

    document.body.style.overflow = shouldLockScroll
      ? 'hidden'
      : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [
    mobileSidebarOpen,
    isDesktop,
    shouldRenderSidebar,
  ]);

  /*
   * ESC closes mobile sidebar.
   */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === 'Escape' &&
        mobileSidebarOpen &&
        !isDesktop
      ) {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      );
    };
  }, [
    mobileSidebarOpen,
    setMobileSidebarOpen,
    isDesktop,
  ]);

  return (
    <div
      className={`
        app-shell
        ${isAdminLayout ? 'app-shell--admin' : ''}
        ${hasDesktopSidebar ? 'app-shell--with-sidebar' : ''}
      `}
    >
      <Navbar
        auth={auth}
        onLogout={onLogout}
        isAdminLayout={isAdminLayout}
        onMenuToggle={() =>
          setMobileSidebarOpen((prev) => !prev)
        }
        mobileSidebarOpen={mobileSidebarOpen}
      />

      {shouldRenderSidebar && (
        <>
          {/* Mobile / Tablet overlay */}
          {!isDesktop && (
            <motion.button
              type="button"
              className={`sidebar-overlay ${
                mobileSidebarOpen ? 'is-open' : ''
              }`}
              aria-label="Close sidebar"
              onClick={() =>
                setMobileSidebarOpen(false)
              }
              initial={false}
              animate={{
                opacity: mobileSidebarOpen ? 1 : 0,
              }}
              transition={{ duration: 0.2 }}
            />
          )}

          {/* Sidebar */}
          <motion.aside
            className={`
              admin-sidebar-shell
              ${mobileSidebarOpen ? 'is-open' : ''}
              ${
                isAdminLayout
                  ? 'admin-sidebar-shell--admin'
                  : 'admin-sidebar-shell--public'
              }
            `}
            initial={false}
            animate={{
              x: sidebarOpen ? 0 : '-100%',
            }}
            transition={{
              duration: isDesktop ? 0 : 0.25,
              ease: 'easeOut',
            }}
          >
            <AdminSidebar
              auth={auth}
              onLogout={onLogout}
              onNavigate={() =>
                setMobileSidebarOpen(false)
              }
            />
          </motion.aside>
        </>
      )}

      <main
        className={`
          app-main
          ${isAdminLayout ? 'app-main--admin' : ''}
          ${
            hasDesktopSidebar
              ? 'app-main--with-sidebar'
              : ''
          }
        `}
      >
        {children}
      </main>
    </div>
  );
}

export default AppShell;