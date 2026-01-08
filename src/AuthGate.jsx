import React, { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { getAuthCredentials, setAuthCredentials } from './apiAuth';

// Simple UI gate: if no credentials are stored, hide the app and show a branded modal.
// Note: This keeps using Basic Auth credentials stored in sessionStorage (current approach).

const AuthGate = ({ children }) => {
  const [hasAuth, setHasAuth] = useState(Boolean(getAuthCredentials()));
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const onAuthChange = () => setHasAuth(Boolean(getAuthCredentials()));
    window.addEventListener('authChange', onAuthChange);
    return () => window.removeEventListener('authChange', onAuthChange);
  }, []);

  const canSubmit = useMemo(
    () => user.trim().length > 0 && pass.length > 0,
    [user, pass]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) {
      setError('Vul gebruikersnaam en wachtwoord in.');
      return;
    }
    setAuthCredentials(user.trim(), pass);
    setUser('');
    setPass('');
  };

  if (hasAuth) return children;

  return (
    <div className="min-h-screen brand-page">
      {/* Hard-hide app until auth */}
      <div className="fixed inset-0 bg-white/40 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="brand-modal w-full max-w-md rounded-2xl p-6">
          {/* Logo */}
          <img
            src="/logo.png"
            alt="Applicatie logo"
            className="h-10 object-contain mb-4"
          />

          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-brand-surfaceMuted border border-brand-border flex items-center justify-center">
              <Lock className="w-5 h-5 text-brand-primary" />
            </div>
            <h2 className="text-lg font-semibold text-brand-ink">
              Inloggen
            </h2>
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
              <div className="text-sm text-brand-primary">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed brand-primary"
            >
              Doorgaan
            </button>

            <p className="text-xs text-brand-muted">
              Tip: deze gegevens worden alleen in je browser (sessionStorage) bewaard en verdwijnen bij het sluiten van de tab.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
