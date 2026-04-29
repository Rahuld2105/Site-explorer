import { Navigate } from 'react-router-dom';

/**
 * Keeps the legacy expense route working by forwarding to the trip-based system.
 */
export default function ExpenseTrackerPage() {
  return <Navigate replace to="/trips" />;
}
