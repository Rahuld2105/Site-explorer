import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PlaceAIGuideTab,
  PlaceNearbyTab,
  PlaceTabs,
  PlaceActionCard,
  PlaceReviewPanel,
  PlaceMobileActionBar
} from '../components/place';
import { useLocationContext } from '../context/LocationContext';
import { clonePlaceContent, findPlaceContent } from '../content/placeContent';
import { useGeofence } from '../hooks/useGeofence';
import { getGeofenceStatusForPlace } from '../utils/geoUtils';
import { getPlaceLocationLabel } from '../utils/normalizePlace';
import { resolvePlaceImage } from '../utils/placeImages';

const TABS = ['Overview', 'AI Guide', 'Nearby Services'];
const PLACE_GUIDE_IMAGES = [
  {
    match: /sinhagad|sinhgad/i,
    hero: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sinhagad_Fort_(75834).jpg?width=1600',
    history: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tanaji.jpg?width=900',
    architecture:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Pune_Darwaza_-_Sinhagad_Fort_(2).jpg?width=900',
    mainSpots:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Sinhagadfort_konadsheswartemple1_utsav.JPG?width=900'
  },
  {
    match: /raigad/i,
    hero: 'https://commons.wikimedia.org/wiki/Special:FilePath/Raigad_fort_(96344).jpg?width=1600',
    history:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Chhatrapati_Shivaji_Maharaj_Samadhi_Raigad.jpg?width=900',
    architecture: 'https://commons.wikimedia.org/wiki/Special:FilePath/Raigad_Maha_Darwaja.jpg?width=900',
    mainSpots:
      'https://commons.wikimedia.org/wiki/Special:FilePath/Old_masjid_of_Fort_Raigad.jpg?width=900'
  },
  {
    match: /shaniwar|wada/i,
    hero: 'https://commons.wikimedia.org/wiki/Special:FilePath/Entrance_of_Shaniwar_Wada%2C_Pune.jpg?width=1600',
    history: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shaniwar_Wada%2C_Pune.jpg?width=900',
    architecture: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shaniwar_Wada.jpg?width=900',
    mainSpots: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shaniwar_wada_garden.jpg?width=900'
  }
];

function getPlaceGuideImages(place) {
  const key = `${place?.name || ''} ${place?.place_id || ''} ${place?.slug || ''}`;
  return PLACE_GUIDE_IMAGES.find((images) => images.match.test(key)) || null;
}

function getSectionImage(images, section, fallback) {
  if (!images) return section?.image || section?.image_url || section?.thumbnail || section?.photo || fallback;
  const key = `${section?.id || ''} ${section?.title || section?.name || section?.label || ''}`;
  if (/history|overview/i.test(key)) return images.history;
  if (/architect|gate|entrance/i.test(key)) return images.architecture;
  if (/main|spot|highlight|best-time|visit/i.test(key)) return images.mainSpots;
  return section?.image || section?.image_url || section?.thumbnail || section?.photo || fallback;
}
const WEATHER_CODE_LABELS = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  71: 'Light snow',
  80: 'Rain showers',
  81: 'Moderate showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Severe thunderstorm'
};

const PLACE_ALERT_PROFILES = [
  {
    match: /rajgad/i,
    icon: 'TR',
    difficulty: 'Moderate to Hard',
    familyFriendly: 'Best for fit adults and older children',
    parking: 'Base village parking is limited',
    bestTime: 'October to February, start before sunrise',
    duration: '5-7 hours',
    carry: ['2-3 liters water', 'Trekking shoes', 'Energy snacks', 'Power bank'],
    alerts: [
      { title: 'Trek difficulty: Moderate to Hard', tone: 'amber', type: 'trek' },
      { title: 'Carry sufficient water', tone: 'amber', type: 'trek' },
      { title: 'Wear trekking shoes', tone: 'teal', type: 'trek' },
      { title: 'Slippery paths during monsoon', tone: 'rose', type: 'safety' },
      { title: 'Network coverage may be limited', tone: 'slate', type: 'safety' },
      { title: 'Landslide-prone sections possible in heavy rain', tone: 'rose', type: 'safety' }
    ]
  },
  {
    match: /sinhagad/i,
    icon: 'TR',
    difficulty: 'Moderate',
    familyFriendly: 'Family friendly with care on steps',
    parking: 'Parking can fill early on weekends',
    bestTime: 'Weekday mornings or late afternoon',
    duration: '2-4 hours',
    carry: ['Water', 'Walking shoes', 'Light rain layer'],
    alerts: [
      { title: 'Heavy crowd during weekends', tone: 'amber', type: 'safety' },
      { title: 'Carry water', tone: 'teal', type: 'trek' },
      { title: 'Slippery steps during rain', tone: 'rose', type: 'safety' },
      { title: 'Dense fog can reduce visibility in monsoon', tone: 'sky', type: 'safety' }
    ]
  },
  {
    match: /raigad/i,
    icon: 'TR',
    difficulty: 'Moderate',
    familyFriendly: 'Family friendly if using ropeway',
    parking: 'Parking available near ropeway/base area',
    bestTime: 'November to February, check ropeway first',
    duration: '4-6 hours',
    carry: ['Water', 'Sun protection', 'Comfortable shoes'],
    alerts: [
      { title: 'Check ropeway availability before arrival', tone: 'sky', type: 'route' },
      { title: 'Long walking sections on the fort', tone: 'amber', type: 'trek' },
      { title: 'Rain can slow ropeway and walking routes', tone: 'rose', type: 'weather' },
      { title: 'Watch for slippery trail edges', tone: 'rose', type: 'safety' }
    ]
  },
  {
    match: /shaniwar|wada/i,
    icon: 'HM',
    difficulty: 'Easy',
    familyFriendly: 'Family friendly',
    parking: 'Use nearby paid parking or public transport',
    bestTime: 'Morning opening hours or weekday afternoons',
    duration: '1-2 hours',
    carry: ['Water', 'ID if requested', 'Comfortable walking shoes'],
    alerts: [
      { title: 'Follow historical monument guidelines', tone: 'teal', type: 'heritage' },
      { title: 'Check entry timing before visiting', tone: 'sky', type: 'heritage' },
      { title: 'Photography rules may vary by area', tone: 'amber', type: 'heritage' },
      { title: 'Crowds increase on weekends and holidays', tone: 'amber', type: 'safety' }
    ]
  }
];

function normalizePlaceKey(place) {
  return `${place?.name || ''} ${place?.slug || ''} ${place?.place_id || ''}`.toLowerCase();
}

function getPlaceAlertProfile(place) {
  const key = normalizePlaceKey(place);
  const matched = PLACE_ALERT_PROFILES.find((profile) => profile.match.test(key));
  const isHillFort = /fort|hill|trek|trail|ghat/i.test(`${place?.category} ${place?.best_for} ${place?.description}`);

  if (matched) {
    return matched;
  }

  return {
    icon: isHillFort ? 'TR' : 'HM',
    difficulty: isHillFort ? 'Moderate' : 'Easy',
    familyFriendly: isHillFort ? 'Good for active families' : 'Family friendly',
    parking: place?.parking || 'Check local parking before arrival',
    bestTime: place?.best_time_to_visit || (isHillFort ? 'Early morning' : 'Morning or late afternoon'),
    duration: place?.estimated_visit_duration || (isHillFort ? '3-5 hours' : '1-2 hours'),
    carry: isHillFort ? ['Water', 'Walking shoes', 'Sun protection'] : ['Water', 'Comfortable shoes'],
    alerts: isHillFort
      ? [
          { title: 'Wear shoes with good grip', tone: 'teal', type: 'trek' },
          { title: 'Start early to avoid heat', tone: 'amber', type: 'safety' }
        ]
      : [
          { title: 'Respect monument rules', tone: 'teal', type: 'heritage' },
          { title: 'Check opening hours before visiting', tone: 'sky', type: 'heritage' }
        ]
  };
}

function getWeatherRecommendation(weather, profile) {
  if (!weather) {
    return 'Weather is unavailable right now. Use local conditions before starting.';
  }

  if (weather.rainProbability >= 70 || weather.code >= 80 || [63, 65, 95, 96, 99].includes(weather.code)) {
    return /Hard|Moderate/i.test(profile.difficulty)
      ? 'Delay the trek or carry rain protection and avoid exposed sections.'
      : 'Carry rain protection and allow extra travel time.';
  }

  if (weather.temperature >= 35) {
    return 'Visit early, hydrate often, and avoid long exposed walks after noon.';
  }

  if (weather.windSpeed >= 35) {
    return 'Avoid exposed edges and viewpoints during strong wind.';
  }

  return 'Conditions look manageable. Keep water and basic safety gear ready.';
}

function deriveWeatherAlerts(weather) {
  if (!weather) {
    return [];
  }

  return [
    weather.rainProbability >= 70 || [63, 65, 80, 81, 82].includes(weather.code)
      ? { title: 'Heavy rain expected', tone: 'rose', type: 'weather' }
      : null,
    [95, 96, 99].includes(weather.code)
      ? { title: 'Thunderstorm warning', tone: 'rose', type: 'weather' }
      : null,
    weather.temperature >= 35
      ? { title: 'High temperature warning', tone: 'amber', type: 'weather' }
      : null,
    weather.windSpeed >= 35
      ? { title: 'Strong wind warning', tone: 'amber', type: 'weather' }
      : null,
    [45, 48].includes(weather.code)
      ? { title: 'Dense fog may affect visibility', tone: 'sky', type: 'weather' }
      : null
  ].filter(Boolean);
}

function usePlaceWeather(place) {
  const [weatherState, setWeatherState] = useState({ data: null, loading: false, error: '' });
  const location = useMemo(() => getPlaceLocation(place), [place]);

  useEffect(() => {
    if (!location) {
      setWeatherState({ data: null, loading: false, error: 'Place coordinates unavailable' });
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 8000);

    const loadWeather = async () => {
      setWeatherState((current) => ({ ...current, loading: true, error: '' }));

      try {
        const params = new URLSearchParams({
          latitude: String(location.lat),
          longitude: String(location.lng),
          current: 'temperature_2m,weather_code,wind_speed_10m',
          hourly: 'precipitation_probability',
          forecast_days: '1',
          timezone: 'auto'
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Weather request failed');
        }

        const payload = await response.json();
        const probabilities = Array.isArray(payload?.hourly?.precipitation_probability)
          ? payload.hourly.precipitation_probability.slice(0, 12).filter((value) => Number.isFinite(Number(value)))
          : [];
        const rainProbability = probabilities.length ? Math.max(...probabilities.map(Number)) : 0;
        const code = Number(payload?.current?.weather_code ?? 0);

        setWeatherState({
          data: {
            code,
            condition: WEATHER_CODE_LABELS[code] || 'Live weather',
            rainProbability,
            temperature: Number(payload?.current?.temperature_2m),
            windSpeed: Number(payload?.current?.wind_speed_10m)
          },
          loading: false,
          error: ''
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          setWeatherState({ data: null, loading: false, error: 'Weather unavailable' });
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    loadWeather();
    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [location?.lat, location?.lng]);

  return weatherState;
}

function buildSmartAlerts(place, weather) {
  const profile = getPlaceAlertProfile(place);
  const weatherAlerts = deriveWeatherAlerts(weather);

  return {
    activeAlerts: [...weatherAlerts, ...profile.alerts].slice(0, 8),
    profile,
    recommendation: getWeatherRecommendation(weather, profile)
  };
}

function AlertIcon({ type }) {
  const label = {
    weather: 'WX',
    safety: '!',
    trek: 'TR',
    heritage: 'HM',
    route: 'RT',
    success: 'OK'
  }[type] || 'AI';

  return <span className={`smart-alert-icon smart-alert-icon-${type}`}>{label}</span>;
}

AlertIcon.propTypes = {
  type: PropTypes.string.isRequired
};

function SmartAlertsPanel({ geofenceState, place, weatherState }) {
  const { data: weather, loading: weatherLoading, error: weatherError } = weatherState;
  const alerts = useMemo(() => buildSmartAlerts(place, weather), [place, weather]);
  const isInside = geofenceState?.status === 'inside';
  const isNear = geofenceState?.status === 'near';

  return (
    <div className="smart-alert-card anim-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-teal-700">
            <AlertIcon type={isInside ? 'success' : 'safety'} />
            Place-Aware Smart Alerts
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{place?.name || 'Selected heritage place'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {isInside
              ? 'You are inside the geofence. Showing on-site safety and travel guidance.'
              : isNear
                ? 'You are near the geofence. Prepare before entering the site.'
                : 'Showing place-specific preparation alerts before arrival.'}
          </p>
        </div>
        <span className={`badge ${isInside ? 'badge-green' : isNear ? 'badge-amber' : 'badge-teal'}`}>
          {isInside ? 'Geofence active' : isNear ? 'Near site' : 'Place ready'}
        </span>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="smart-alert-weather">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Live Weather</p>
              <p className="mt-2 text-xl font-black text-slate-950">
                {weatherLoading ? 'Checking...' : weather?.condition || weatherError || 'Weather unavailable'}
              </p>
            </div>
            <AlertIcon type="weather" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="smart-alert-metric">
              <span>Temp</span>
              <strong>{Number.isFinite(weather?.temperature) ? `${Math.round(weather.temperature)} C` : '--'}</strong>
            </div>
            <div className="smart-alert-metric">
              <span>Rain</span>
              <strong>{Number.isFinite(weather?.rainProbability) ? `${Math.round(weather.rainProbability)}%` : '--'}</strong>
            </div>
            <div className="smart-alert-metric">
              <span>Wind</span>
              <strong>{Number.isFinite(weather?.windSpeed) ? `${Math.round(weather.windSpeed)} km/h` : '--'}</strong>
            </div>
          </div>
          <p className="mt-4 rounded-xl bg-white/70 p-3 text-sm font-bold leading-6 text-slate-700">
            {alerts.recommendation}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {alerts.activeAlerts.map((alert) => (
            <div key={`${alert.type}-${alert.title}`} className={`smart-alert-item smart-alert-item-${alert.tone}`}>
              <AlertIcon type={alert.type} />
              <p>{alert.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ['Best time', alerts.profile.bestTime || place?.best_time_to_visit || 'Early morning'],
          ['Duration', alerts.profile.duration || place?.estimated_visit_duration || (alerts.profile.difficulty === 'Easy' ? '1-2 hours' : '4-6 hours')],
          ['Difficulty', alerts.profile.difficulty],
          ['Family', alerts.profile.familyFriendly],
          ['Parking', alerts.profile.parking],
          ['Carry', alerts.profile.carry.join(', ')]
        ].map(([label, value]) => (
          <div key={label} className="smart-alert-detail">
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

SmartAlertsPanel.propTypes = {
  geofenceState: PropTypes.shape({
    status: PropTypes.string
  }),
  place: PropTypes.shape({
    best_for: PropTypes.string,
    best_time_to_visit: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    estimated_visit_duration: PropTypes.string,
    latitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    location: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        coordinates: PropTypes.array
      })
    ]),
    location_name: PropTypes.string,
    longitude: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    name: PropTypes.string,
    place_id: PropTypes.string,
    slug: PropTypes.string
  }),
  weatherState: PropTypes.shape({
    data: PropTypes.object,
    error: PropTypes.string,
    loading: PropTypes.bool
  }).isRequired
};

SmartAlertsPanel.defaultProps = {
  geofenceState: null,
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

function getPlaceLocation(place) {
  const coordinates = place?.location?.coordinates || place?.coordinates;
  const lat = Number(place?.latitude ?? place?.lat ?? coordinates?.lat ?? coordinates?.[1]);
  const lng = Number(place?.longitude ?? place?.lng ?? coordinates?.lng ?? coordinates?.[0]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
}

function joinTextParts(parts) {
  return parts
    .flat()
    .filter((part) => typeof part === 'string' && part.trim())
    .map((part) => part.trim())
    .join('. ');
}

function buildCompleteHeritageNarration(place, language = 'en') {
  const fee = Number(place?.entry_fee || place?.price || 0);
  const facts = language === 'mr' ? place?.facts_mr : place?.facts_en || place?.facts;
  const aiFacts = place?.ai_content?.hidden_facts || place?.ai_content?.facts || [];

  if (language === 'mr') {
    return joinTextParts([
      `${place?.name || 'हे ठिकाण'} याबद्दल संपूर्ण वारसा मार्गदर्शन`,
      place?.description_mr || place?.description_en || place?.description,
      place?.historical_importance_mr || place?.historical_importance_en || place?.history,
      place?.architecture ? `वास्तुकला: ${place.architecture}` : '',
      place?.built_year ? `बांधकाम काळ: ${place.built_year}` : '',
      place?.builder ? `निर्माता: ${place.builder}` : '',
      place?.dynasty ? `राजवंश: ${place.dynasty}` : '',
      place?.category ? `प्रकार: ${place.category}` : '',
      place?.district || place?.state ? `स्थान: ${[place?.district, place?.state].filter(Boolean).join(', ')}` : '',
      place?.timings || place?.hours ? `वेळ: ${place.timings || place.hours}` : '',
      `प्रवेश शुल्क: ${fee > 0 ? `रुपये ${fee}` : 'मोफत किंवा उपलब्ध नाही'}`,
      place?.best_time_to_visit ? `भेट देण्याची उत्तम वेळ: ${place.best_time_to_visit}` : '',
      place?.estimated_visit_duration ? `अंदाजे भेट कालावधी: ${place.estimated_visit_duration}` : '',
      Array.isArray(facts) && facts.length ? `महत्त्वाची तथ्ये: ${facts.join('. ')}` : '',
      Array.isArray(aiFacts) && aiFacts.length ? `अधिक माहिती: ${aiFacts.join('. ')}` : ''
    ]);
  }

  return joinTextParts([
    `Complete heritage guide for ${place?.name || 'this place'}`,
    place?.description_en || place?.description,
    place?.historical_importance_en || place?.history || place?.ai_content?.history,
    place?.architecture ? `Architecture: ${place.architecture}` : '',
    place?.built_year ? `Built year: ${place.built_year}` : '',
    place?.builder ? `Builder: ${place.builder}` : '',
    place?.dynasty ? `Dynasty: ${place.dynasty}` : '',
    place?.category ? `Category: ${place.category}` : '',
    place?.district || place?.state ? `Location: ${[place?.district, place?.state].filter(Boolean).join(', ')}` : '',
    place?.timings || place?.hours ? `Timings: ${place.timings || place.hours}` : '',
    `Entry fee: ${fee > 0 ? `Rs ${fee}` : 'free or not listed'}`,
    place?.best_time_to_visit ? `Best time to visit: ${place.best_time_to_visit}` : '',
    place?.estimated_visit_duration ? `Estimated visit duration: ${place.estimated_visit_duration}` : '',
    Array.isArray(facts) && facts.length ? `Key facts: ${facts.join('. ')}` : '',
    Array.isArray(aiFacts) && aiFacts.length ? `Additional guide notes: ${aiFacts.join('. ')}` : ''
  ]);
}

const createGuideSections = (place) => {
  const curatedImages = getPlaceGuideImages(place);
  const image =
    curatedImages?.hero ||
    resolvePlaceImage(
      place,
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=900&auto=format&fit=crop&q=80'
    );
  const normalizeSection = (section, index, source = 'section') => {
    const title = section?.title || section?.name || section?.label || section?.heading;
    const content =
      section?.content ||
      section?.body ||
      section?.description ||
      section?.summary ||
      section?.overview ||
      section?.details ||
      '';

    if (!title && !content) {
      return null;
    }

    const baseId = title || source;

    return {
      id: section?.id || section?._id || section?.slug || `${String(baseId).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index}`,
      title: title || `Heritage point ${index + 1}`,
      content,
      image: getSectionImage(curatedImages, section, image)
    };
  };

  const managedSections = Array.isArray(place?.ai_sections)
    ? place.ai_sections
        .filter((section) => section?.title || section?.name || section?.body || section?.content || section?.description)
        .sort((first, second) => Number(first.order || 0) - Number(second.order || 0))
    : [];

  if (managedSections.length) {
    return {
      id: place?.place_id || place?._id || place?.id || 'current-place',
      image,
      sections: managedSections.map((section, index) => normalizeSection(section, index, 'ai-section')).filter(Boolean)
    };
  }

  const managedContent = findPlaceContent(place?.place_id || place?.id || place?.slug || place?.name);
  const backendSectionSources = [
    place?.sections,
    place?.sub_places,
    place?.subPlaces,
    place?.heritage_points,
    place?.heritagePoints,
    place?.points_of_interest,
    place?.pointsOfInterest,
    place?.monuments,
    place?.landmarks
  ].filter(Array.isArray);
  const backendSections = backendSectionSources
    .flat()
    .map((section, index) => normalizeSection(section, index, 'heritage-point'))
    .filter(Boolean);

  if (managedContent || backendSections.length) {
    const sectionsById = new Map();

    [...(managedContent?.sections || []), ...backendSections].forEach((section, index) => {
      const normalized = normalizeSection(section, index, 'managed-section');

      if (normalized && !sectionsById.has(String(normalized.id))) {
        sectionsById.set(String(normalized.id), normalized);
      }
    });

    return {
      id: managedContent?.id || place?.place_id || place?._id || place?.id || 'current-place',
      image: managedContent?.image || image,
      sections: Array.from(sectionsById.values())
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

  return {
    id: place?.place_id || place?._id || place?.id || 'current-place',
    image,
    sections: [
      {
        id: 'history',
        title: 'History',
        content: `${placeName} has a story shaped by ${city}. ${description}`,
        image: curatedImages?.history || image
      },
      {
        id: 'architecture',
        title: 'Architecture',
        content: `${placeName} is presented as a ${category} experience. Notice the layout, materials, entrances, viewpoints, and how the space guides visitors through the site.`,
        image: curatedImages?.architecture || image
      },
      {
        id: 'main-spots',
        title: 'Main spots',
        content: `At ${placeName}, focus on the main viewpoints, visitor areas, photo spots, and nearby highlights. It is best for ${bestFor}.${hours}`,
        image: curatedImages?.mainSpots || image
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
  const [serverGeofenceState, setServerGeofenceState] = useState(null);
  const [captions, setCaptions] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeGuideSectionId, setActiveGuideSectionId] = useState('overview');
  const [speechSupported] = useState(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  );
  const [activeTab, setActiveTab] = useState('Overview');
  const [visitDate, setVisitDate] = useState('');
  const [travelers, setTravelers] = useState('2 travelers');
  const [saved, setSaved] = useState(false);
  const lastGeofenceSyncRef = useRef('');

  // Derived state
  const isInsideLocal = useGeofence(place?.geofence_polygon, location);
  const localGeofenceState = useMemo(
    () => getGeofenceStatusForPlace(place, location),
    [location?.lat, location?.lng, place]
  );
  const geofenceState = useMemo(() => {
    if (!serverGeofenceState) {
      return {
        ...localGeofenceState,
        inside: localGeofenceState.inside || isInsideLocal,
        status: localGeofenceState.inside || isInsideLocal ? 'inside' : localGeofenceState.status
      };
    }

    return {
      ...localGeofenceState,
      ...serverGeofenceState,
      inside: Boolean(serverGeofenceState.inside ?? serverGeofenceState.isInside)
    };
  }, [isInsideLocal, localGeofenceState, serverGeofenceState]);
  const isInsideGeofence = Boolean(geofenceState.inside);
  const gallery = useMemo(() => {
    const curatedImages = getPlaceGuideImages(place);
    if (curatedImages) {
      return [curatedImages.hero, curatedImages.history, curatedImages.architecture, curatedImages.mainSpots];
    }

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
  const score = Number(place?.score || place?.rating || 9.4).toFixed(1);
  const price = Number(place?.price || place?.entry_fee || 0);
  const weatherState = usePlaceWeather(place);
  const guideData = useMemo(() => createGuideSections(place), [place]);
  const activeGuideSection = useMemo(
    () => guideData.sections.find((section) => section.id === activeGuideSectionId) || guideData.sections[0],
    [activeGuideSectionId, guideData.sections]
  );

  const speak = useCallback(
    (text, language = 'en-IN') => {
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
        setIsPaused(false);

        const u = new SpeechSynthesisUtterance(text);
        u.lang = language;
        u.rate = 0.95;
        u.pitch = 1;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length) {
          u.voice =
            voices.find((voice) => voice.lang === language) ||
            voices.find((voice) => voice.lang?.startsWith(language.split('-')[0])) ||
            voices.find((voice) => voice.lang === 'en-IN') ||
            voices[0];
        }

        u.onstart = () => setIsSpeaking(true);
        u.onend = () => {
          setIsSpeaking(false);
          setIsPaused(false);
        };
        u.onerror = (event) => {
          console.error('Speech failed:', event.error || event);
          setIsSpeaking(false);
          setIsPaused(false);
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
      setIsPaused(false);
    }
  }, [speechSupported]);

  const handlePauseNarration = useCallback(() => {
    if (speechSupported && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  }, [speechSupported]);

  const handleResumeNarration = useCallback(() => {
    if (speechSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsSpeaking(true);
    }
  }, [speechSupported]);

  const handleListenEnglish = useCallback(() => {
    const narration = buildCompleteHeritageNarration(place, 'en');
    setCaptions(narration);
    speak(narration, 'en-IN');
  }, [place, speak]);

  const handleListenMarathi = useCallback(() => {
    const narration = buildCompleteHeritageNarration(place, 'mr');
    setCaptions(narration);
    speak(narration, 'mr-IN');
  }, [place, speak]);

  useEffect(() => {
    if (!speechSupported) {
      return undefined;
    }

    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {};

    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
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
          setPlace({ ...managedContent, ...nextPlace, sections: nextPlace?.sections || managedContent.sections });
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

      const syncKey = [
        id,
        Math.round(Number(location.lat) * 10000),
        Math.round(Number(location.lng) * 10000),
        geofenceState.status
      ].join(':');

      if (lastGeofenceSyncRef.current === syncKey) {
        return;
      }

      lastGeofenceSyncRef.current = syncKey;

      try {
        const sessionIdKey = 'tourvision_geofence_session';
        let sessionId = localStorage.getItem(sessionIdKey);

        if (!sessionId) {
          sessionId = `geo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          localStorage.setItem(sessionIdKey, sessionId);
        }

        const response = await checkGeofence(id, {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
          previousStatus: serverGeofenceState?.status || null,
          sessionId
        });
        const data = extractData(response);

        if (isMounted) {
          const serverPlaceLat = Number(data?.place?.lat);
          const serverPlaceLng = Number(data?.place?.lng);

          setServerGeofenceState({
            distanceMeters: Number(data?.distanceMeters),
            event: data?.event || null,
            inside: Boolean(data?.isInside ?? data?.inside),
            nearRadiusMeters: Number(data?.nearRadiusMeters || localGeofenceState.nearRadiusMeters),
            placeCoordinates: Number.isFinite(serverPlaceLat) && Number.isFinite(serverPlaceLng)
              ? { lat: serverPlaceLat, lng: serverPlaceLng }
              : localGeofenceState.placeCoordinates,
            radiusMeters: Number(data?.radiusMeters || localGeofenceState.radiusMeters),
            status: data?.status || (data?.inside ? 'inside' : 'outside'),
            stored: Boolean(data?.stored)
          });
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
  }, [geofenceState.status, id, localGeofenceState, location, place, serverGeofenceState?.status]);

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
    },
    []
  );

  // Opens the structured guide without starting speech synthesis.
  const handleStartTour = useCallback(() => {
    const firstSection = guideData.sections[0];
    setGuideLoading(false);
    setActiveTab('AI Guide');
    if (firstSection) {
      setActiveGuideSectionId(firstSection.id);
      setCaptions(firstSection.content);
    }
  }, [guideData.sections]);

  useEffect(() => {
    const handleGlobalGuideOpen = (event) => {
      const payloadPlaceId = event.detail?.placeId || event.detail?.place_id;
      if (payloadPlaceId && String(payloadPlaceId) !== String(id)) {
        return;
      }

      handleStartTour();
    };

    window.addEventListener('tourvision:open-ai-guide', handleGlobalGuideOpen);
    return () => window.removeEventListener('tourvision:open-ai-guide', handleGlobalGuideOpen);
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
    </>
  );

  return (
    <>
      <div className="place-detail-shell container py-8">
        {/* Header and Gallery */}
        <PlaceHeader place={place} badges={badges} />

        <div className="mt-8">
          <PlaceGallery
            gallery={gallery}
            locationName={getPlaceLocationLabel(place)}
            mobileGallery={mobileGallery}
            onStartGuide={handleStartTour}
            placeName={place?.name}
            rating={place?.rating}
          />
        </div>

        {/* Main Content Grid */}
        <div className="place-detail-grid mt-8 grid gap-8">
          {/* Left Section - Tabs and Content */}
          <section className="space-y-7">
            <hr className="place-soft-divider" />

            <div className="voice-assistant-panel">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="place-section-kicker">Voice Assistant</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">Browse the audio guide</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {activeGuideSection ? `Current section: ${activeGuideSection.title}` : 'Choose a guide section.'}
                  </p>
                </div>

                <div className="voice-controls">
                  <button
                    type="button"
                    className="voice-control-button disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handlePlayNarration}
                    disabled={!activeGuideSection || !speechSupported}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className="voice-control-button disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleReplayNarration}
                    disabled={!activeGuideSection || !speechSupported}
                  >
                    Replay
                  </button>
                  <button
                    type="button"
                    className="voice-control-button disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={handleStopNarration}
                    disabled={!speechSupported}
                  >
                    Stop
                  </button>
                </div>
              </div>

              <div className="voice-section-rail mt-6">
                {guideData.sections.map((section) => {
                  const active = section.id === activeGuideSectionId;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => handleGuideSectionSelect(section)}
                      className={`voice-section-card group ${active ? 'voice-section-card-active' : ''}`}
                    >
                      <span className="relative block h-36 overflow-hidden">
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
                        <span className="voice-section-tag">
                          {active ? 'Now playing' : 'Guide stop'}
                        </span>
                        <span className="absolute bottom-3 left-3 right-3 text-base font-black text-white">
                          {section.title}
                        </span>
                      </span>
                      <span className="block p-4">
                        <span className="block line-clamp-3 text-sm font-semibold leading-6 text-slate-600">
                          {section.content}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="voice-caption-box mt-5">
                <p className="text-sm font-semibold leading-7 text-slate-600">
                  {captions || activeGuideSection?.content || 'Choose a guide section to begin.'}
                </p>
              </div>

              {isSpeaking && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="animate-pulse text-sm font-black text-emerald-700">AI is speaking...</p>
                  <div className="flex h-6 items-end gap-1">
                    <span className="h-2 w-1 bg-green-500 animate-bounce" />
                    <span className="h-4 w-1 bg-green-500 animate-bounce delay-100" />
                    <span className="h-3 w-1 bg-green-500 animate-bounce delay-200" />
                  </div>
                </div>
              )}
            </div>

            <SmartAlertsPanel geofenceState={geofenceState} place={place} weatherState={weatherState} />

            <PlaceTabs activeTab={activeTab} setActiveTab={setActiveTab} tabs={TABS} />

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(340px,360px)] xl:items-start">
              <div>
                {/* Tab Content */}
                {activeTab === 'Overview' && <PlaceOverviewTab aiContent={aiContent} place={place} />}

                {activeTab === 'AI Guide' && (
                  <PlaceAIGuideTab
                    activeSectionId={activeGuideSectionId}
                    captions={captions}
                    guideData={guideData}
                    isPaused={isPaused}
                    isSpeaking={isSpeaking}
                    onListenEnglish={handleListenEnglish}
                    onListenMarathi={handleListenMarathi}
                    onPauseNarration={handlePauseNarration}
                    onPlayNarration={handlePlayNarration}
                    onReplayNarration={handleReplayNarration}
                    onResumeNarration={handleResumeNarration}
                    onSectionSelect={handleGuideSectionSelect}
                    onStopNarration={handleStopNarration}
                    place={place}
                    speechSupported={speechSupported}
                    weather={weatherState.data}
                  />
                )}

                {activeTab === 'Nearby Services' && (
                  <PlaceNearbyTab
                    placeLocation={getPlaceLocation(place)}
                  />
                )}
              </div>

              <div className="hidden xl:block">
                <PlaceReviewPanel place={place} />
              </div>
            </div>
          </section>
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
