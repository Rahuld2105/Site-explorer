import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function SearchIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

/**
 * Modern mobile-first navbar with Airbnb-inspired design.
 * Features sticky positioning, search pill, and profile menu.
 */
export default function NavbarModern({ onChatOpen, user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  if (isAdminRoute) {
    return (
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
            <span>🌍</span>
            <span className="hidden sm:inline">TourVision Admin</span>
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={onChatOpen}>
              Help
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-40 border-b border-slate-200 bg-white transition-shadow duration-300 ${isScrolled ? 'shadow-sm' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between gap-3 md:h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <span className="text-2xl">🌍</span>
          <span className="hidden font-heading font-bold text-slate-900 sm:inline">TourVision</span>
        </Link>

        {/* Search bar - hidden on mobile */}
        <button
          type="button"
          onClick={() => navigate('/nearby')}
          className="hidden min-w-[280px] items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-left hover:shadow-sm md:flex flex-shrink-0"
        >
          <span className="flex-1 text-sm text-slate-500">Search destinations...</span>
          <SearchIcon />
        </button>

        {/* Right section */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Mobile search button */}
          <button
            type="button"
            onClick={() => navigate('/nearby')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Search"
          >
            <SearchIcon />
          </button>

          {/* Notifications */}
          <button type="button" className="hidden h-10 w-10 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 md:flex" aria-label="Notifications">
            <BellIcon />
          </button>

          {/* Profile menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-10 items-center gap-2 rounded-full border border-slate-200 px-3 hover:shadow-sm"
              aria-label="Menu"
            >
              <span className="text-lg">👤</span>
              <span className="hidden text-sm font-semibold text-slate-900 md:inline">Menu</span>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 min-w-48 rounded-xl border border-slate-200 bg-white shadow-lg">
                {isAuthenticated ? (
                  <>
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900">{user?.name || user?.email || 'Traveler'}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/trip-planner');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      My Trips
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/expenses');
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Wishlist
                    </button>
                    <button type="button" onClick={onChatOpen} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                      Help & Support
                    </button>
                    <div className="border-t border-slate-200 p-2">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setMenuOpen(false);
                        }}
                        className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { navigate('/login'); setMenuOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                      Sign in
                    </button>
                    <button type="button" onClick={() => { navigate('/signup'); setMenuOpen(false); }} className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                      Sign up
                    </button>
                    <div className="border-t border-slate-200 p-2">
                      <button type="button" onClick={onChatOpen} className="w-full rounded-lg px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        Help & Support
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

NavbarModern.propTypes = {
  onChatOpen: PropTypes.func,
  user: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string
  })
};

NavbarModern.defaultProps = {
  onChatOpen: () => {},
  user: null
};
