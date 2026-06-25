import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';
import QRScanner from '../qr/QRScanner';
import { parsePlaceIdFromImageResult } from '../../utils/qr';
import { openQrHeritagePage } from '../../utils/qrNavigation';

function TabIcon({ kind, active }) {
  const className = `h-5 w-5 transition duration-200 ${active ? 'text-teal-600' : 'text-slate-500'}`;
  const commonProps = { className, fill: 'none', stroke: 'currentColor', strokeWidth: '2', viewBox: '0 0 24 24' };

  switch (kind) {
    case 'home':
      return (
        <svg {...commonProps}>
          <path d="m3 10.5 9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </svg>
      );
    case 'map':
      return (
        <svg {...commonProps}>
          <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...commonProps}>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v1H7a2 2 0 1 0 0 4h13v5a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5z" />
          <path d="M20 8v4h-4a2 2 0 0 1 0-4z" />
        </svg>
      );
    case 'scan':
      return (
        <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
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
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
  }
}

TabIcon.propTypes = {
  kind: PropTypes.oneOf(['home', 'map', 'wallet', 'scan', 'profile']).isRequired,
  active: PropTypes.bool
};

TabIcon.defaultProps = {
  active: false
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [scannerOpen, setScannerOpen] = useState(false);

  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/login') || location.pathname.startsWith('/signup')) {
    return null;
  }

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

  const tabs = [
    { label: 'Home', kind: 'home', active: location.pathname === '/', action: () => navigate('/') },
    {
      label: 'Nearby',
      kind: 'map',
      active: location.pathname === '/nearby' || location.pathname.startsWith('/place/'),
      action: () => navigate('/nearby')
    },
    { label: 'Scanner', kind: 'scan', active: false, action: () => setScannerOpen(true), isCenter: true },
    {
      label: 'Trips',
      kind: 'wallet',
      active: location.pathname.startsWith('/trips') || location.pathname === '/trip-planner',
      action: () => navigate('/trips')
    },
    {
      label: 'Profile',
      kind: 'profile',
      active: location.pathname === '/profile',
      action: () => navigate(isAuthenticated ? '/profile' : '/login')
    }
  ];

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white pb-[max(env(safe-area-inset-bottom),0px)] shadow-[0_-12px_30px_rgba(15,23,42,0.10)] lg:hidden">
        <div className="grid h-[60px] grid-cols-5 items-center px-2">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={tab.action}
              aria-label={tab.label}
              aria-current={tab.active ? 'page' : undefined}
              className={[
                'relative flex h-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-semibold transition duration-200 active:scale-95',
                tab.active ? 'text-teal-600' : 'text-slate-500 hover:text-slate-900'
              ].join(' ')}
            >
              {tab.isCenter ? (
                <>
                  <span className="absolute -top-6 flex h-16 w-16 translate-y-[-20%] items-center justify-center rounded-full bg-gradient-to-br from-teal-400 via-cyan-500 to-violet-600 text-white shadow-xl shadow-teal-500/30 transition duration-200 hover:scale-105 active:scale-95">
                    <TabIcon kind={tab.kind} active />
                  </span>
                  <span className="mt-8 text-slate-700">Scan</span>
                </>
              ) : (
                <>
                  <TabIcon kind={tab.kind} active={tab.active} />
                  <span>{tab.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
      </nav>

      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleQrDetected}
        onImageDetected={handleImageDetected}
      />
    </>
  );
}
