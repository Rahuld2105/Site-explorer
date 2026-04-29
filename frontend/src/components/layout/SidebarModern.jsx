import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function MenuIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

/**
 * Modern responsive sidebar/drawer navigation.
 * Collapsible on desktop, slide drawer on mobile.
 */
export default function SidebarModern() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const navItems = [
    { label: 'Explore', icon: '🗺', path: '/', active: location.pathname === '/' },
    { label: 'Nearby', icon: '📍', path: '/nearby', active: location.pathname === '/nearby' },
    { label: 'Wishlist', icon: '❤️', path: '/expenses', active: location.pathname === '/expenses' },
    { label: 'My Trips', icon: '✈️', path: '/trip-planner', active: location.pathname === '/trip-planner' },
  ];

  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  // Hidden on desktop - button shows only on mobile
  return (
    <>
      {/* Mobile menu button (fixed top-left) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-16 z-30 flex md:hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
        aria-label="Menu"
      >
        {isOpen ? <CloseIcon /> : <MenuIcon />}
      </button>

      {/* Sidebar drawer */}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-0 z-20 h-screen w-64 border-r border-slate-200 bg-white shadow-lg transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar header */}
        <div className="border-b border-slate-200 px-6 py-6">
          <Link to="/" className="flex items-center gap-2 font-heading text-xl font-bold text-slate-900">
            <span>🌍</span>
            TourVision
          </Link>
        </div>

        {/* Navigation items */}
        <nav className="space-y-2 px-4 py-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left text-sm font-semibold transition ${
                item.active
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Auth section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-slate-50 p-4">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => handleNavigate('/expenses')}
              className="w-full text-left text-sm font-semibold text-slate-900 hover:text-teal-600"
            >
              Account Settings
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleNavigate('/login')}
                className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100"
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('/signup')}
                className="w-full rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Overlay when drawer is open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
