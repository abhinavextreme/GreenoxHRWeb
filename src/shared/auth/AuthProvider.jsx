import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API, PLATFORM, ROUTES } from '../../constants/index.js';
import { disableWebPush, enableWebPush } from '../../services/push.js';
import { api, clearTokens, loadTokens, saveTokens } from '../api/client.js';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { accessToken } = loadTokens();
    if (!accessToken) {
      setReady(true);
      return;
    }
    api(API.me)
      .then((me) => {
        setSession(me);
        if (!me.user?.mustChangePassword) enableWebPush().catch(() => {});
      })
      .catch(() => {
        clearTokens();
        setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const auth = useMemo(() => ({
    session,
    ready,
    async login(email, password) {
      const data = await api(API.login, {
        method: 'POST',
        body: { email, password, platform: PLATFORM.web },
        token: '',
      });
      saveTokens(data.accessToken, data.refreshToken);
      const me = { user: data.user, employee: data.employee, outletAccess: data.outletAccess };
      setSession(me);
      if (!data.user.mustChangePassword) enableWebPush().catch(() => {});
      navigate(data.user.mustChangePassword ? ROUTES.password : ROUTES.home);
      return me;
    },
    async logout() {
      const { refreshToken } = loadTokens();
      try {
        await disableWebPush();
        if (refreshToken) await api(API.logout, { method: 'POST', body: { refreshToken } });
      } catch {
        // The local session still ends if the token is already gone.
      }
      clearTokens();
      setSession(null);
      navigate(ROUTES.login);
    },
    replaceSession(next) {
      setSession(next);
    },
  }), [navigate, ready, session]);

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
