import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getPlaceById } from "../api/placeApi";
import { extractData, extractMessage } from "../api/responseUtils";
import Loader from "../components/common/Loader";
import { resolvePlaceImage } from "../utils/placeImages";

const FALLBACK_TEXT = "Not available in database";
const QR_HERITAGE_IMAGE_RULES = [
  {
    match: /shivaji.*samadhi|samadhi.*shivaji/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chhatrapati_Shivaji_Maharaj_Samadhi_Raigad.jpg?width=1600",
  },
  {
    match: /rajaram.*samadhi|samadhi.*rajaram/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Chhatrapati_Rajaram_Samadhi.JPG?width=1600",
  },
  {
    match: /hirkani/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Cannons_atop_Hirkani_bastion.jpg?width=1600",
  },
  {
    match: /jagadishwar|jagdishwar/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Jagdishwar_Temple.jpg?width=1600",
  },
  {
    match: /nagarkhana/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Nagarkhana%2C_Raigad_Fort%2C_India.jpg?width=1600",
  },
  {
    match: /kondhaneshwar/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Sinhagadfort_konadsheswartemple1_utsav.JPG?width=1600",
  },
  {
    match: /pune.*darw/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Pune_Darwaza_-_Sinhagad_Fort_(2).jpg?width=1600",
  },
  {
    match: /kalyan.*darw/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Kalyan_Darwaza%2C_Sinhgad_fort%2C_Pune.jpg?width=1600",
  },
  {
    match: /tanaji/i,
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Subedar_Tanaji_Malusare_Memorial.jpg?width=1600",
  },
];

function resolveQrHeritageImage(place) {
  const searchText = [place?.name, place?.place_id, place?.qr_id, place?.slug]
    .filter(Boolean)
    .join(" ");
  const matchedRule = QR_HERITAGE_IMAGE_RULES.find(({ match }) =>
    match.test(searchText),
  );

  return matchedRule?.image || resolvePlaceImage(place, firstText(place?.image, place?.images?.[0]));
}

function Icon({ name }) {
  const common = {
    className: "h-5 w-5",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    viewBox: "0 0 24 24",
  };
  const paths = {
    audio: (
      <>
        <path d="M4 9v6h4l5 4V5L8 9H4Z" />
        <path d="M16 8.5a5 5 0 0 1 0 7" />
        <path d="M18.5 6a8 8 0 0 1 0 12" />
      </>
    ),
    calendar: (
      <>
        <path d="M7 3v4" />
        <path d="M17 3v4" />
        <path d="M4 8h16" />
        <path d="M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
      </>
    ),
    crown: (
      <>
        <path d="m3 7 5 4 4-7 4 7 5-4-2 11H5L3 7Z" />
        <path d="M5 18h14" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    coin: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M10 16h4" />
      </>
    ),
    spark: (
      <>
        <path d="M12 3l1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" />
        <path d="M19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
      </>
    ),
    stop: <path d="M7 7h10v10H7z" />,
    temple: (
      <>
        <path d="M3 21h18" />
        <path d="M5 10h14" />
        <path d="M6 10v9" />
        <path d="M10 10v9" />
        <path d="M14 10v9" />
        <path d="M18 10v9" />
        <path d="M4 10 12 4l8 6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.temple}</svg>;
}

function firstText(...values) {
  return (
    values.find(
      (value) =>
        value !== undefined && value !== null && String(value).trim() !== "",
    ) || ""
  );
}

function firstArray(...values) {
  return values.find((value) => Array.isArray(value) && value.length > 0) || [];
}

function displayText(value) {
  return String(value || "").trim() || FALLBACK_TEXT;
}

function formatFee(value) {
  if (value === undefined || value === null || value === "") {
    return FALLBACK_TEXT;
  }

  const fee = Number(value);
  return Number.isFinite(fee)
    ? fee === 0
      ? "Free entry"
      : `Rs ${fee} per person`
    : String(value);
}

function findNarrationVoice(language, availableVoices) {
  const normalizedVoices = availableVoices.map((voice) => ({
    voice,
    lang: String(voice.lang || "").toLowerCase(),
    name: String(voice.name || "").toLowerCase(),
  }));
  const languagePrefixes = language === "mr" ? ["mr", "hi"] : ["en-in", "en"];

  for (const prefix of languagePrefixes) {
    const match = normalizedVoices.find(
      ({ lang, name }) =>
        lang === prefix ||
        lang.startsWith(`${prefix}-`) ||
        (prefix === "mr" && name.includes("marathi")) ||
        (prefix === "hi" && name.includes("hindi")),
    );

    if (match) {
      return match.voice;
    }
  }

  return null;
}

function joinNarrationParts(parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(". ");
}

function normalizeHeritagePlace(place) {
  const ai = place?.ai_content || {};
  const descriptionEn = firstText(
    place?.description_en,
    place?.description,
    ai.overview,
  );
  const descriptionMr = firstText(
    place?.description_mr,
    place?.marathi_description,
    ai.description_mr,
  );
  const historicalImportanceEn = firstText(
    place?.historical_importance_en,
    place?.historical_importance,
    place?.history,
    ai.history,
  );
  const historicalImportanceMr = firstText(
    place?.historical_importance_mr,
    ai.historical_importance_mr,
  );
  const factsEn = firstArray(
    place?.facts_en,
    place?.interesting_facts,
    place?.facts,
    ai.hidden_facts,
  );
  const factsMr = firstArray(place?.facts_mr, ai.facts_mr);
  const dynasty = firstText(place?.dynasty);
  const builder = firstText(place?.builder, place?.built_by);

  return {
    audioEn: firstText(place?.audio_en),
    audioMr: firstText(place?.audio_mr),
    bestTime: firstText(place?.best_time_to_visit),
    builder,
    builderDynasty: [builder, dynasty].filter(Boolean).join(" / "),
    builtYear: firstText(place?.built_year),
    category: firstText(place?.category),
    descriptionEn,
    descriptionMr,
    dynasty,
    entryFee: place?.entry_fee,
    factsEn,
    factsMr,
    heroImage: resolveQrHeritageImage(place),
    historicalImportanceEn,
    historicalImportanceMr,
    name: firstText(place?.name, "Heritage Place"),
    timings: firstText(place?.timings, place?.hours),
  };
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3 text-teal-700">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
          <Icon name={icon} />
        </span>
        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-4 text-lg font-black leading-7 text-slate-950">
        {value}
      </p>
    </div>
  );
}

function TextPanel({ children, icon, lang, title }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 text-teal-700">
        <Icon name={icon} />
        <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      </div>
      <p
        className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700"
        lang={lang}
      >
        {children}
      </p>
    </article>
  );
}

export default function QRHeritagePage() {
  const { id } = useParams();
  const location = useLocation();
  const [place, setPlace] = useState(location.state?.scannedPlace || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [voices, setVoices] = useState([]);
  const [speechState, setSpeechState] = useState({
    language: "",
    status: "idle",
  });
  const utteranceRef = useRef(null);

  const speechSupported =
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
  const heritage = useMemo(() => normalizeHeritagePlace(place), [place]);

  useEffect(() => {
    if (!speechSupported) {
      return undefined;
    }

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
    };
  }, [speechSupported]);

  useEffect(() => {
    let isMounted = true;

    const loadPlace = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getPlaceById(id);
        const data = extractData(response);
        const nextPlace = data?.place || data;

        if (isMounted) {
          setPlace(nextPlace);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            extractMessage(
              loadError,
              "Unable to load heritage information from MongoDB.",
            ),
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadPlace();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const stopNarration = useCallback(() => {
    if (!speechSupported) {
      return;
    }

    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeechState({ language: "", status: "idle" });
  }, [speechSupported]);

  const speak = useCallback(
    (language) => {
      if (!speechSupported) {
        toast.error("Voice narration is not supported in this browser");
        return;
      }

      const text =
        language === "mr"
          ? joinNarrationParts([
              heritage.audioMr,
              heritage.name,
              heritage.descriptionMr,
              heritage.historicalImportanceMr,
              heritage.builtYear && `बांधकाम वर्ष ${heritage.builtYear}`,
              heritage.builder && `निर्माता ${heritage.builder}`,
              heritage.dynasty && `राजवंश ${heritage.dynasty}`,
              heritage.factsMr?.join(". "),
            ])
          : joinNarrationParts([
              heritage.audioEn,
              heritage.name,
              heritage.descriptionEn,
              heritage.historicalImportanceEn,
              heritage.builtYear && `Built year ${heritage.builtYear}`,
              heritage.builder && `Builder ${heritage.builder}`,
              heritage.dynasty && `Dynasty ${heritage.dynasty}`,
              heritage.factsEn?.join(". "),
            ]);

      if (!text) {
        toast.error(
          language === "mr"
            ? "audio_mr is not available in MongoDB"
            : "audio_en is not available in MongoDB",
        );
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === "mr" ? "mr-IN" : "en-IN";
      utterance.rate = language === "mr" ? 0.9 : 0.95;
      utterance.pitch = 1;

      const currentVoices = window.speechSynthesis.getVoices();
      const preferredVoice = findNarrationVoice(
        language,
        currentVoices.length ? currentVoices : voices,
      );

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      }

      utterance.onstart = () => setSpeechState({ language, status: "playing" });
      utterance.onpause = () => setSpeechState({ language, status: "paused" });
      utterance.onresume = () =>
        setSpeechState({ language, status: "playing" });
      utterance.onend = () => {
        utteranceRef.current = null;
        setSpeechState({ language: "", status: "idle" });
      };
      utterance.onerror = (event) => {
        utteranceRef.current = null;
        setSpeechState({ language: "", status: "idle" });
        toast.error(`Voice playback failed${event.error ? `: ${event.error}` : ""}`);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [
      heritage.audioEn,
      heritage.audioMr,
      heritage.name,
      heritage.descriptionEn,
      heritage.descriptionMr,
      heritage.historicalImportanceEn,
      heritage.historicalImportanceMr,
      heritage.builtYear,
      heritage.builder,
      heritage.dynasty,
      heritage.factsEn,
      heritage.factsMr,
      speechSupported,
      voices,
    ],
  );

  const pauseNarration = useCallback(() => {
    if (
      speechSupported &&
      window.speechSynthesis.speaking &&
      !window.speechSynthesis.paused
    ) {
      window.speechSynthesis.pause();
      setSpeechState((current) => ({ ...current, status: "paused" }));
    }
  }, [speechSupported]);

  const resumeNarration = useCallback(() => {
    if (speechSupported && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setSpeechState((current) => ({ ...current, status: "playing" }));
    }
  }, [speechSupported]);

  if (loading && !place) {
    return (
      <div className="container py-16">
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader label="Loading heritage information..." size="lg" />
        </div>
      </div>
    );
  }

  if (error && !place) {
    return (
      <div className="container py-16">
        <div className="rounded-lg border border-rose-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-950">
            Heritage place unavailable
          </h1>
          <p className="mt-3 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const timelineItems = [
    ["Built Year", displayText(heritage.builtYear)],
    ["Builder", displayText(heritage.builder)],
    ["Dynasty", displayText(heritage.dynasty)],
    ["Timings", displayText(heritage.timings)],
  ];

  return (
    <div className="bg-[#f6f3ee] pb-16">
      <section className="relative min-h-[64vh] overflow-hidden bg-slate-950 text-white">
        {heritage.heroImage ? (
          <img
            alt={heritage.name}
            className="absolute inset-0 h-full w-full object-cover opacity-80"
            src={heritage.heroImage}
          />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f172a,#115e59_55%,#7c2d12)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-slate-950/10" />
        <div className="container relative z-10 flex min-h-[64vh] items-end pb-10 pt-24">
          <div className="max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] backdrop-blur-md">
                Digital Heritage Guide
              </span>
              <span className="rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] backdrop-blur-md">
                MongoDB Record
              </span>
            </div>
            <h1 className="mt-6 text-5xl font-black leading-none tracking-normal sm:text-7xl">
              {heritage.name}
            </h1>
            <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-white/85">
              {displayText(heritage.descriptionEn)}
            </p>
          </div>
        </div>
      </section>

      <main className="container -mt-10 space-y-8">
        <section className="relative z-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard
            icon="calendar"
            label="Built Year"
            value={displayText(heritage.builtYear)}
          />
          <InfoCard
            icon="crown"
            label="Builder / Dynasty"
            value={displayText(heritage.builderDynasty)}
          />
          <InfoCard
            icon="clock"
            label="Timings"
            value={displayText(heritage.timings)}
          />
          <InfoCard
            icon="coin"
            label="Entry Fee"
            value={formatFee(heritage.entryFee)}
          />
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="flex items-center gap-3 text-teal-700">
                <Icon name="audio" />
                <h2 className="text-2xl font-black text-slate-950">
                  Audio Narration
                </h2>
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                Narration reads the complete story from MongoDB fields audio_en
                and audio_mr.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => speak("en")}
                disabled={!speechSupported || !heritage.audioEn}
              >
                <Icon name="audio" />
                {speechState.language === "en" &&
                speechState.status === "playing"
                  ? "Playing English"
                  : "Listen in English"}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => speak("mr")}
                disabled={
                  !speechSupported ||
                  (!heritage.audioMr &&
                    !heritage.descriptionMr &&
                    !heritage.historicalImportanceMr)
                }
              >
                <Icon name="audio" />
                {speechState.language === "mr" &&
                speechState.status === "playing"
                  ? "मराठी सुरू आहे"
                  : "मराठीत ऐका"}
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={pauseNarration}
                disabled={speechState.status !== "playing"}
              >
                Pause
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={resumeNarration}
                disabled={speechState.status !== "paused"}
              >
                Resume
              </button>
              <button
                type="button"
                className="btn-secondary btn-sm disabled:cursor-not-allowed disabled:opacity-60"
                onClick={stopNarration}
                disabled={speechState.status === "idle"}
              >
                <Icon name="stop" />
                Stop
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)]">
          <div className="space-y-6">
            <TextPanel icon="temple" title="English Description">
              {displayText(heritage.descriptionEn)}
            </TextPanel>
            <TextPanel icon="temple" lang="mr-IN" title="Marathi Description">
              {displayText(heritage.descriptionMr)}
            </TextPanel>
            <TextPanel icon="spark" title="Historical Importance">
              {displayText(heritage.historicalImportanceEn)}
            </TextPanel>
            <TextPanel icon="spark" lang="mr-IN" title="ऐतिहासिक महत्त्व">
              {displayText(heritage.historicalImportanceMr)}
            </TextPanel>
          </div>

          <aside className="space-y-6">
            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">Timeline</h2>
              <div className="mt-6 space-y-5">
                {timelineItems.map(([label, value]) => (
                  <div
                    key={label}
                    className="relative border-l-2 border-teal-200 pl-5"
                  >
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-teal-600" />
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black leading-6 text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                Historical Facts
              </h2>
              <div className="mt-5 space-y-3">
                {heritage.factsEn.length ? (
                  heritage.factsEn.map((fact, index) => (
                    <div
                      key={`en-${fact}-${index}`}
                      className="flex gap-3 rounded-lg bg-amber-50 p-4 text-slate-800"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-sm font-black text-amber-950">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold leading-6">{fact}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold leading-6 text-slate-600">
                    {FALLBACK_TEXT}
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-black text-slate-950">
                मराठी तथ्ये
              </h2>
              <div className="mt-5 space-y-3" lang="mr-IN">
                {heritage.factsMr.length ? (
                  heritage.factsMr.map((fact, index) => (
                    <div
                      key={`mr-${fact}-${index}`}
                      className="flex gap-3 rounded-lg bg-teal-50 p-4 text-slate-800"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-200 text-sm font-black text-teal-950">
                        {index + 1}
                      </span>
                      <p className="text-sm font-semibold leading-6">{fact}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm font-semibold leading-6 text-slate-600">
                    {FALLBACK_TEXT}
                  </p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}
