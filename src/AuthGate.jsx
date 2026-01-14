import React, { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  getAuthCredentials,
  setAuthCredentials,
  getLastAuthError,
  setLastAuthError,
} from './apiAuth';

const AuthGate = ({ children }) => {
  const [hasAuth, setHasAuth] = useState(Boolean(getAuthCredentials()));
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Als we terugkomen naar login door een 401 ergens, toon die melding
    const last = getLastAuthError();
    if (last) setError(last);

    const onAuthChange = () => {
      setHasAuth(Boolean(getAuthCredentials()));
      // Als creds weg zijn (uitgelogd), laat eventuele last error staan
      // zodat de gebruiker snapt waarom.
      if (!getAuthCredentials()) {
        const e = getLastAuthError();
        if (e) setError(e);
      }
    };

    window.addEventListener('authChange', onAuthChange);
    return () => window.removeEventListener('authChange', onAuthChange);
  }, []);

  const canSubmit = useMemo(
    () => user.trim().length > 0 && pass.length > 0 && !checking,
    [user, pass, checking]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLastAuthError(null);

    if (!user.trim() || !pass) {
      setError('Vul gebruikersnaam en wachtwoord in.');
      return;
    }

    setChecking(true);

    try {
      // 1) Check de combinatie via onze eigen simpele endpoint.
      // Dit staat los van Kinetic/Dias etc.
      const token = btoa(`${user.trim()}:${pass}`);
      const resp = await fetch('/api/login', {
        method: 'GET',
        headers: { Authorization: `Basic ${token}` },
      });

      if (resp.status === 401) {
        // Fout = niet inloggen
        setError('Gebruikersnaam en/of wachtwoord onjuist.');
        return;
      }

      if (!resp.ok) {
        // Jij wil: ook als API’s “stuk” zijn toch kunnen inloggen.
        // /api/login hoort eigenlijk bijna nooit stuk te zijn, maar als dat wel zo is:
        // we laten toch door, met een waarschuwing.
        setError(
          'Let op: inlogcontrole kon niet worden uitgevoerd (serverfout). Je bent toch ingelogd.'
        );
      }

      // 2) Bewaar creds en laat app zien
      setAuthCredentials(user.trim(), pass);
      setUser('');
      setPass('');
    } catch (err) {
      // Network/timeout: toch door laten (zoals jij wilt), met waarschuwing.
      setError(
        'Let op: inlogcontrole kon niet worden uitgevoerd (geen verbinding). Je bent toch ingelogd.'
      );
      setAuthCredentials(user.trim(), pass);
      setUser('');
      setPass('');
    } finally {
      setChecking(false);
    }
  };

  if (hasAuth) return children;

  return (
    <div className="min-h-screen brand-page">
      <div className="fixed inset-0 bg-white/40 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="brand-modal w-full max-w-md rounded-2xl p-6">
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Applicatie logo"
              className="h-10 object-contain"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand-surfaceMuted border border-brand-border flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-lg font-semibold text-brand-ink">Inloggen</h2>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-brand-muted">
                Gebruikersnaam
              </label>
              <input
                autoFocus
                value={user}
                onChange={(e) => setUser(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition"
                placeholder="Vul uw gebruikersnaam in"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted">
                Wachtwoord
              </label>
              <input
                type="password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition"
                placeholder="Vul uw wachtwoord in"
              />
            </div>

            {error ? (
              <div className="text-sm text-red-600">{error}</div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed brand-primary"
            >
              {checking ? 'Controleren...' : 'Doorgaan'}
            </button>

            <p className="text-xs text-brand-muted">
              Tip: deze gegevens worden alleen in je browser bewaard en verdwijnen bij het sluiten van de tab.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
