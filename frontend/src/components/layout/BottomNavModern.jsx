import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PropTypes from 'prop-types';

function TabIcon({ kind, active }) {
  const baseClass = `h-6 w-6 transition ${active ? 'text-teal-600' : 'text-slate-600'}`;
  
  const icons = {
    explore: (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="m8 14 4-8 4 8" />
      </svg>
    ),
    wishlist: (
      <svg className={baseClass} fill="currentColor" viewBox="0 0 24 24">
        <path d="m12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    ),
    trips: (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
      </svg>
    ),
    scan: (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 7v4a1 1 0 0 0 1 1h4M3 11h4m8-4v4a1 1 0 0 0 1 1h4m0-4h4m-4 0h4M3 3h4v4H3V3m8 0h4v4h-4V3m8 0h4v4h-4V3m-8 8h4v4h-4v-4m8 0h4v4h-4v-4" />
      </svg>
    ),
    profile: (
      <svg className={baseClass} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  };

  return icons[kind] || icons.explore;
}

TabIcon.propTypes = {
  kind: PropTypes.oneOf(['explore', 'wishlist', 'trips', 'scan', 'profile']),
  active: PropTypes.bool,
};

TabIcon.defaultProps = {
  kind: 'explore',
  active: false,
};

/**
 * Modern mobile-first bottom tab navigation.
 * Sticky on mobile, hidden on desktop (uses sidebar instead).
 */
export default function BottomNavModern() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/login') || location.pathname.startsWith('/signup')) {
    return null;
  }

  const tabs = [
    { label: 'Explore', kind: 'explore', path: '/', action: () => navigate('/') },
    { label: 'Wishlist', kind: 'wishlist', path: '/expenses', action: () => navigate('/expenses') },
    { label: 'Scan', kind: 'scan', path: '#scan', action: () => window.dispatchEvent(new CustomEvent('tourvision:scan-qr')) },
    { label: 'Trips', kind: 'trips', path: '/trip-planner', action: () => navigate('/trip-planner') },
    { label: 'Profile', kind: 'profile', path: isAuthenticated ? '/expenses' : '/login', action: () => navigate(isAuthenticated ? '/expenses' : '/login') },
  ];

  const currentPath = location.pathname.split('/')[1] ? `/${location.pathname.split('/')[1]}` : '/';
  
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white md:hidden">
      <div className="grid h-16 grid-cols-5 items-center px-2">
        {tabs.map((tab) => {
          const isActive = tab.path !== '#scan' && (currentPath === tab.path || (tab.path === '/' && currentPath === ''));
          
          return (
            <button
              key={tab.label}
              type="button"
              onClick={tab.action}
              className="flex flex-col items-center justify-center gap-1 py-2"
              aria-label={tab.label}
            >
              <TabIcon kind={tab.kind} active={isActive} />
              <span className={`text-[11px] font-semibold ${isActive ? 'text-teal-600' : 'text-slate-600'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
