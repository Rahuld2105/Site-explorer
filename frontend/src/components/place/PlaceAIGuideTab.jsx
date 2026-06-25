import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { sendMessage } from '../../api/chatApi';
import { extractData, extractMessage } from '../../api/responseUtils';
import Loader from '../common/Loader';

const QUICK_SUGGESTIONS = [
  { label: 'Tell me History', message: 'Tell me History' },
  { label: 'Architecture', message: 'Architecture' },
  { label: 'Hidden Facts', message: 'Hidden Facts' },
  { label: 'Ask Anything', focusInput: true }
];

function buildSelectedPlacePayload(place) {
  if (!place) {
    return undefined;
  }

  return {
    id: place.place_id || place.id || place._id || place.slug,
    place_id: place.place_id,
    slug: place.slug,
    name: place.name
  };
}

function buildWelcomeMessage(place) {
  const placeName = place?.name || 'this place';

  return `You are exploring ${placeName}.\n\nAsk for its history, architecture, hidden stories, cultural meaning, or anything you want to understand more deeply.`;
}

export default function PlaceAIGuideTab({ place }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: buildWelcomeMessage(place)
    }
  ]);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages([
      {
        id: `welcome-${place?.place_id || place?.id || place?.slug || place?.name || 'place'}`,
        role: 'assistant',
        content: buildWelcomeMessage(place)
      }
    ]);
  }, [place?.id, place?.name, place?.place_id, place?.slug]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendAiMessage = async (message) => {
    const outgoingMessage = String(message || '').trim();

    if (!outgoingMessage) {
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: outgoingMessage
      }
    ]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage({
        message: outgoingMessage,
        place_id: place?.place_id || place?.id || place?._id || place?.slug,
        selected_place: buildSelectedPlacePayload(place),
        geofence_zone: 'general',
        current_page: 'Place'
      });
      const data = extractData(response);
      const replyText = data?.reply || data?.message || data?.text;

      if (!replyText) {
        throw new Error('Empty AI response');
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: replyText
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: extractMessage(error, 'AI Heritage Guide is temporarily unavailable.')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await sendAiMessage(input);
  };

  return (
    <section className="rounded-lg border border-sky-100 bg-white p-6 shadow-[var(--shadow-card)]">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">AI Heritage Guide</p>
        <h3 className="mt-1 text-xl font-bold text-slate-950">Ask About This Monument</h3>
      </div>

      <div ref={scrollRef} className="mt-5 max-h-96 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg px-4 py-3 text-sm leading-6 ${
              message.role === 'user'
                ? 'ml-auto max-w-[85%] bg-teal-600 text-white'
                : 'mr-auto max-w-[92%] border border-slate-200 bg-white text-slate-700'
            }`}
          >
            <p className="whitespace-pre-line">{message.content}</p>
          </div>
        ))}
        {loading ? <Loader label="Preparing heritage context..." size="sm" /> : null}
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {QUICK_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            type="button"
            className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-sky-300 hover:text-sky-700 disabled:cursor-wait disabled:opacity-60"
            disabled={loading}
            onClick={() => {
              if (suggestion.focusInput) {
                inputRef.current?.focus();
                return;
              }

              sendAiMessage(suggestion.message);
            }}
          >
            {suggestion.label}
          </button>
        ))}
      </div>

      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
        <textarea
          ref={inputRef}
          className="field min-h-24 resize-none"
          placeholder="Ask about history, architecture, hidden stories, rulers, events, or cultural meaning..."
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit" className="btn-primary self-end px-5 py-3" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

PlaceAIGuideTab.propTypes = {
  place: PropTypes.shape({
    _id: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    name: PropTypes.string,
    place_id: PropTypes.string,
    slug: PropTypes.string
  })
};

PlaceAIGuideTab.defaultProps = {
  place: null
};
