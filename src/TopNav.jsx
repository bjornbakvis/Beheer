import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getApiEnv, setApiEnv } from './apiEnv';
import { clearAuthCredentials, getAuthCredentials } from './apiAuth';

// Eén consistente knop-stijl voor alles in de nav (tabs, omgeving, uitloggen)
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';

const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const tabClasses = ({ isActive }) =>
  [baseBtn, isActive ? activeBtn : inactiveBtn].join(' ');

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
    <nav className="bg-white/80 border-b border-gray-200 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-gray-900 font-semibold text-lg tracking-tight"
          aria-label="Ga naar Acceptatieregels"
        >
          <img src="/logo.png" alt="Sleutelstad" className="h-8 w-auto" />
          <span className="hidden sm:inline">Acceptatiebeheer</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Omgeving (zelfde hoogte/lettertype als tabs) */}
          <div className="hidden sm:flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600" htmlFor="api-env">
              Omgeving
            </label>
            <select
              id="api-env"
              value={apiEnv}
              onChange={handleEnvChange}
              className={[baseBtn, inactiveBtn].join(' ')}
            >
              <option value="production">Productie</option>
              <option value="acceptance">Acceptatie</option>
            </select>
          </div>

          {/* Tabs */}
          <NavLink to="/" className={tabClasses} end>
            Acceptatieregels
          </NavLink>
          <NavLink to="/producten" className={tabClasses}>
            Producten
          </NavLink>

          {/* Uitloggen (EXACT gelijk aan inactieve tabs) */}
          {hasAuth ? (
            <button onClick={handleLogout} className={[baseBtn, inactiveBtn].join(' ')}>
              Uitloggen
            </button>
          ) : null}
        </div>
      </div>
    </nav>
  );
};

export default TopNav;
