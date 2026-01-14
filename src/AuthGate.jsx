import React, { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  clearAuthError,
  getAuthError,
  getAuthHeader,
  getAuthCredentials,
  setAuthCredentials,
} from './apiAuth';
import { withApiEnv } from './apiEnv';

/**
 * AuthGate
 *
 * - Blokkeert de app totdat geldige Basic Auth credentials zijn ingevoerd
 * - Toont een modal met gebruikersnaam + wachtwoord
 * - Geeft een rode foutmelding bij onjuist wachtwoord
 * - Voorkomt "stil terugverspringen" naar home
 */

const AuthGate = ({ children }) => {
  const [hasAuth, setHasAuth] = useState(Boolean(getAuthCredentials()));
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);

  // Luister naar login / logout
  useEffect(() => {
    const onAuthChange = () => {
      setHasAuth(Boolean(getAuthCredentials()));
    };
    window.addEventListener('authChange', onAuthChange);
    return () => window.removeEventListener('authChange', onAuthChange);
  }, []);

  // Toon foutmelding bij 401 vanuit API
  useEffect(() => {
    const handleAuthError = () => {
      const code = getAuthError();
      if (code === 'unauthorized') {
        setError('Onjuist gebruikersnaam of wachtwoord.');
        clearAuthError();
      }
    };

    handleAuthError();
    window.addEventListener('authErrorChange', handleAuthError);
    return () =>
      window.removeEventListener('authErrorChange', handleAuthError);
  }, []);

  const canSubmit = useMemo(() => {
    return user.trim().length > 0 && pass.length > 0 && !checking;
  }, [user, pass, checking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const u = user.trim();
    const p = pass;

    if (!u || !p) {
      setError('Vul gebruikersnaam en wachtwoord in.');
      return;
    }

    setChecking(true);

    try {
      // Eerst credentials controleren tegen een beveiligd endpoint
      const testUrl = withApiEnv('/api/products');
      const res = await fetch(testUrl, {
        headers: {
          ...getAuthHeader({ user: u, pass: p }),
        },
      });

      if (res.status === 401) {
        setError('Onjuist gebruikersnaam of wachtwoord.');
        return;
      }

      if (!res.ok) {
        setError('Inloggen lukt nu niet. Probeer het opnieuw.');
        return;
      }

      // Succesvol → credentials opslaan
      setAuthCredentials(u, p);
      setUser('');
      setPass('');
    } catch (err) {
      setError(
        'Inloggen lukt nu niet. Controleer je internetverbinding en probeer het opnieuw.'
      );
    } finally {
      setChecking(false);
    }
  };

  // Ingelogd → app tonen
  if (hasAuth) {
    return children;
  }

  // Niet ingelogd → login modal
  return (
    <div className="min-h-screen brand-page">
      {/* App blokkeren */}
      <div className="fixed inset-0 bg-white/40 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="brand-modal w-full max-w-md rounded-2xl p-6">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img
              src="/logo.png"
              alt="Applicatie logo"
              className="h-10 object-contain"
            />
          </div>

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
                onChange={(e) => {
                  setUser(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-xl text-brand-ink bg-white/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
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
                onChange={(e) => {
                  setPass(e.target.value);
                  if (error) setError(null);
                }}
                className="mt-1 w-full px-3 py-2 border border-brand-border rounded-xl text-brand-ink bg-white/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
                placeholder="Vul uw wachtwoord in"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full px-4 py-2.5 rounded-xl text-white font-medium disabled:opacity-60 brand-primary"
            >
              {checking ? 'Inloggen…' : 'Doorgaan'}
            </button>

            <p className="text-xs text-brand-muted">
              Deze gegevens worden alleen in je browser bewaard en verdwijnen
              bij het sluiten van de tab.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthGate;
