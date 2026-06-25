import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  approveContent,
  createAlert,
  createPlace,
  deleteAlert,
  deleteFeedback,
  deleteMedia,
  deletePlace,
  deleteTrip,
  deleteUser,
  generateQr,
  getAdminAnalytics,
  getAdminFeedback,
  getAdminOverview,
  getAdminPlaces,
  getAdminTrips,
  getAlerts,
  getMedia,
  getPendingContent,
  getSettings,
  getUserTrips,
  getUsers,
  rejectContent,
  updateAiGuide,
  updatePlace,
  updateSettings,
  updateUser,
  uploadAdminMedia
} from '../api/adminApi';
import { extractArray, extractData, extractMessage } from '../api/responseUtils';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  'Dashboard',
  'Places',
  'Users',
  'Trips',
  'AI Guide',
  'QR Codes',
  'Analytics',
  'CMS',
  'Alerts',
  'Feedback',
  'Settings'
];

const EMPTY_PLACE_FORM = {
  name: '',
  description: '',
  location_name: '',
  city: '',
  latitude: '',
  longitude: '',
  images: '',
  videos: '',
  category: 'Fort'
};

const CHART_COLORS = ['#0f766e', '#2563eb', '#f97316', '#7c3aed', '#0891b2'];

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString() : 'Not recorded';
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function getQrImageUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(payload || '')}`;
}

function AdminSection({ active, children, name }) {
  if (active !== name) {
    return null;
  }

  return <div className="admin-section space-y-6">{children}</div>;
}

function StatCard({ label, value, detail }) {
  return (
    <article className="admin-stat-card">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-3 font-heading text-3xl font-extrabold text-slate-950">{value ?? 0}</p>
      <p className="mt-1 text-sm font-semibold text-slate-500">{detail}</p>
    </article>
  );
}

function Field({ as = 'input', label, ...props }) {
  const Component = as;
  return (
    <label className="input-wrap">
      <span className="input-label">{label}</span>
      <Component className="field" {...props} />
    </label>
  );
}

function AdminTable({ children, columns, empty }) {
  return (
    <div className="admin-table-wrap">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>{columns.map((column) => <th key={column} className="px-5 py-4">{column}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
      {empty ? <div className="px-5 py-8 text-center text-sm font-semibold text-slate-500">{empty}</div> : null}
    </div>
  );
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState('Dashboard');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [overview, setOverview] = useState({ cards: {}, recent_activity: [] });
  const [analytics, setAnalytics] = useState({});
  const [users, setUsers] = useState([]);
  const [places, setPlaces] = useState([]);
  const [trips, setTrips] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [media, setMedia] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [pendingContent, setPendingContent] = useState([]);
  const [settings, setSettingsState] = useState({});
  const [userSearch, setUserSearch] = useState('');
  const [userTripsPanel, setUserTripsPanel] = useState({ user: null, trips: [] });
  const [selectedPlaceId, setSelectedPlaceId] = useState('');
  const [editingPlaceId, setEditingPlaceId] = useState('');
  const [placeForm, setPlaceForm] = useState(EMPTY_PLACE_FORM);
  const [alertForm, setAlertForm] = useState({ title: '', message: '', type: 'weather', severity: 'info' });

  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) || places[0],
    [places, selectedPlaceId]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadAdminData() {
      setLoading(true);
      try {
        const [
          overviewResponse,
          analyticsResponse,
          usersResponse,
          placesResponse,
          tripsResponse,
          feedbackResponse,
          mediaResponse,
          alertsResponse,
          contentResponse,
          settingsResponse
        ] = await Promise.all([
          getAdminOverview(),
          getAdminAnalytics(),
          getUsers(),
          getAdminPlaces(),
          getAdminTrips(),
          getAdminFeedback(),
          getMedia(),
          getAlerts(),
          getPendingContent(),
          getSettings()
        ]);

        if (!isMounted) {
          return;
        }

        setOverview(extractData(overviewResponse));
        setAnalytics(extractData(analyticsResponse));
        setUsers(extractArray(usersResponse, ['users']));
        setPlaces(extractArray(placesResponse, ['places']));
        setTrips(extractArray(tripsResponse, ['trips']));
        setFeedback(extractArray(feedbackResponse, ['feedback']));
        setMedia(extractArray(mediaResponse, ['media']));
        setAlerts(extractArray(alertsResponse, ['alerts']));
        setPendingContent(extractArray(contentResponse, ['items']));
        setSettingsState(extractData(settingsResponse)?.settings || {});
      } catch (error) {
        if (isMounted) {
          toast.error(extractMessage(error, 'Unable to load admin dashboard.'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAdminData();
    return () => {
      isMounted = false;
    };
  }, []);

  const cards = overview?.cards || {};
  const activeUsers = users.filter((item) => item.active).length;
  const criticalAlerts = alerts.filter((item) => item.severity === 'critical').length;
  const pendingReviews = pendingContent.length + feedback.length;
  const filteredUsers = users.filter((item) =>
    `${item.name || ''} ${item.email || ''}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const refreshPlaces = async () => {
    const response = await getAdminPlaces();
    setPlaces(extractArray(response, ['places']));
  };

  const handlePlaceSubmit = async (event) => {
    event.preventDefault();
    setSaving('place');
    try {
      if (editingPlaceId) {
        await updatePlace(editingPlaceId, placeForm);
      } else {
        await createPlace(placeForm);
      }
      setPlaceForm(EMPTY_PLACE_FORM);
      setEditingPlaceId('');
      await refreshPlaces();
      toast.success(editingPlaceId ? 'Place updated.' : 'Place added.');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to save place.'));
    } finally {
      setSaving('');
    }
  };

  const startPlaceEdit = (place) => {
    setEditingPlaceId(place.id);
    setPlaceForm({
      name: place.name || '',
      description: place.description || '',
      location_name: place.location_name || '',
      city: place.city || '',
      latitude: place.latitude || '',
      longitude: place.longitude || '',
      images: asList(place.images).join(', '),
      videos: asList(place.videos).join(', '),
      category: place.category || 'Fort'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showUserTrips = async (managedUser) => {
    setSaving(`user-trips-${managedUser.id}`);
    try {
      const response = await getUserTrips(managedUser.id);
      setUserTripsPanel({ user: managedUser, trips: extractArray(response, ['trips']) });
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to load user trips.'));
    } finally {
      setSaving('');
    }
  };

  const handleAiSave = async () => {
    if (!selectedPlace) {
      return;
    }

    setSaving('ai-guide');
    try {
      await updateAiGuide(selectedPlace.id, {
        summary: selectedPlace.ai_content?.summary || selectedPlace.description || '',
        description: selectedPlace.ai_content?.description || selectedPlace.description || '',
        sections: selectedPlace.ai_sections || []
      });
      await refreshPlaces();
      toast.success('AI guide content updated.');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to update AI guide.'));
    } finally {
      setSaving('');
    }
  };

  const mutatePlaceSection = (sectionIndex, key, value) => {
    setPlaces((current) =>
      current.map((place) => {
        if (place.id !== selectedPlace.id) {
          return place;
        }

        const sections = asList(place.ai_sections).map((section, index) =>
          index === sectionIndex ? { ...section, [key]: value } : section
        );

        return { ...place, ai_sections: sections };
      })
    );
  };

  const addAiSection = () => {
    if (!selectedPlace) {
      return;
    }

    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? {
              ...place,
              ai_sections: [
                ...asList(place.ai_sections),
                { title: 'New Section', body: '', order: asList(place.ai_sections).length }
              ]
            }
          : place
      )
    );
  };

  const removeAiSection = (indexToRemove) => {
    setPlaces((current) =>
      current.map((place) =>
        place.id === selectedPlace.id
          ? { ...place, ai_sections: asList(place.ai_sections).filter((_, index) => index !== indexToRemove) }
          : place
      )
    );
  };

  const handleAlertSubmit = async (event) => {
    event.preventDefault();
    setSaving('alert');
    try {
      const response = await createAlert(alertForm);
      setAlerts((current) => [extractData(response).alert, ...current]);
      setAlertForm({ title: '', message: '', type: 'weather', severity: 'info' });
      toast.success('Alert published.');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to create alert.'));
    } finally {
      setSaving('');
    }
  };

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const formData = new FormData();
    files.forEach((file) => formData.append('media', file));
    setSaving('media');

    try {
      await uploadAdminMedia(formData);
      const response = await getMedia();
      setMedia(extractArray(response, ['media']));
      toast.success('Media uploaded.');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to upload media.'));
    } finally {
      event.target.value = '';
      setSaving('');
    }
  };

  const saveSettings = async () => {
    setSaving('settings');
    try {
      const response = await updateSettings(settings);
      setSettingsState(extractData(response)?.settings || settings);
      toast.success('Settings saved.');
    } catch (error) {
      toast.error(extractMessage(error, 'Unable to save settings.'));
    } finally {
      setSaving('');
    }
  };

  if (user?.role && user.role !== 'admin') {
    return (
      <div className="container py-16">
        <div className="rounded-lg border border-slate-200 bg-white p-8">
          <h1 className="text-3xl">Admin access required</h1>
          <p className="mt-3 text-slate-600">Your account is authenticated, but this area is reserved for administrators.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader label="Loading admin dashboard..." size="lg" />
      </div>
    );
  }

  return (
    <div className="admin-dashboard min-h-screen text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="admin-sidebar">
          <div className="sticky top-0 p-5">
            <div className="admin-brand-card">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-200">TourVision</p>
              <h1 className="mt-1 text-2xl font-extrabold">Admin</h1>
              <p className="mt-2 text-sm text-slate-300">{user?.name || user?.email}</p>
            </div>
            <nav className="admin-nav mt-5 grid grid-cols-2 gap-2 lg:grid-cols-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setActive(item)}
                  className={`admin-nav-button ${
                    active === item ? 'admin-nav-button-active' : ''
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
            <button type="button" className="admin-logout" onClick={logout}>
              Logout
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <header className="admin-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-700">Tourism Management Platform</p>
              <h2 className="mt-1 text-3xl font-extrabold sm:text-4xl">{active}</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-green">{activeUsers} active users</span>
              <span className="badge badge-amber">{criticalAlerts} critical alerts</span>
              <span className="badge badge-teal">{new Date().toLocaleString()}</span>
            </div>
          </header>

          <AdminSection active={active} name="Dashboard">
            <section className="admin-hero-panel">
              <div>
                <span className="badge badge-teal">Operations live</span>
                <h3>Command center overview</h3>
                <p>Monitor travelers, heritage places, trips, AI guide content, alerts, feedback, media, and QR performance from one workspace.</p>
              </div>
              <div className="admin-hero-metrics">
                <span><strong>{places.length}</strong> Places</span>
                <span><strong>{trips.length}</strong> Trips</span>
                <span><strong>{pendingReviews}</strong> Reviews</span>
              </div>
            </section>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Users" value={cards.total_users} detail="Registered accounts" />
              <StatCard label="Total Trips Created" value={cards.total_trips} detail={`${cards.active_trips || 0} active trips`} />
              <StatCard label="Completed Trips" value={cards.completed_trips} detail="Finished itineraries" />
              <StatCard label="Total Places" value={cards.total_places} detail={`${cards.qr_scans || 0} QR scans`} />
              <StatCard label="AI Guide Usage" value={cards.ai_guide_usage} detail="Chat sessions" />
              <StatCard label="Expenses Recorded" value={cards.total_expenses_recorded} detail={`INR ${cards.expense_value || 0}`} />
              <StatCard label="Feedback" value={feedback.length} detail="Ratings and reviews" />
              <StatCard label="Media Assets" value={media.length} detail="Uploaded files" />
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-extrabold">Recent Activity</h3>
              <div className="mt-4 divide-y divide-slate-100">
                {asList(overview.recent_activity).map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="text-sm text-slate-500">{item.description}</p>
                    </div>
                    <span className="badge">{formatDate(item.date)}</span>
                  </div>
                ))}
              </div>
            </section>
          </AdminSection>

          <AdminSection active={active} name="Users">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <Field label="Search users" placeholder="Search by name or email" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} />
            </div>
            <AdminTable columns={['Name', 'Email', 'Role', 'Status', 'Trips', 'Joined', 'Last Activity', 'Actions']} empty={!filteredUsers.length ? 'No users found.' : ''}>
              {filteredUsers.map((managedUser) => (
                <tr key={managedUser.id}>
                  <td className="px-5 py-4 font-bold">{managedUser.name || 'Unnamed'}</td>
                  <td className="px-5 py-4">{managedUser.email}</td>
                  <td className="px-5 py-4 capitalize">{managedUser.role || 'user'}</td>
                  <td className="px-5 py-4"><span className={`badge ${managedUser.active ? 'badge-green' : 'badge-neutral'}`}>{managedUser.active ? 'Active' : 'Suspended'}</span></td>
                  <td className="px-5 py-4">{managedUser.trips_created || 0}</td>
                  <td className="px-5 py-4">{formatDate(managedUser.created_at)}</td>
                  <td className="px-5 py-4">{formatDate(managedUser.last_activity)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={async () => {
                        const response = await updateUser(managedUser.id, { active: !managedUser.active });
                        setUsers((current) => current.map((item) => (item.id === managedUser.id ? extractData(response).user : item)));
                      }}>
                        {managedUser.active ? 'Suspend' : 'Activate'}
                      </button>
                      <button type="button" className="btn-outline btn-sm" onClick={() => showUserTrips(managedUser)}>
                        View Trips
                      </button>
                      <button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => {
                        await deleteUser(managedUser.id);
                        setUsers((current) => current.filter((item) => item.id !== managedUser.id));
                      }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
            {userTripsPanel.user ? (
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-extrabold">{userTripsPanel.user.name || userTripsPanel.user.email} trips</h3>
                    <p className="text-sm font-semibold text-slate-500">{userTripsPanel.trips.length} trip records</p>
                  </div>
                  <button type="button" className="btn-outline btn-sm" onClick={() => setUserTripsPanel({ user: null, trips: [] })}>
                    Close
                  </button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {userTripsPanel.trips.map((trip) => (
                    <article key={trip.id} className="rounded-lg border border-slate-200 p-4">
                      <p className="font-bold">{asList(trip.destinations).map((item) => item.name).join(' -> ') || 'Trip'}</p>
                      <p className="mt-1 text-sm text-slate-500">{trip.duration} days · {trip.status}</p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </AdminSection>

          <AdminSection active={active} name="Places">
            <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2" onSubmit={handlePlaceSubmit}>
              <div className="lg:col-span-2">
                <h3 className="text-xl font-extrabold">{editingPlaceId ? 'Edit Place' : 'Add Place'}</h3>
              </div>
              <Field label="Name" value={placeForm.name} onChange={(event) => setPlaceForm((current) => ({ ...current, name: event.target.value }))} required />
              <Field label="Category" value={placeForm.category} onChange={(event) => setPlaceForm((current) => ({ ...current, category: event.target.value }))} />
              <Field label="Location" value={placeForm.location_name} onChange={(event) => setPlaceForm((current) => ({ ...current, location_name: event.target.value }))} />
              <Field label="City" value={placeForm.city} onChange={(event) => setPlaceForm((current) => ({ ...current, city: event.target.value }))} />
              <Field label="Latitude" value={placeForm.latitude} onChange={(event) => setPlaceForm((current) => ({ ...current, latitude: event.target.value }))} />
              <Field label="Longitude" value={placeForm.longitude} onChange={(event) => setPlaceForm((current) => ({ ...current, longitude: event.target.value }))} />
              <Field label="Images" placeholder="Comma separated image URLs" value={placeForm.images} onChange={(event) => setPlaceForm((current) => ({ ...current, images: event.target.value }))} />
              <Field label="Videos" placeholder="Comma separated video URLs" value={placeForm.videos} onChange={(event) => setPlaceForm((current) => ({ ...current, videos: event.target.value }))} />
              <Field as="textarea" label="Description" rows="4" value={placeForm.description} onChange={(event) => setPlaceForm((current) => ({ ...current, description: event.target.value }))} />
              <div className="flex flex-wrap items-end gap-3">
                <button type="submit" className="btn-primary" disabled={saving === 'place'}>{saving === 'place' ? 'Saving...' : editingPlaceId ? 'Update Place' : 'Add Place'}</button>
                {editingPlaceId ? (
                  <button type="button" className="btn-outline" onClick={() => { setEditingPlaceId(''); setPlaceForm(EMPTY_PLACE_FORM); }}>
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </form>

            <AdminTable columns={['Place', 'Category', 'Location', 'Images', 'QR', 'Actions']} empty={!places.length ? 'No places available.' : ''}>
              {places.map((place) => (
                <tr key={place.id}>
                  <td className="px-5 py-4">
                    <p className="font-bold">{place.name}</p>
                    <p className="text-xs text-slate-500">{place.description || 'No description'}</p>
                  </td>
                  <td className="px-5 py-4">{place.category}</td>
                  <td className="px-5 py-4">{place.location_name || place.city || 'Not set'}</td>
                  <td className="px-5 py-4">{asList(place.images).length}</td>
                  <td className="px-5 py-4">{place.qr_id || place.place_id}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={() => startPlaceEdit(place)}>Edit</button>
                      <button type="button" className="btn-outline btn-sm" onClick={() => { setSelectedPlaceId(place.id); setActive('AI Guide'); }}>AI</button>
                      <button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => { await deletePlace(place.id); await refreshPlaces(); }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <AdminSection active={active} name="AI Guide">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <Field as="select" label="Place" value={selectedPlace?.id || ''} onChange={(event) => setSelectedPlaceId(event.target.value)}>
                {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
              </Field>
              <div className="mt-5 space-y-4">
                {asList(selectedPlace?.ai_sections).map((section, index) => (
                  <div key={`${section.title}-${index}`} className="rounded-lg border border-slate-200 p-4">
                    <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_auto]">
                      <input className="field" value={section.title} onChange={(event) => mutatePlaceSection(index, 'title', event.target.value)} />
                      <textarea className="field min-h-28" value={section.body} onChange={(event) => mutatePlaceSection(index, 'body', event.target.value)} />
                      <button type="button" className="btn-outline btn-sm self-start !border-red-200 !text-red-700" onClick={() => removeAiSection(index)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button type="button" className="btn-outline" onClick={addAiSection}>Add Section</button>
                <button type="button" className="btn-primary" disabled={saving === 'ai-guide'} onClick={handleAiSave}>Save AI Guide</button>
              </div>
            </div>
          </AdminSection>

          <AdminSection active={active} name="Trips">
            <AdminTable columns={['Trip', 'User', 'Destinations', 'Cost', 'Duration', 'Status', 'Actions']} empty={!trips.length ? 'No trips found.' : ''}>
              {trips.map((trip) => (
                <tr key={trip.id}>
                  <td className="px-5 py-4 font-bold">{trip.name}</td>
                  <td className="px-5 py-4">{trip.user_name}</td>
                  <td className="px-5 py-4">{asList(trip.destinations).map((item) => item.name).join(', ')}</td>
                  <td className="px-5 py-4">INR {trip.cost || 0}</td>
                  <td className="px-5 py-4">{trip.duration} days</td>
                  <td className="px-5 py-4"><span className="badge badge-teal">{trip.status}</span></td>
                  <td className="px-5 py-4"><button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => { await deleteTrip(trip.id); setTrips((current) => current.filter((item) => item.id !== trip.id)); }}>Delete</button></td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <AdminSection active={active} name="QR Codes">
            <AdminTable columns={['Place', 'Total Scans', 'Last Scan', 'Popularity', 'QR ID', 'Actions']} empty={!places.length ? 'No QR codes found.' : ''}>
              {places.map((place) => (
                <tr key={place.id}>
                  <td className="px-5 py-4 font-bold">{place.name}</td>
                  <td className="px-5 py-4">{place.qr_total_scans || 0}</td>
                  <td className="px-5 py-4">{formatDate(place.qr_last_scan_at)}</td>
                  <td className="px-5 py-4">{place.popularity_score || 0}</td>
                  <td className="px-5 py-4">{place.qr_id || place.place_id}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={async () => {
                        const response = await generateQr(place.id);
                        toast.success(`QR payload: ${extractData(response).payload}`);
                        await refreshPlaces();
                      }}>
                        Generate
                      </button>
                      <a
                        className="btn-outline btn-sm"
                        href={getQrImageUrl(place.qr_id || place.place_id)}
                        download={`${place.place_id || place.name}-qr.png`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <AdminSection active={active} name="Analytics">
            <div className="grid gap-5 xl:grid-cols-2">
              <ChartPanel title="Monthly Trip Growth">
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={asList(analytics.monthly_trip_growth)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area dataKey="trips" fill="#ccfbf1" stroke="#0f766e" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartPanel>
              <ChartPanel title="User Registrations">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={asList(analytics.user_registrations)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="users" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
              <ChartPanel title="Most Scanned QR Codes">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={asList(analytics.most_scanned_qr)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="scans" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartPanel>
              <ChartPanel title="Expense Statistics">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={asList(analytics.expense_statistics)} dataKey="total" nameKey="category" outerRadius={100}>
                      {asList(analytics.expense_statistics).map((entry, index) => <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartPanel>
            </div>
          </AdminSection>

          <AdminSection active={active} name="CMS">
            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-extrabold">AI Content Review</h3>
              <div className="mt-4 divide-y divide-slate-100">
                {pendingContent.length ? pendingContent.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-bold">{item.place_name}</p>
                      <p className="text-sm text-slate-500">{item.type} · {item.status} · {item.source}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-outline btn-sm" onClick={async () => {
                        await approveContent(item.id);
                        setPendingContent((current) => current.filter((entry) => entry.id !== item.id));
                        await refreshPlaces();
                        toast.success('Content approved.');
                      }}>
                        Approve
                      </button>
                      <button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => {
                        await rejectContent(item.id);
                        setPendingContent((current) => current.filter((entry) => entry.id !== item.id));
                        toast.success('Content rejected.');
                      }}>
                        Reject
                      </button>
                    </div>
                  </div>
                )) : <p className="py-3 text-sm font-semibold text-slate-500">No AI content awaiting review.</p>}
              </div>
            </section>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xl font-extrabold">Upload Content Assets</h3>
              <p className="mt-1 text-sm text-slate-500">Manage images, videos, AI content, and AR references from this centralized library.</p>
              <input className="mt-5 field" type="file" multiple accept="image/*,video/*,audio/*" onChange={handleMediaUpload} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {media.map((item) => (
                <article key={item.id || item.media_url} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="aspect-video overflow-hidden rounded-lg bg-slate-100">
                    {String(item.mime_type).startsWith('image/') ? <img src={item.media_url} alt={item.original_name || 'Uploaded media'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">Media File</div>}
                  </div>
                  <p className="mt-3 font-bold">{item.original_name || 'Uploaded media'}</p>
                  <p className="text-sm text-slate-500">{item.mime_type}</p>
                  <button type="button" className="btn-outline btn-sm mt-3 !border-red-200 !text-red-700" onClick={async () => { await deleteMedia(item.media_url); setMedia((current) => current.filter((mediaItem) => mediaItem.media_url !== item.media_url)); }}>Delete</button>
                </article>
              ))}
            </div>
          </AdminSection>

          <AdminSection active={active} name="Alerts">
            <form className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2" onSubmit={handleAlertSubmit}>
              <Field label="Title" value={alertForm.title} onChange={(event) => setAlertForm((current) => ({ ...current, title: event.target.value }))} required />
              <Field as="select" label="Type" value={alertForm.type} onChange={(event) => setAlertForm((current) => ({ ...current, type: event.target.value }))}>
                <option value="weather">Weather Alert</option>
                <option value="route">Route Closure</option>
                <option value="trekking">Trekking Warning</option>
                <option value="event">Event Notification</option>
                <option value="general">General</option>
              </Field>
              <Field as="select" label="Severity" value={alertForm.severity} onChange={(event) => setAlertForm((current) => ({ ...current, severity: event.target.value }))}>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Field>
              <Field as="textarea" label="Message" rows="3" value={alertForm.message} onChange={(event) => setAlertForm((current) => ({ ...current, message: event.target.value }))} required />
              <button type="submit" className="btn-primary self-end" disabled={saving === 'alert'}>Create Alert</button>
            </form>
            <AdminTable columns={['Title', 'Type', 'Severity', 'Status', 'Date', 'Actions']} empty={!alerts.length ? 'No alerts published.' : ''}>
              {alerts.map((alert) => (
                <tr key={alert.id}>
                  <td className="px-5 py-4 font-bold">{alert.title}<p className="text-xs font-normal text-slate-500">{alert.message}</p></td>
                  <td className="px-5 py-4 capitalize">{alert.type}</td>
                  <td className="px-5 py-4"><span className="badge badge-amber">{alert.severity}</span></td>
                  <td className="px-5 py-4">{alert.active ? 'Active' : 'Inactive'}</td>
                  <td className="px-5 py-4">{formatDate(alert.created_at)}</td>
                  <td className="px-5 py-4"><button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => { await deleteAlert(alert.id); setAlerts((current) => current.filter((item) => item.id !== alert.id)); }}>Delete</button></td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <AdminSection active={active} name="Feedback">
            <AdminTable columns={['User', 'Place', 'Rating', 'Sentiment', 'Review', 'Date', 'Actions']} empty={!feedback.length ? 'No feedback yet.' : ''}>
              {feedback.map((item) => (
                <tr key={item.id}>
                  <td className="px-5 py-4 font-bold">{item.user_name}</td>
                  <td className="px-5 py-4">{item.place_name}</td>
                  <td className="px-5 py-4">{item.rating}/5</td>
                  <td className="px-5 py-4"><span className="badge">{item.sentiment}</span></td>
                  <td className="px-5 py-4">{item.comment || 'No comment'}</td>
                  <td className="px-5 py-4">{formatDate(item.created_at)}</td>
                  <td className="px-5 py-4"><button type="button" className="btn-outline btn-sm !border-red-200 !text-red-700" onClick={async () => { await deleteFeedback(item.id); setFeedback((current) => current.filter((entry) => entry.id !== item.id)); }}>Delete</button></td>
                </tr>
              ))}
            </AdminTable>
          </AdminSection>

          <AdminSection active={active} name="Settings">
            <div className="grid gap-4 lg:grid-cols-2">
              {['app', 'ai', 'qr', 'notifications'].map((key) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-xl font-extrabold capitalize">{key} settings</h3>
                  <textarea
                    className="field mt-4 min-h-48 font-mono text-sm"
                    value={JSON.stringify(settings[key] || {}, null, 2)}
                    onChange={(event) => {
                      try {
                        const nextValue = JSON.parse(event.target.value || '{}');
                        setSettingsState((current) => ({ ...current, [key]: nextValue }));
                      } catch (error) {
                        toast.error('Settings must be valid JSON.');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
            <button type="button" className="btn-primary" disabled={saving === 'settings'} onClick={saveSettings}>Save Settings</button>
          </AdminSection>

          {pendingContent.length ? (
            <div className="fixed bottom-4 right-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900 shadow-lg">
              {pendingContent.length} AI content item{pendingContent.length === 1 ? '' : 's'} awaiting review
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

function ChartPanel({ children, title }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-xl font-extrabold">{title}</h3>
      {children}
    </section>
  );
}
