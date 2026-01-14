const AUTH_USER_KEY = 'authUser';
const AUTH_PASS_KEY = 'authPass';
const AUTH_ERROR_KEY = 'authError';

export const getAuthCredentials = () => {
  if (typeof window === 'undefined') return null;
  const user = window.sessionStorage.getItem(AUTH_USER_KEY) || '';
  const pass = window.sessionStorage.getItem(AUTH_PASS_KEY) || '';
  if (!user || !pass) return null;
  return { user, pass };
};

export const setAuthCredentials = (user, pass) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(AUTH_USER_KEY, user);
  window.sessionStorage.setItem(AUTH_PASS_KEY, pass);
  // Als je succesvol inlogt: verwijder eventuele vorige foutmelding
  window.sessionStorage.removeItem(AUTH_ERROR_KEY);
  window.dispatchEvent(new CustomEvent('authChange'));
};

export const clearAuthCredentials = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AUTH_USER_KEY);
  window.sessionStorage.removeItem(AUTH_PASS_KEY);
  window.dispatchEvent(new CustomEvent('authChange'));
};

// Nieuw: opslag van auth error zodat de UI een melding kan tonen
export const setAuthError = (code) => {
  if (typeof window === 'undefined') return;
  if (code) {
    window.sessionStorage.setItem(AUTH_ERROR_KEY, code);
  } else {
    window.sessionStorage.removeItem(AUTH_ERROR_KEY);
  }
  window.dispatchEvent(new CustomEvent('authErrorChange'));
};

export const getAuthError = () => {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(AUTH_ERROR_KEY);
};

export const clearAuthError = () => setAuthError(null);

// Kleine uitbreiding: header kunnen maken met “override” creds (voor login-check)
export const getAuthHeader = (credsOverride = null) => {
  const creds = credsOverride || getAuthCredentials();
  if (!creds) return {};
  const token = btoa(`${creds.user}:${creds.pass}`);
  return { Authorization: `Basic ${token}` };
};

// Upgrade: bij 401 slaan we een authError op, en wissen we creds zodat login modal terugkomt.
export const authFetch = async (input, init = {}) => {
  const headers = { ...(init.headers || {}), ...getAuthHeader() };
  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    setAuthError('unauthorized');
    clearAuthCredentials();
  }

  return response;
};
