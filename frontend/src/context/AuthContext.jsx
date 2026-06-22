import { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { getMe, logout as logoutRequest } from '../api/authApi';
import { extractData } from '../api/responseUtils';

const AuthContext = createContext(null);

/**
 * Provides JWT auth state and convenience helpers across the application.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('tourvision_token'));
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('tourvision_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      if (!token) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await getMe();
        const data = extractData(response);
        const nextUser = data?.user || null;

        if (isMounted && nextUser) {
          localStorage.setItem('tourvision_user', JSON.stringify(nextUser));
          setUser(nextUser);
        }
      } catch (error) {
        if (isMounted) {
          localStorage.removeItem('tourvision_token');
          localStorage.removeItem('tourvision_user');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = (authPayload) => {
    const nextToken = authPayload?.token || authPayload?.accessToken;
    const nextUser = authPayload?.user || null;

    if (nextToken) {
      localStorage.setItem('tourvision_token', nextToken);
      setToken(nextToken);
    }

    if (nextUser) {
      localStorage.setItem('tourvision_user', JSON.stringify(nextUser));
      setUser(nextUser);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutRequest();
      }
    } catch (error) {
      // Local logout still proceeds.
    }

    localStorage.removeItem('tourvision_token');
    localStorage.removeItem('tourvision_user');
    setToken(null);
    setUser(null);
  };

  const updateUser = (nextUser) => {
    localStorage.setItem('tourvision_user', JSON.stringify(nextUser));
    setUser(nextUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token),
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
