import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getApiEnv, setApiEnv } from './apiEnv';
import { clearAuthCredentials, getAuthCredentials } from './apiAuth';
import logo from './logo.png';

const navLinkClasses = ({ isActive }) =>
  `px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
    isActive
      ? 'bg-brand-primary text-white border-transparent'
      : 'bg-white text-brand-ink border-brand-border hover:bg-brand-surfaceMuted'
  }`;

const TopNav = () => {
  const navigate = useNavigate();
  const [apiEnv, setApiEnvState] = useState(getApiEnv());
  const [hasAuth, setHasAuth] = useState(Boolean(getAuthCredentials()));

  const handleEnvChange = (event) => {
    const nextEnv = event.target.value;
    setApiEnvState(nextEnv);
    setApiEnv(nextEnv);
  };

  useEffect(() => {
    const handleAuthChange = () => {
      setHasAuth(Boolean(getAuthCredentials()));
    };
    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  const handleLogout = () => {
    clearAuthCredentials();
  };

  return (
    <nav className="bg-white/80 border-b border-brand-border backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-brand-ink font-semibold text-lg tracking-tight"
          aria-label="Ga naar Acceptatieregels"
        >
          <img src={logo} alt="Sleutelstad Assuradeuren" className="h-8 w-auto" />
          <span className="hidden sm:inline">Acceptatiebeheer</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <label className="text-xs font-medium text-brand-muted" htmlFor="api-env">
              Omgeving
            </label>
            <select
              id="api-env"
              value={apiEnv}
              onChange={handleEnvChange}
              className="px-2 py-1.5 border border-brand-border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition"
            >
              <option value="production">Productie</option>
              <option value="acceptance">Acceptatie</option>
            </select>
          </div>
          <NavLink to="/" className={navLinkClasses} end>
            Acceptatieregels
          </NavLink>
          <NavLink to="/producten" className={navLinkClasses}>
            Producten
          </NavLink>
          {hasAuth ? (
            <button
              onClick={handleLogout}
              className="text-xs font-medium px-3 py-1.5 rounded-xl border border-brand-border text-brand-muted hover:bg-brand-surfaceMuted transition-colors"
            >
              Uitloggen
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
