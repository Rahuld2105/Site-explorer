import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Reusable sidebar navigation item with active styling and collapsed tooltip support.
 */
export default function SidebarItem({
  icon,
  isActive,
  isCollapsed,
  label,
  onClick,
  showTooltip,
  to
}) {
  return (
    <div className="group relative">
      <Link
        to={to}
        onClick={onClick}
        aria-current={isActive ? 'page' : undefined}
        aria-label={isCollapsed ? label : undefined}
        title={isCollapsed ? label : undefined}
        className={[
          'relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60 focus-visible:ring-offset-2',
          isCollapsed ? 'justify-center' : 'justify-start',
          isActive
            ? 'bg-teal-50 text-teal-700 shadow-sm'
            : 'text-slate-600 hover:bg-gray-100 hover:text-slate-900'
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-teal-500 transition-opacity duration-300',
            isActive ? 'opacity-100' : 'opacity-0'
          ].join(' ')}
        />
        <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-slate-700 shadow-sm ring-1 ring-slate-200/80">
          {icon}
        </span>
        <span
          className={[
            'relative z-10 whitespace-nowrap transition-all duration-300',
            isCollapsed ? 'w-0 translate-x-2 opacity-0' : 'w-auto translate-x-0 opacity-100'
          ].join(' ')}
        >
          {label}
        </span>
      </Link>

      {showTooltip && isCollapsed ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2 rounded-lg bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {label}
        </span>
      ) : null}
    </div>
  );
}

SidebarItem.propTypes = {
  icon: PropTypes.node.isRequired,
  isActive: PropTypes.bool,
  isCollapsed: PropTypes.bool,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  showTooltip: PropTypes.bool,
  to: PropTypes.string.isRequired
};

SidebarItem.defaultProps = {
  isActive: false,
  isCollapsed: false,
  onClick: undefined,
  showTooltip: true
};
