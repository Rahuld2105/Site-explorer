import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getPlaceById } from "../api/placeApi";
import { extractData } from "../api/responseUtils";
import QRScanner from "../components/qr/QRScanner";
import { FeedbackSection } from "./FeedbackPage";
import { resolvePlaceImage } from "../utils/placeImages";
import { parsePlaceIdFromImageResult } from "../utils/qr";
import { openQrHeritagePage } from "../utils/qrNavigation";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1742922016224-f4fb7f4387c5?auto=format&fit=crop&q=85&w=2400";

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 }
};

const FEATURES = [
  {
    icon: "AI",
    title: "AI Voice Guide",
    body: "Place-aware voice narration for forts, stories, and guided sections.",
    accent: "from-teal-400 to-cyan-500"
  },
  {
    icon: "QR",
    title: "QR and Image Scanner",
    body: "Scan a landmark QR or upload an image for CNN-based place recognition.",
    accent: "from-slate-900 to-slate-600"
  },
  {
    icon: "TP",
    title: "Smart Trip Planner",
    body: "Plan routes, organize destinations, and keep heritage visits structured.",
    accent: "from-indigo-500 to-violet-500"
  },
  {
    icon: "EX",
    title: "Trip Expenses",
    body: "Track shared spending inside each live trip and simplify group settlements.",
    accent: "from-emerald-500 to-teal-500"
  },
  {
    icon: "AI",
    title: "AI Guide",
    body: "Open narrated heritage sections and visual place experiences from place pages.",
    accent: "from-amber-400 to-orange-500"
  },
  {
    icon: "NP",
    title: "Nearby Fort Discovery",
    body: "Find nearby historical places around your current location.",
    accent: "from-sky-500 to-blue-600"
  }
];

const RAJGAD_FORT = {
  id: "rajgad",
  name: "Rajgad",
  location: "Pune, Maharashtra",
  image: "/images/rajgad-fort.jpg",
  body: "A Maratha capital fort with AI narration, guided sections, and place-aware exploration."
};

const BACKEND_FORT_IDS = ["sinhagad_fort", "shaniwar_wada"];
const HOME_DESTINATION_IMAGES = {
  sinhagad_fort:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Sinhagad_Fort_(75834).jpg?width=1200",
  shaniwar_wada:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Entrance_of_Shaniwar_Wada%2C_Pune.jpg?width=1200"
};

function toDestinationCard(place) {
  const id = place.place_id || place.id;
  return {
    id,
    name: place.name,
    location: place.location_name || [place.city, place.state].filter(Boolean).join(", ") || "Maharashtra",
    image: HOME_DESTINATION_IMAGES[id] || resolvePlaceImage(place),
    body: place.description_en || place.description || "Explore this heritage destination with TourVision."
  };
}

const WORKFLOW = [
  { label: "Scan QR/Image", icon: "01" },
  { label: "Open Place", icon: "02" },
  { label: "Listen to AI Guide", icon: "03" },
  { label: "Explore Sections", icon: "04" },
  { label: "Plan Trip", icon: "05" }
];

const FLOATING_CARDS = [
  { title: "AI Guide", meta: "Voice stories on demand", className: "left-4 top-8 sm:left-auto sm:right-8 sm:top-20" },
  { title: "Scanner", meta: "QR plus CNN image match", className: "right-4 top-32 sm:right-24 sm:top-56" },
  { title: "Trip Planner", meta: "Routes, costs, groups", className: "bottom-8 left-4 sm:left-auto sm:right-12" }
];

function FeatureCard({ feature, index }) {
  return (
    <motion.article
      className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/70 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300/50"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.55, delay: index * 0.05 }}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent}`} />
      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.accent} text-sm font-black text-white shadow-lg shadow-slate-300/70`}>
        {feature.icon}
      </div>
      <h3 className="mt-6 text-xl font-extrabold text-slate-950">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">{feature.body}</p>
      <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Implemented</p>
    </motion.article>
  );
}

FeatureCard.propTypes = {
  feature: PropTypes.shape({
    accent: PropTypes.string.isRequired,
    body: PropTypes.string.isRequired,
    icon: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired
  }).isRequired,
  index: PropTypes.number.isRequired
};

function DestinationCard({ fort, onAiGuide, onExplore }) {
  return (
    <motion.article
      className="group overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/80 ring-1 ring-slate-200/80 transition duration-500 hover:-translate-y-2 hover:shadow-2xl hover:shadow-slate-300/70"
      variants={fadeUp}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      <div className="relative h-72 overflow-hidden bg-slate-200">
        <img
          alt={fort.name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
          loading="lazy"
          src={fort.image}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/25 to-transparent" />
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">{fort.location}</p>
          <h3 className="mt-2 text-3xl font-black leading-none drop-shadow-xl">{fort.name}</h3>
        </div>
      </div>
      <div className="p-6">
        <p className="min-h-16 text-sm leading-6 text-slate-600">{fort.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-slate-300/80 transition duration-300 hover:-translate-y-0.5 hover:bg-teal-700 active:scale-95"
            onClick={() => onAiGuide(fort)}
          >
            AI Guide
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-extrabold text-slate-700 transition duration-300 hover:-translate-y-0.5 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 active:scale-95"
            onClick={() => onExplore(fort)}
          >
            Explore
          </button>
        </div>
      </div>
    </motion.article>
  );
}

DestinationCard.propTypes = {
  fort: PropTypes.shape({
    body: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    image: PropTypes.string.isRequired,
    location: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired
  }).isRequired,
  onAiGuide: PropTypes.func.isRequired,
  onExplore: PropTypes.func.isRequired
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [popularForts, setPopularForts] = useState([RAJGAD_FORT]);

  useEffect(() => {
    let isMounted = true;

    Promise.all(BACKEND_FORT_IDS.map((id) => getPlaceById(id)))
      .then((responses) => {
        if (!isMounted) return;
        const backendForts = responses
          .map((response) => extractData(response)?.place)
          .filter(Boolean)
          .map(toDestinationCard);
        setPopularForts([RAJGAD_FORT, ...backendForts]);
      })
      .catch((error) => console.warn("Unable to load home destinations from backend.", error));

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const openScanner = () => setScannerOpen(true);
    window.addEventListener("tourvision:open-qr", openScanner);
    return () => window.removeEventListener("tourvision:open-qr", openScanner);
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    window.setTimeout(() => {
      document.querySelector(location.hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [location.hash]);

  const handleQrDetected = async (decodedText) => {
    const opened = await openQrHeritagePage(decodedText, navigate);

    if (opened) {
      setScannerOpen(false);
    }
  };

  const handleImageDetected = async (result) => {
    const placeId = parsePlaceIdFromImageResult(result);

    if (!placeId) {
      toast.error("Unable to identify this image");
      return;
    }

    setScannerOpen(false);
    toast.success(`CNN matched ${result?.name || "a landmark"}.`);
    navigate(`/qr-heritage/${placeId}`);
  };

  const openPlace = (fort) => {
    navigate(`/place/${fort.id}`);
  };

  const startGuide = (fort) => {
    navigate(`/place/${fort.id}`);
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent("tourvision:start-ai-guide", {
          detail: { placeId: fort.id }
        })
      );
    }, 600);
  };

  return (
    <>
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-slate-950">
        <motion.img
          alt="Rajgad Fort in Maharashtra"
          animate={{ scale: [1.04, 1.09, 1.04], y: [0, -12, 0] }}
          className="absolute inset-0 h-full w-full object-cover opacity-85"
          fetchPriority="high"
          src={HERO_IMAGE}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/70 to-slate-950/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/15" />

        <div className="container relative z-10 grid min-h-[calc(100svh-4rem)] items-center gap-10 py-16 lg:grid-cols-[minmax(0,0.62fr)_minmax(340px,0.38fr)]">
          <motion.div
            className="max-w-4xl pt-8 text-white"
            initial={{ opacity: 0, y: 34 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-flex rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-bold shadow-xl shadow-black/20 backdrop-blur-md">
              AI-powered heritage exploration
            </span>
            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-tight drop-shadow-2xl sm:text-6xl lg:text-8xl">
              Explore History with AI
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/82 sm:text-xl">
              Scan QR codes, recognize landmark images with CNN, listen to AI voice guides, and plan smarter journeys.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full bg-white px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-2xl shadow-black/25 transition duration-300 hover:-translate-y-1 hover:scale-[1.03] active:scale-95"
                onClick={() => navigate("/nearby")}
              >
                Start Exploring
              </button>
              <button
                type="button"
                className="rounded-full border border-white/30 bg-white/15 px-7 py-3.5 text-sm font-extrabold text-white shadow-2xl shadow-black/20 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:scale-[1.03] hover:bg-white/25 active:scale-95"
                onClick={() => setScannerOpen(true)}
              >
                Open Scanner
              </button>
            </div>
          </motion.div>

          <div className="relative hidden min-h-[460px] lg:block">
            {FLOATING_CARDS.map((card, index) => (
              <motion.div
                key={card.title}
                className={`absolute w-64 rounded-3xl border border-white/20 bg-white/15 p-5 text-white shadow-2xl shadow-black/30 backdrop-blur-xl ${card.className}`}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + index * 0.14 }}
                whileHover={{ y: -6, scale: 1.03 }}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                  {card.title.split(" ")[0].slice(0, 2).toUpperCase()}
                </div>
                <h3 className="mt-4 text-lg font-extrabold">{card.title}</h3>
                <p className="mt-1 text-sm text-white/70">{card.meta}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        className="bg-gradient-to-b from-slate-50 to-white py-16 sm:py-20"
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.65 }}
      >
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Actual product features</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Built for intelligent travel exploration.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The homepage now highlights the core app flows: QR discovery, AI narration, nearby places, trip planning, live expenses, and smart recommendations.
            </p>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, index) => (
              <FeatureCard key={feature.title} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </motion.section>

      <section className="bg-white py-16 sm:py-20">
        <div className="container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-700">Popular destinations</p>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">Explore forts with guided context.</h2>
            </div>
            <button
              type="button"
              className="w-fit rounded-full bg-slate-100 px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5 hover:bg-teal-50 hover:text-teal-800"
              onClick={() => navigate("/nearby")}
            >
              View nearby places
            </button>
          </div>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {popularForts.map((fort) => (
              <DestinationCard key={fort.id} fort={fort} onAiGuide={startGuide} onExplore={openPlace} />
            ))}
          </div>
        </div>
      </section>

      <FeedbackSection embedded />

      <section className="relative overflow-hidden bg-slate-950 py-16 text-white sm:py-20">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/60 to-transparent" />
        <div className="container">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-teal-300">QR, image, and AI experience flow</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">From scan to story to smart plan.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {WORKFLOW.map((step, index) => (
              <motion.div
                key={step.label}
                className="relative rounded-3xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-black/10 backdrop-blur-md"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                  {step.icon}
                </span>
                <p className="mt-5 font-extrabold">{step.label}</p>
                {index < WORKFLOW.length - 1 ? (
                  <span className="absolute -right-3 top-9 hidden h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-white/60 md:flex">
                    -&gt;
                  </span>
                ) : null}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-teal-50 via-white to-indigo-50 p-7 shadow-xl shadow-slate-200/70 sm:p-9">
            <div className="grid gap-7 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-teal-700">Plan, travel, settle</p>
                <h2 className="mt-3 text-3xl font-black text-slate-950">Turn exploration into a complete trip.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Move from guided place sections to trip planning, live navigation, and trip-scoped expense tracking.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="btn-primary" onClick={() => navigate("/trip-planner")}>
                  Open Trip Planner
                </button>
                <button type="button" className="btn-secondary" onClick={() => navigate("/trips")}>
                  My Trips
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <QRScanner
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleQrDetected}
        onImageDetected={handleImageDetected}
      />
    </>
  );
}
