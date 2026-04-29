import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function TabIcon({ kind, active }) {
  const className = `h-5 w-5 ${active ? 'text-[var(--c-primary)]' : 'text-[var(--c-text-secondary)]'}`;
  const commonProps = { className, fill: 'none', stroke: 'currentColor', strokeWidth: '1.8', viewBox: '0 0 24 24' };

  switch (kind) {
    case 'explore':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8" />
          <path d="m10 14 4-4-1.4 4.8L8 16z" />
        </svg>
      );
    case 'wishlist':
      return (
        <svg {...commonProps}>
          <path d="m12 20-1.4-1.3C6.1 14.6 4 12.6 4 9.9A4 4 0 0 1 8.1 6 4.5 4.5 0 0 1 12 8.2 4.5 4.5 0 0 1 15.9 6 4 4 0 0 1 20 9.9c0 2.7-2.1 4.7-6.6 8.8Z" />
        </svg>
      );
    case 'trips':
      return (
        <svg {...commonProps}>
          <path d="M3 12h18M6 7h12M8 17h8" />
        </svg>
      );
    case 'inbox':
      return (
        <svg {...commonProps}>
          <path d="M5 7h14v10H5z" />
          <path d="M5 15h4l1.5 2h3L15 15h4" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="9" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
  }
}

/**
 * Airbnb-inspired mobile tab bar with a raised central scan action.
 */
export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const tabs = [
    { label: 'Explore', kind: 'explore', active: location.pathname === '/' || location.pathname === '/nearby', action: () => navigate('/nearby') },
    { label: 'Wishlists', kind: 'wishlist', active: location.pathname === '/saved', action: () => navigate('/saved') },
    { label: 'Trips', kind: 'trips', active: location.pathname.startsWith('/trips') || location.pathname === '/expenses', action: () => navigate('/trips') },
    { label: 'Inbox', kind: 'inbox', active: false, action: () => window.dispatchEvent(new CustomEvent('tourvision:open-chat')) },
    { label: 'Profile', kind: 'profile', active: location.pathname === '/profile' || location.pathname === '/login' || location.pathname === '/signup', action: () => navigate(isAuthenticated ? '/profile' : '/login') }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--c-border)] bg-white pb-[max(env(safe-area-inset-bottom),0px)] lg:hidden">
      <div className="grid h-16 grid-cols-5 items-center">
        {tabs.map((tab, index) => (
          <button
            key={tab.label}
            type="button"
            onClick={tab.action}
            className="relative flex h-full flex-col items-center justify-center gap-1"
          >
            {index === 2 ? (
              <span className="absolute -top-5 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--c-primary)] text-white shadow-[var(--shadow-fab)]">
                <span className="text-lg">📷</span>
              </span>
            ) : (
              <TabIcon kind={tab.kind} active={tab.active} />
            )}
            <span className={`text-[11px] font-semibold ${tab.active ? 'text-[var(--c-primary)]' : 'text-[var(--c-text-secondary)]'}`}>
              {index === 2 ? 'Scan' : tab.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
