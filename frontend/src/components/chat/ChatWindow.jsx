import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { sendMessage } from '../../api/chatApi';
import { extractData, extractMessage } from '../../api/responseUtils';
import ChatMessage from './ChatMessage';
import Loader from '../common/Loader';

/**
 * Floating global AI chat surface with contextual place-aware messaging.
 */
export default function ChatWindow({ contextPlaceId, isOpen, onClose }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Ask about nearby places, routes, budgets, or the current landmark.'
    }
  ]);
  const streamTimerRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleNarration = (event) => {
      const payload = event.detail || {};
      const payloadPlaceId = payload.placeId || payload.place_id;

      if (payloadPlaceId && contextPlaceId && String(payloadPlaceId) !== String(contextPlaceId)) {
        return;
      }

      if (payload.caption || payload.text) {
        setMessages((current) => [
          ...current,
          {
            id: `narration-${Date.now()}`,
            role: 'assistant',
            content: payload.caption || payload.text
          }
        ]);
      }
    };

    window.addEventListener('tourvision:narration', handleNarration);
    return () => window.removeEventListener('tourvision:narration', handleNarration);
  }, [contextPlaceId]);

  useEffect(() => () => window.clearInterval(streamTimerRef.current), []);

  const streamReply = (text) => {
    const replyId = `assistant-${Date.now()}`;
    let index = 0;

    setMessages((current) => [...current, { id: replyId, role: 'assistant', content: '' }]);

    window.clearInterval(streamTimerRef.current);
    streamTimerRef.current = window.setInterval(() => {
      index += 5;
      setMessages((current) =>
        current.map((message) =>
          message.id === replyId ? { ...message, content: text.slice(0, index) } : message
        )
      );

      if (index >= text.length) {
        window.clearInterval(streamTimerRef.current);
      }
    }, 18);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!input.trim()) {
      return;
    }

    const outgoingMessage = input.trim();
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
        place_id: contextPlaceId || undefined,
        geofence_zone: 'general'
      });
      const data = extractData(response);

      const replyText =
        data?.reply ||
        data?.message ||
        data?.text ||
        'I received your message, but the guide did not return any text.';

      streamReply(replyText);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: extractMessage(error, 'The chat service is unavailable right now.')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md lg:right-8 lg:left-auto lg:bottom-8">
      <div className="panel-strong overflow-hidden bg-slate-950 text-white shadow-soft border border-slate-800">
        <div className="flex items-center justify-between border-b border-slate-700/80 bg-slate-950 px-4 py-4">
          <div>
            <h2 className="font-heading text-xl">AI Guide</h2>
            <p className="text-xs text-slate-400">
              {contextPlaceId ? `Contextual help for place #${contextPlaceId}` : 'Global travel assistant'}
            </p>
          </div>
          <button type="button" className="btn-secondary px-3 py-2 text-sm text-slate-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div ref={scrollRef} className="max-h-90 space-y-3 overflow-y-auto bg-slate-950 px-4 py-4">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>

        <form className="border-t border-slate-700/80 bg-slate-950 p-4" onSubmit={handleSubmit}>
          <textarea
            className="field min-h-22 resize-none bg-slate-900 text-white border-slate-700 placeholder:text-slate-500"
            placeholder="Ask about the current place, routes, budgets, or nearby recommendations..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            {loading ? <Loader label="Streaming..." size="sm" /> : <span className="text-xs text-slate-400">Responses stream into the chat window.</span>}
            <button type="submit" className="btn-primary px-4 py-2 text-sm" disabled={loading}>
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

ChatWindow.propTypes = {
  contextPlaceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  isOpen: PropTypes.bool,
  onClose: PropTypes.func.isRequired
};

ChatWindow.defaultProps = {
  contextPlaceId: null,
  isOpen: false
};
