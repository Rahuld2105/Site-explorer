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
import { useAuth } from './context/AuthContext';
import useSidebar from './hooks/useSidebar';
import { useSocket } from './hooks/useSocket';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const PlacePage = lazy(() => import('./pages/PlacePage'));
const NearbyPage = lazy(() => import('./pages/NearbyPage'));
const TripPlannerPage = lazy(() => import('./pages/TripPlannerPage'));
const ExpenseTrackerPage = lazy(() => import('./pages/ExpenseTracker'));
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

  return (
    <div className="min-h-screen bg-[var(--c-bg)] text-[var(--c-text-primary)]">
      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileSidebar}
        onToggleCollapse={toggleCollapse}
      />

      <div
        className={[
          'relative transition-all duration-300',
          isAdminRoute ? '' : isCollapsed ? 'lg:pl-24' : 'lg:pl-72'
        ].join(' ')}
      >
        <Navbar onChatOpen={() => setChatOpen(true)} onMenuToggle={openMobileSidebar} user={user} />

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
          onClick={() => setChatOpen((open) => !open)}
          className="fixed bottom-24 right-4 z-40 flex items-center gap-2 rounded-full bg-[var(--c-text-primary)] px-5 py-3 text-sm font-bold text-white shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-hover)] lg:bottom-8"
        >
          <span className="text-base">💬</span>
          AI Guide
        </button>
      ) : null}

      <ChatWindow
        contextPlaceId={contextPlaceId}
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
      />

      <BottomNav />
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
          path="/nearby"
          element={
            <LazyPage>
              <NearbyPage />
            </LazyPage>
          }
        />
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
        <Route
          path="/expenses"
          element={
            <LazyPage>
              <ExpenseTrackerPage />
            </LazyPage>
          }
        />
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

        <Route element={<ProtectedRoute />}>
          <Route
            path="/admin"
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
