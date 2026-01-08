const AUTH_USER_KEY = 'authUser';
const AUTH_PASS_KEY = 'authPass';

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
  window.dispatchEvent(new CustomEvent('authChange'));
};

export const clearAuthCredentials = () => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(AUTH_USER_KEY);
  window.sessionStorage.removeItem(AUTH_PASS_KEY);
  window.dispatchEvent(new CustomEvent('authChange'));
};

export const getAuthHeader = () => {
  const creds = getAuthCredentials();
  if (!creds) return {};
  const token = btoa(`${creds.user}:${creds.pass}`);
  return { Authorization: `Basic ${token}` };
};

// Small helper: attach auth header, and when backend returns 401 we clear stored creds
// so the UI can show the login modal again.
export const authFetch = async (input, init = {}) => {
  const headers = { ...(init.headers || {}), ...getAuthHeader() };
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearAuthCredentials();
  }
  return response;
};
