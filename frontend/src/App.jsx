import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import ChatWindow from './components/chat/ChatWindow';
import Loader from './components/common/Loader';
import ProgressBar from './components/common/ProgressBar';
import ProtectedRoute from './components/common/ProtectedRoute';
import { getActiveAlerts } from './api/alertApi';
import { extractArray } from './api/responseUtils';
import { useAuth } from './context/AuthContext';
import useSidebar from './hooks/useSidebar';
import { useSocket } from './hooks/useSocket';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const PlacePage = lazy(() => import('./pages/PlacePage'));
const QRHeritagePage = lazy(() => import('./pages/QRHeritagePage'));
const NearbyPage = lazy(() => import('./pages/NearbyPage'));
const TripPlannerPage = lazy(() => import('./pages/TripPlannerPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const TripDetailsPage = lazy(() => import('./pages/TripDetailsPage'));
const SavedPage = lazy(() => import('./pages/SavedPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));

/**
 * Error boundary used for high-value route surfaces such as place and trip planner pages.
 */
class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Surface the error in development without breaking the whole app shell.
    console.error(this.props.title, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-2xl rounded-[12px] border border-amber-400/30 bg-slate-900/80 p-6 text-slate-100 shadow-soft">
          <p className="font-heading text-xl text-amber-300">{this.props.title}</p>
          <p className="mt-2 text-sm text-slate-300">
            Something went wrong while loading this experience. Please refresh or try again in a moment.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

PageErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  title: PropTypes.string
};

PageErrorBoundary.defaultProps = {
  title: 'Page Error'
};

/**
 * Small suspense wrapper to keep route declarations readable.
 */
function LazyPage({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader label="Loading your next stop..." size="lg" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

LazyPage.propTypes = {
  children: PropTypes.node.isRequired
};

/**
 * Shared authenticated layout with navigation, progress feedback, and global chat access.
 */
function AppFrame() {
  const location = useLocation();
  const { user } = useAuth();
  const {
    closeMobileSidebar,
    isCollapsed,
    isMobileOpen,
    openMobileSidebar,
    toggleCollapse
  } = useSidebar();
  const [chatOpen, setChatOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [progressState, setProgressState] = useState({
    visible: false,
    progress: 0,
    label: 'Preparing AI guide...'
  });

  const routeMatch = useMemo(
    () => location.pathname.match(/^\/place\/([^/]+)/),
    [location.pathname]
  );
  const contextPlaceId = routeMatch?.[1] ?? null;
  const isAdminRoute = location.pathname.startsWith('/admin');

  useSocket({
    onProgress: (payload) => {
      setProgressState({
        visible: true,
        progress: Number(payload?.percent ?? payload?.progress ?? 0),
        label: payload?.status || payload?.label || 'Preparing AI guide...'
      });
    },
    onNarration: (payload) => {
      window.dispatchEvent(
        new CustomEvent('tourvision:narration', {
          detail: payload
        })
      );

      if (!chatOpen) {
        setChatOpen(true);
      }
    }
  });

  useEffect(() => {
    if (progressState.progress >= 100) {
      const timer = window.setTimeout(() => {
        setProgressState((current) => ({ ...current, visible: false }));
      }, 1800);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [progressState.progress]);

  useEffect(() => {
    const handleOpenChat = () => setChatOpen(true);
    window.addEventListener('tourvision:open-chat', handleOpenChat);
    return () => window.removeEventListener('tourvision:open-chat', handleOpenChat);
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isAdminRoute) {
      return undefined;
    }

    getActiveAlerts()
      .then((response) => {
        if (isMounted) {
          setAlerts(extractArray(response, ['alerts']).slice(0, 3));
        }
      })
      .catch(() => {
        if (isMounted) {
          setAlerts([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAdminRoute]);

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text-primary)]">
      {!isAdminRoute ? (
        <Sidebar
          isCollapsed={isCollapsed}
          isMobileOpen={isMobileOpen}
          onCloseMobile={closeMobileSidebar}
          onToggleCollapse={toggleCollapse}
        />
      ) : null}

      <div
        className={[
          'relative transition-all duration-300',
          isAdminRoute ? '' : 'lg:pl-16'
        ].join(' ')}
      >
        {!isAdminRoute ? (
          <Navbar onChatOpen={() => setChatOpen(true)} onMenuToggle={openMobileSidebar} user={user} />
        ) : null}

        {!isAdminRoute && alerts.length ? (
          <div className="mx-auto mt-4 max-w-6xl px-4">
            <div className="flex gap-3 overflow-x-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950">
              {alerts.map((alert) => (
                <div key={alert.id} className="min-w-64 flex-1">
                  <p className="text-sm font-extrabold">{alert.title}</p>
                  <p className="text-xs font-semibold text-amber-800">{alert.message}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <main className={`${isAdminRoute ? 'pb-24' : 'pb-24'} lg:pb-10`}>
          <Outlet />
        </main>
      </div>

      <div className="fixed left-1/2 top-20 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2">
        {progressState.visible ? (
          <ProgressBar label={progressState.label} progress={progressState.progress} />
        ) : null}
      </div>

      {!isAdminRoute ? (
        <button
          type="button"
          onClick={() => {
            if (contextPlaceId) {
              window.dispatchEvent(
                new CustomEvent('tourvision:start-ai-guide', {
                  detail: { placeId: contextPlaceId }
                })
              );
              return;
            }

            setChatOpen((open) => !open);
          }}
          className="fixed bottom-24 right-4 z-40 flex animate-pulse items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-purple-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-teal-500/30 transition-all duration-300 hover:-translate-y-1 hover:scale-[1.05] hover:shadow-xl hover:shadow-purple-500/30 active:scale-95 lg:bottom-8"
        >
          <span className="text-base">💬</span>
          AI Guide
        </button>
      ) : null}

      {!isAdminRoute ? (
        <ChatWindow
          contextPlaceId={contextPlaceId}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />
      ) : null}

      {!isAdminRoute ? <BottomNav /> : null}
    </div>
  );
}

/**
 * Root app router with lazy routes and route-specific error boundaries.
 */
export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <LazyPage>
            <Login />
          </LazyPage>
        }
      />
      <Route
        path="/admin/login"
        element={
          <LazyPage>
            <AdminLogin />
          </LazyPage>
        }
      />
      <Route
        path="/signup"
        element={
          <LazyPage>
            <Signup />
          </LazyPage>
        }
      />

      <Route element={<AppFrame />}>
        <Route
          index
          element={
            <LazyPage>
              <Home />
            </LazyPage>
          }
        />
        <Route
          path="/place/:id"
          element={
            <PageErrorBoundary title="Place Experience Error">
              <LazyPage>
                <PlacePage />
              </LazyPage>
            </PageErrorBoundary>
          }
        />
        <Route
          path="/qr-heritage/:id"
          element={
            <PageErrorBoundary title="QR Heritage Information Error">
              <LazyPage>
                <QRHeritagePage />
              </LazyPage>
            </PageErrorBoundary>
          }
        />
        <Route
          path="/nearby"
          element={
            <LazyPage>
              <NearbyPage />
            </LazyPage>
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/trip-planner"
            element={
              <PageErrorBoundary title="Trip Planner Error">
                <LazyPage>
                  <TripPlannerPage />
                </LazyPage>
              </PageErrorBoundary>
            }
          />
        </Route>
        <Route path="/expenses" element={<Navigate replace to="/trips" />} />
        <Route element={<ProtectedRoute />}>
          <Route
            path="/trips"
            element={
              <LazyPage>
                <TripsPage />
              </LazyPage>
            }
          />
          <Route
            path="/trips/:id"
            element={
              <LazyPage>
                <TripDetailsPage />
              </LazyPage>
            }
          />
          <Route
            path="/saved"
            element={
              <LazyPage>
                <SavedPage />
              </LazyPage>
            }
          />
          <Route
            path="/profile"
            element={
              <LazyPage>
                <ProfilePage />
              </LazyPage>
            }
          />
        </Route>

        <Route element={<ProtectedRoute requiredRole="admin" />}>
          <Route path="/admin" element={<Navigate replace to="/admin/dashboard" />} />
          <Route
            path="/admin/dashboard"
            element={
              <LazyPage>
                <AdminPage />
              </LazyPage>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}
