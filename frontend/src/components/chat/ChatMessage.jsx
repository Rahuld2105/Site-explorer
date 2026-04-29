import PropTypes from 'prop-types';

/**
 * Individual chat bubble inside the floating AI assistant.
 */
export default function ChatMessage({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div
        className={[
          'max-w-[85%] rounded-xl px-4 py-3 text-sm leading-6 shadow-soft',
          isAssistant
            ? 'bg-slate-800 text-slate-100 border border-slate-700'
            : 'bg-sky-500 text-white'
        ].join(' ')}
      >
        {message.content}
      </div>
    </div>
  );
}

ChatMessage.propTypes = {
  message: PropTypes.shape({
    content: PropTypes.string.isRequired,
    role: PropTypes.oneOf(['assistant', 'user']).isRequired
  }).isRequired
};
