import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SidebarItem from './SidebarItem';

function CompassIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="m10 14 4-4-1.4 4.8L8 16z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 21s6-5.5 6-11a6 6 0 1 0-12 0c0 5.5 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="m12 20-1.4-1.3C6.1 14.6 4 12.6 4 9.9A4 4 0 0 1 8.1 6 4.5 4.5 0 0 1 12 8.2 4.5 4.5 0 0 1 15.9 6 4 4 0 0 1 20 9.9c0 2.7-2.1 4.7-6.6 8.8Z" />
    </svg>
  );
}

function TripsIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M3 15.5h10.5L21 18l-1.8 2.5-7.3-2.5H8L5.5 20 4 18l2-2.5H3z" />
      <path d="M12 10.5 7.5 6.2l1.8-1.7L13 7V3h2v7.5l4.8-1.4 1 2-5.8 2.4H12z" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1H7a2 2 0 1 0 0 4h13v5a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z" />
      <path d="M20 8v4h-4a2 2 0 0 1 0-4z" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.25" />
      <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
    </svg>
  );
}

function CollapseIcon({ collapsed }) {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d={collapsed ? 'm10 7 5 5-5 5' : 'm14 7-5 5 5 5'} />
    </svg>
  );
}

CollapseIcon.propTypes = {
  collapsed: PropTypes.bool.isRequired
};

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

function LogoMark() {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 text-sm font-black text-white shadow-lg shadow-teal-500/20">
      TV
    </span>
  );
}

function getInitials(user) {
  const source = user?.name || user?.email || 'Traveler';
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

/**
 * Fixed desktop sidebar with a slide-in drawer on mobile.
 */
export default function Sidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse
}) {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const isAdminRoute = location.pathname.startsWith('/admin');

  const navItems = useMemo(
    () => [
      { icon: <CompassIcon />, isActive: location.pathname === '/', label: 'Explore', to: '/' },
      {
        icon: <PinIcon />,
        isActive: location.pathname === '/nearby' || location.pathname.startsWith('/place/'),
        label: 'Nearby',
        to: '/nearby'
      },
      { icon: <HeartIcon />, isActive: location.pathname === '/saved', label: 'Saved', to: '/saved' },
      { icon: <TripsIcon />, isActive: location.pathname === '/trip-planner', label: 'Trip Planner', to: '/trip-planner' },
      {
        icon: <WalletIcon />,
        isActive: location.pathname.startsWith('/trips') || location.pathname === '/expenses',
        label: 'Trips / Expenses',
        to: '/trips'
      },
      {
        icon: <ProfileIcon />,
        isActive: location.pathname === '/profile' || location.pathname === '/login' || location.pathname === '/signup',
        label: 'Profile',
        to: isAuthenticated ? '/profile' : '/login'
      }
    ],
    [isAuthenticated, location.pathname]
  );

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden={!isMobileOpen}
        className={[
          'fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-all duration-300 lg:hidden',
          isMobileOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        ].join(' ')}
        onClick={onCloseMobile}
      />

      <aside
        aria-label="Primary navigation"
        className={[
          'fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-slate-200/80 bg-white/95 px-4 py-5 shadow-xl shadow-slate-200/70 backdrop-blur transition-all duration-300',
          'w-[17.5rem] lg:z-30',
          isCollapsed ? 'lg:w-24' : 'lg:w-72',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className={[
              'flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2',
              isCollapsed ? 'lg:justify-center' : ''
            ].join(' ')}
          >
            <div className={isCollapsed ? 'lg:hidden' : ''}>
              <LogoMark />
            </div>
            <div
              className={[
                'min-w-0 transition-all duration-300',
                isCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
              ].join(' ')}
            >
              <p className="truncate font-heading text-lg font-bold text-slate-900">TourVision</p>
              <p className="truncate text-xs font-medium text-slate-500">Smart travel companion</p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all duration-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 lg:flex"
            >
              <CollapseIcon collapsed={isCollapsed} />
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-all duration-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2 lg:hidden"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <nav className="mt-8 flex-1 space-y-2 overflow-y-auto" role="navigation">
          {navItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              isActive={item.isActive}
              isCollapsed={isCollapsed}
              label={item.label}
              onClick={onCloseMobile}
              to={item.to}
            />
          ))}
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/90 p-3 shadow-sm transition-all duration-300">
          <div className={['flex items-center gap-3', isCollapsed ? 'lg:justify-center' : ''].join(' ')}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-bold text-white">
              {getInitials(user)}
            </div>
            <div
              className={[
                'min-w-0 flex-1 transition-all duration-300',
                isCollapsed ? 'lg:w-0 lg:opacity-0' : 'w-auto opacity-100'
              ].join(' ')}
            >
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name || user?.email || 'Guest traveler'}</p>
              <p className="truncate text-xs text-slate-500">
                {isAuthenticated ? 'Ready for your next stop' : 'Sign in to save your journey'}
              </p>
            </div>
          </div>

          <div className={['mt-3', isCollapsed ? 'lg:hidden' : ''].join(' ')}>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                onClick={onCloseMobile}
                className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

Sidebar.propTypes = {
  isCollapsed: PropTypes.bool,
  isMobileOpen: PropTypes.bool,
  onCloseMobile: PropTypes.func,
  onToggleCollapse: PropTypes.func
};

Sidebar.defaultProps = {
  isCollapsed: false,
  isMobileOpen: false,
  onCloseMobile: () => {},
  onToggleCollapse: () => {}
};
