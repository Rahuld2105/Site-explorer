import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { checkGeofence, getAiContent, getPlaceById } from '../api/placeApi';
import { extractData, extractMessage } from '../api/responseUtils';
import Loader from '../components/common/Loader';
import {
  PlaceGallery,
  PlaceHeader,
  PlaceOverviewTab,
  PlaceARTourTab,
  PlaceAIGuideTab,
  PlaceNearbyTab,
  PlaceTabs,
  PlaceActionCard,
  PlaceMobileActionBar
} from '../components/place';
import { useLocationContext } from '../context/LocationContext';
import { clonePlaceContent, findPlaceContent } from '../content/placeContent';
import { useGeofence } from '../hooks/useGeofence';
import { resolvePlaceImage } from '../utils/placeImages';

const TABS = ['Overview', 'AR Tour', 'AI Guide', 'Nearby'];
const WEATHER_ALERTS = [
  { label: 'Rain warning', match: (place) => /fort|trek|hill|mountain/i.test(`${place?.category} ${place?.best_for}`), tone: 'amber' },
  { label: 'Heat warning', match: (place) => !/monsoon|waterfall/i.test(`${place?.best_for} ${place?.description}`), tone: 'rose' },
  { label: 'Visibility warning', match: (place) => /fort|view|hill|mountain/i.test(`${place?.category} ${place?.best_for}`), tone: 'sky' }
];

function buildSmartAlerts(place) {
  const distanceKm = Number(place?.distance || place?.route?.totalDistanceKm || 0);
  const terrain = String(place?.terrain || place?.category || place?.best_for || '').toLowerCase();
  const isRoughTerrain = /fort|trek|hill|mountain|ghat|trail/.test(terrain);
  const longTravel = distanceKm > 80 || /remote|fort|hill/.test(terrain);
  const weatherAlerts = WEATHER_ALERTS.filter((alert) => alert.match(place));
  const recommended = [
    isRoughTerrain ? 'Bike' : 'Sedan',
    isRoughTerrain || longTravel ? 'SUV' : 'Bike'
  ];
  const caution = isRoughTerrain ? ['Sedan'] : longTravel ? ['Bike'] : [];

  return {
    route: [
      ...(longTravel ? ['Long travel duration'] : []),
      ...(/pune|mumbai|city|urban/i.test(`${place?.location_name} ${place?.city} ${place?.terrain}`) ? ['Traffic warning'] : [])
    ],
    vehicles: {
      caution,
      recommended: [...new Set(recommended)]
    },
    weather: weatherAlerts
  };
}

function SmartAlertsPanel({ place }) {
  const alerts = buildSmartAlerts(place);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Smart Tour Alerts</p>
          <p className="mt-1 text-sm text-[var(--c-text-secondary)]">Weather, route, and vehicle suggestions for this visit.</p>
        </div>
        <span className="badge badge-teal">Live-ready</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Weather</p>
          <div className="mt-3 space-y-2">
            {alerts.weather.map((alert) => (
              <p key={alert.label} className="text-sm font-bold text-slate-700">{alert.label}</p>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Route</p>
          <div className="mt-3 space-y-2">
            {(alerts.route.length ? alerts.route : ['Route looks comfortable']).map((alert) => (
              <p key={alert} className="text-sm font-bold text-slate-700">{alert}</p>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Vehicles</p>
          <div className="mt-3 space-y-2">
            {alerts.vehicles.recommended.map((vehicle) => (
              <p key={vehicle} className="text-sm font-bold text-emerald-700">Recommended: {vehicle}</p>
            ))}
            {alerts.vehicles.caution.map((vehicle) => (
              <p key={vehicle} className="text-sm font-bold text-amber-700">Caution: {vehicle}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

SmartAlertsPanel.propTypes = {
  place: PropTypes.shape({
    best_for: PropTypes.string,
    category: PropTypes.string,
    city: PropTypes.string,
    description: PropTypes.string,
    distance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    location_name: PropTypes.string,
    route: PropTypes.shape({
      totalDistanceKm: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    }),
    terrain: PropTypes.string
  })
};

SmartAlertsPanel.defaultProps = {
  place: null
};

const isRajgadId = (value) => String(value || '').toLowerCase() === 'rajgad';

const isRajgadPlace = (place) => {
  const identifiers = [place?.place_id, place?._id, place?.id, place?.slug, place?.name]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return identifiers.some((value) => value === 'rajgad' || value.includes('rajgad'));
};

const getRajgadPlace = () => clonePlaceContent(findPlaceContent('rajgad'));

const createGuideSections = (place) => {
  const managedContent = findPlaceContent(place?.place_id || place?.id || place?.slug || place?.name);

  if (managedContent) {
    return {
      id: managedContent.id,
      image: managedContent.image,
      sections: managedContent.sections
    };
  }

  const placeName = place?.name || 'this place';
  const city = place?.city || place?.location_name || 'this destination';
  const description =
    place?.description ||
    `${placeName} is an important travel stop in ${city}, known for its visitor experience and local character.`;
  const category = place?.category || 'landmark';
  const bestFor = place?.best_for || 'photography, short walks, and relaxed exploration';
  const hours = place?.hours ? ` Visiting hours are ${place.hours}.` : '';
  const image =
    resolvePlaceImage(
      place,
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80'
    );

  return {
    id: place?.place_id || place?._id || place?.id || 'current-place',
    image,
    sections: [
      {
        id: 'history',
        title: 'History',
        content: `${placeName} has a story shaped by ${city}. ${description}`,
        image
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content: `${placeName} is presented as a ${category} experience. Notice the layout, materials, entrances, viewpoints, and how the space guides visitors through the site.`,
        image
      },
      {
        id: 'main-spots',
        title: 'Main spots',
        content: `At ${placeName}, focus on the main viewpoints, visitor areas, photo spots, and nearby highlights. It is best for ${bestFor}.${hours}`,
        image
      }
    ]
  };
};

/**
 * PlacePage — Main place detail page orchestrating all place-related components.
 * Data-fetching, state management, and event handling logic.
 */
export default function PlacePage() {
  const { id } = useParams();
  const { location } = useLocationContext();
  const [place, setPlace] = useState(null);
  const [aiContent, setAiContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guideLoading, setGuideLoading] = useState(false);
  const [error, setError] = useState('');
  const [insideFromServer, setInsideFromServer] = useState(null);
  const [captions, setCaptions] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeGuideSectionId, setActiveGuideSectionId] = useState('overview');
  const [speechSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  );
  const [activeTab, setActiveTab] = useState('Overview');
  const [visitDate, setVisitDate] = useState('');
  const [travelers, setTravelers] = useState('2 travelers');
  const [saved, setSaved] = useState(false);

  // Derived state
  const isInsideLocal = useGeofence(place?.geofence_polygon, location);
  const isInsideGeofence = useMemo(() => insideFromServer ?? isInsideLocal, [insideFromServer, isInsideLocal]);
  const gallery = useMemo(() => {
    const managedContent = findPlaceContent(place?.place_id || place?.id || place?.slug || place?.name);
    if (managedContent?.image) {
      return [managedContent.image, ...(managedContent.images || []).filter((image) => image !== managedContent.image)];
    }

    const images = aiContent?.images || place?.images || [];
    const knownImage = resolvePlaceImage(place);

    if (knownImage && !images.includes(knownImage)) {
      return [knownImage, ...images];
    }

    return images;
  }, [aiContent?.images, place]);
  const nearbyPlaces = useMemo(() => place?.nearby_places || [], [place?.nearby_places]);
  const score = Number(place?.score || place?.rating || 9.4).toFixed(1);
  const price = Number(place?.price || place?.entry_fee || 0);
  const guideData = useMemo(() => createGuideSections(place), [place]);
  const activeGuideSection = useMemo(
    () => guideData.sections.find((section) => section.id === activeGuideSectionId) || guideData.sections[0],
    [activeGuideSectionId, guideData.sections]
  );

  const speak = useCallback(
    (text) => {
      if (!text) {
        return;
      }

      if (!speechSupported) {
        setIsSpeaking(false);
        toast.error('Voice not supported');
        return;
      }

      try {
        window.speechSynthesis.cancel();

        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-IN';
        u.rate = 0.95;
        u.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
          u.voice = voices.find((voice) => voice.lang === 'en-IN') || voices[0];
        }

        u.onstart = () => setIsSpeaking(true);
        u.onend = () => setIsSpeaking(false);
        u.onerror = (event) => {
          console.error('Speech failed:', event.error || event);
          setIsSpeaking(false);
          toast.error('Voice playback failed');
        };

        window.speechSynthesis.speak(u);
      } catch (speechError) {
        console.error('Speech failed:', speechError);
        setIsSpeaking(false);
        toast.error('Voice playback failed');
      }
    },
    [speechSupported]
  );

  const handlePlayNarration = useCallback(() => {
    speak(activeGuideSection?.content || captions);
  }, [activeGuideSection, captions, speak]);

  const handleReplayNarration = useCallback(() => {
    speak(activeGuideSection?.content || captions);
  }, [activeGuideSection, captions, speak]);

  const handleStopNarration = useCallback(() => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [speechSupported]);

  useEffect(() => {
    if (!speechSupported) {
      return undefined;
    }

    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {};

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, [speechSupported]);

  useEffect(() => {
    if (!guideData.sections.some((section) => section.id === activeGuideSectionId)) {
      setActiveGuideSectionId(guideData.sections[0]?.id || '');
      setCaptions('');
    }
  }, [activeGuideSectionId, guideData.sections]);

  // Fetch place details
  useEffect(() => {
    let isMounted = true;

    const fetchPlace = async () => {
      setLoading(true);
      setError('');
      setCaptions('');
      setActiveGuideSectionId(isRajgadId(id) ? 'overview' : 'history');

      try {
        const placeResponse = await getPlaceById(id);
        const placeData = extractData(placeResponse);
        const nextPlace = placeData?.place || placeData;

        if (!isMounted) {
          return;
        }

        setPlace(nextPlace);
        const managedContent = clonePlaceContent(findPlaceContent(nextPlace?.place_id || nextPlace?.id || nextPlace?.slug || nextPlace?.name));
        if (managedContent) {
          setPlace({ ...managedContent, ...nextPlace, sections: managedContent.sections });
          setAiContent(managedContent.ai_content);
        }

        if (!managedContent && (nextPlace?.has_ai_content || nextPlace?.ai_content_available)) {
          try {
            const aiResponse = await getAiContent(id);
            if (!isMounted) {
              return;
            }
            const aiData = extractData(aiResponse);
            const nextAiContent = aiData?.content || aiData;
            setAiContent(nextAiContent);
          } catch (aiError) {
            if (isMounted) {
              console.warn('AI place content unavailable, falling back to static metadata.', aiError);
            }
          }
        }
      } catch (fetchError) {
        if (isMounted) {
          const localContent = clonePlaceContent(findPlaceContent(id));
          if (localContent || isRajgadId(id)) {
            const fallbackPlace = localContent || getRajgadPlace();
            setPlace(fallbackPlace);
            setAiContent(fallbackPlace.ai_content);
            setActiveGuideSectionId(fallbackPlace.sections[0]?.id || 'overview');
            setCaptions(fallbackPlace.sections[0]?.content || fallbackPlace.description);
            setError('');
          } else {
            setError(extractMessage(fetchError, 'Unable to load this place.'));
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchPlace();
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Sync geofence status with server
  useEffect(() => {
    let isMounted = true;

    const syncGeofence = async () => {
      if (!place || !location) {
        return;
      }

      try {
        const response = await checkGeofence(id, {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy
        });
        const data = extractData(response);

        if (isMounted) {
          setInsideFromServer(Boolean(data?.isInside ?? data?.inside));
        }
      } catch (geofenceError) {
        if (isMounted) {
          console.warn('Geofence sync failed:', geofenceError);
        }
      }
    };

    syncGeofence();
    return () => {
      isMounted = false;
    };
  }, [id, location, place]);

  // Listen for narration events
  useEffect(() => {
    const handleNarration = (event) => {
      const payload = event.detail || {};
      const payloadPlaceId = payload.placeId || payload.place_id;
      if (payloadPlaceId && String(payloadPlaceId) !== String(id)) {
        return;
      }
      if (payload.caption || payload.text) {
        const nextText = payload.caption || payload.text;
        setCaptions(nextText);
      }
    };

    window.addEventListener('tourvision:narration', handleNarration);
    return () => window.removeEventListener('tourvision:narration', handleNarration);
  }, [id]);

  const handleGuideSectionSelect = useCallback(
    (section) => {
      setActiveGuideSectionId(section.id);
      setCaptions(section.content);
      speak(section.content);
    },
    [speak]
  );

  // Starts the structured guide with the first predefined section.
  const handleStartTour = useCallback(() => {
    const firstSection = guideData.sections[0];
    setGuideLoading(false);
    setActiveTab('AI Guide');
    handleGuideSectionSelect(firstSection);
    toast.success('Voice guide started.');
  }, [guideData.sections, handleGuideSectionSelect]);

  useEffect(() => {
    const handleGlobalGuideStart = (event) => {
      const payloadPlaceId = event.detail?.placeId || event.detail?.place_id;
      if (payloadPlaceId && String(payloadPlaceId) !== String(id)) {
        return;
      }

      handleStartTour();
    };

    window.addEventListener('tourvision:start-ai-guide', handleGlobalGuideStart);
    return () => window.removeEventListener('tourvision:start-ai-guide', handleGlobalGuideStart);
  }, [handleStartTour, id]);

  // Loading state
  if (loading) {
    return (
      <div className="container py-16">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader label="Loading place details..." size="lg" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container py-16">
        <div className="card card-bordered p-8">
          <h1 className="text-[2rem]">Place unavailable</h1>
          <p className="mt-3 text-[var(--c-text-secondary)]">{error}</p>
        </div>
      </div>
    );
  }

  const mobileGallery = gallery.length
    ? gallery
    : [resolvePlaceImage(place, 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80')];

  // Badge elements
  const badges = (
    <>
      <span className="badge badge-teal">AI Guide Available</span>
      <span className="badge badge-orange">AR Experience</span>
    </>
  );

  return (
    <>
      <div className="container py-8">
        {/* Header and Gallery */}
        <PlaceHeader place={place} badges={badges} />

        <div className="mt-8">
          <PlaceGallery
            gallery={gallery}
            locationName={place?.location_name || place?.location || place?.city || 'TourVision destination'}
            mobileGallery={mobileGallery}
            onStartGuide={handleStartTour}
            placeName={place?.name}
            rating={place?.rating}
          />
        </div>

        {/* Main Content Grid */}
        <div className="mt-8 grid gap-10 xl:grid-cols-[minmax(0,0.65fr)_minmax(320px,0.35fr)]">
          {/* Left Section - Tabs and Content */}
          <section className="space-y-8">
            <hr className="divider" />

            <div className="card card-bordered p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Voice Assistant</p>
                  <p className="mt-1 text-sm text-[var(--c-text-secondary)]">
                    {activeGuideSection ? `Current section: ${activeGuideSection.title}` : 'Choose a guide section.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handlePlayNarration}
                    disabled={!activeGuideSection || !speechSupported}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleReplayNarration}
                    disabled={!activeGuideSection || !speechSupported}
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleStopNarration}
                    disabled={!speechSupported}
                  >
                    Stop
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {guideData.sections.map((section) => {
                  const active = section.id === activeGuideSectionId;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleGuideSectionSelect(section)}
                      className={`group overflow-hidden rounded-xl border bg-white text-left shadow-[var(--shadow-card)] transition ${
                        active
                          ? 'border-teal-400 shadow-md shadow-teal-500/10'
                          : 'border-[var(--c-border)] hover:border-teal-200'
                      }`}
                    >
                      <span className="relative block h-32 overflow-hidden">
                        <img
                          alt={section.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          src={
                            section.image ||
                            place?.image ||
                            gallery[0] ||
                            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80'
                          }
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                        <span className="absolute bottom-3 left-3 right-3 text-sm font-bold text-white">
                          {section.title}
                        </span>
                      </span>
                      <span className="block p-4">
                        <span className="block line-clamp-2 text-sm leading-6 text-[var(--c-text-secondary)]">
                        {section.content}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-surface-inset)] p-4">
                <p className="text-sm leading-6 text-[var(--c-text-secondary)]">
                  {captions || activeGuideSection?.content || 'Choose a guide section to begin.'}
                </p>
              </div>

              {isSpeaking && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-green-500 animate-pulse">AI is speaking...</p>
                  <div className="flex h-6 items-end gap-1">
                    <span className="h-2 w-1 bg-green-500 animate-bounce" />
                    <span className="h-4 w-1 bg-green-500 animate-bounce delay-100" />
                    <span className="h-3 w-1 bg-green-500 animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>

            <SmartAlertsPanel place={place} />

            <PlaceTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />

            {/* Tab Content */}
            {activeTab === 'Overview' && <PlaceOverviewTab aiContent={aiContent} place={place} />}

            {activeTab === 'AR Tour' && (
              <PlaceARTourTab aiContent={aiContent} captions={captions} gallery={gallery} place={place} />
            )}

            {activeTab === 'AI Guide' && (
              <PlaceAIGuideTab
                activeSectionId={activeGuideSectionId}
                captions={captions}
                guideData={guideData}
                isSpeaking={isSpeaking}
                onPlayNarration={handlePlayNarration}
                onReplayNarration={handleReplayNarration}
                onSectionSelect={handleGuideSectionSelect}
                onStartTour={handleStartTour}
                onStopNarration={handleStopNarration}
                speechSupported={speechSupported}
              />
            )}

            {activeTab === 'Nearby' && <PlaceNearbyTab nearbyPlaces={nearbyPlaces} />}
          </section>

          {/* Right Sidebar - Action Card */}
          <PlaceActionCard
            guideLoading={guideLoading}
            isInsideGeofence={isInsideGeofence}
            onAddToWishlist={() => setSaved((current) => !current)}
            onStartTour={handleStartTour}
            onViewGuide={() => setActiveTab('AI Guide')}
            onTravelersChange={setTravelers}
            onVisitDateChange={setVisitDate}
            price={price}
            saved={saved}
            score={score}
            travelers={travelers}
            visitDate={visitDate}
          />
        </div>
      </div>

      {/* Mobile Bottom Action Bar */}
      <PlaceMobileActionBar
        guideLoading={guideLoading}
        isInsideGeofence={isInsideGeofence}
        onStartTour={handleStartTour}
        price={price}
        score={score}
      />
    </>
  );
}
