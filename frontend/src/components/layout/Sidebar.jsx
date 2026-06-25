import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import QRScanner from '../qr/QRScanner';
import { parsePlaceIdFromImageResult } from '../../utils/qr';
import { openQrHeritagePage } from '../../utils/qrNavigation';
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

function SparkIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M12 3l1.6 5.3L19 10l-5.4 1.7L12 17l-1.6-5.3L5 10l5.4-1.7z" />
      <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
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

function PlannerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M7 3v3M17 3v3" />
      <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      <path d="M3 10h18" />
      <path d="M7.5 15.5h2.2l2.1-2.5 2.2 4 2.5-3H18" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
      <path d="M4 7V4h3" />
      <path d="M17 4h3v3" />
      <path d="M20 17v3h-3" />
      <path d="M7 20H4v-3" />
      <path d="M8 8h3v3H8z" />
      <path d="M13 8h3" />
      <path d="M13 12h3v4h-4" />
      <path d="M8 13v3h2" />
    </svg>
  );
}

function ActionSidebarItem({ icon, isCollapsed, label, onClick }) {
  return (
    <div className="group relative flex justify-center">
      <button
        type="button"
        onClick={onClick}
        aria-label={isCollapsed ? label : undefined}
        title={isCollapsed ? label : undefined}
        className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/55 text-sm font-semibold text-slate-600 transition-colors duration-200 hover:bg-white hover:text-teal-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2"
      >
        <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300">
          {icon}
        </span>
      </button>
      {isCollapsed ? (
        <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
          {label}
        </span>
      ) : null}
    </div>
  );
}

ActionSidebarItem.propTypes = {
  icon: PropTypes.node.isRequired,
  isCollapsed: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired
};

ActionSidebarItem.defaultProps = {
  isCollapsed: false
};

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
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);
  const isAdminRoute = location.pathname.startsWith('/admin');

  const navItems = useMemo(
    () => [
      { icon: <CompassIcon />, isActive: location.pathname === '/', label: 'Home', to: '/' },
      {
        icon: <PinIcon />,
        isActive: location.pathname === '/nearby' || location.pathname.startsWith('/place/'),
        label: 'Nearby',
        to: '/nearby'
      },
      {
        icon: <PlannerIcon />,
        isActive: location.pathname === '/trip-planner',
        label: 'Trip Planner',
        to: '/trip-planner'
      },
      {
        icon: <TripsIcon />,
        isActive: location.pathname.startsWith('/trips'),
        label: 'My Trips',
        to: '/trips'
      }
    ],
    [location.pathname]
  );

  const handleQrDetected = async (decodedText) => {
    const opened = await openQrHeritagePage(decodedText, navigate);

    if (opened) {
      setScannerOpen(false);
    }
  };

  const handleImageDetected = async (result) => {
    const placeId = parsePlaceIdFromImageResult(result);

    if (!placeId) {
      toast.error('Unable to identify this image');
      return;
    }

    setScannerOpen(false);
    toast.success(`CNN matched ${result?.name || 'a landmark'}.`);
    navigate(`/place/${placeId}`);
  };

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden={!isMobileOpen}
        className={[
          'hidden'
        ].join(' ')}
        onClick={onCloseMobile}
      />

      <aside
        aria-label="Primary navigation"
        className={[
          'fixed left-0 top-0 z-50 hidden h-screen flex-col border-r border-slate-200/60 bg-white/70 px-3 py-5 shadow-lg shadow-slate-200/50 backdrop-blur-md transition-all duration-300 lg:flex',
          'w-[17.5rem] lg:z-30 lg:w-16 lg:px-2',
          'lg:translate-x-0'
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className={[
              'flex min-w-0 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2',
              'lg:justify-center'
            ].join(' ')}
          >
            <div className="shrink-0">
              <LogoMark />
            </div>
            <div
              className={[
                'min-w-0 transition-all duration-300',
                'lg:hidden'
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
              className="hidden"
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

        <nav className="mt-10 flex flex-1 flex-col items-center gap-4 overflow-y-auto" role="navigation">
          {navItems.map((item) => (
            <SidebarItem
              key={item.label}
              icon={item.icon}
              isActive={item.isActive}
              isCollapsed
              label={item.label}
              onClick={onCloseMobile}
              to={item.to}
            />
          ))}
          <ActionSidebarItem
            icon={<SparkIcon />}
            isCollapsed
            label="AI Guide"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('tourvision:open-chat'));
              onCloseMobile();
            }}
          />
          <ActionSidebarItem
            icon={<QrIcon />}
            isCollapsed
            label="Scanner"
            onClick={() => {
              setScannerOpen(true);
              onCloseMobile();
            }}
          />
        </nav>

        <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/60 p-2 shadow-sm transition-all duration-300 lg:flex lg:justify-center">
          <div className="flex items-center gap-3 lg:justify-center">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-indigo-600 text-sm font-bold text-white shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-[1.05]">
              {getInitials(user)}
            </div>
            <div
              className={[
                'min-w-0 flex-1 transition-all duration-300',
                'lg:hidden'
              ].join(' ')}
            >
              <p className="truncate text-sm font-semibold text-slate-900">{user?.name || user?.email || 'Guest traveler'}</p>
              <p className="truncate text-xs text-slate-500">
                {isAuthenticated ? 'Ready for your next stop' : 'Sign in to save your journey'}
              </p>
            </div>
          </div>

          <div className="mt-3 lg:hidden">
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
      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleQrDetected}
        onImageDetected={handleImageDetected}
      />
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
