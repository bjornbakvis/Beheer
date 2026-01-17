import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

// Zelfde knop-stijl als TopNav.jsx / App.jsx
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const ProductRules = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Alleen styling/UX van tabel: sorting zoals App.jsx
  const [sortKey, setSortKey] = useState('validatieregelId'); // validatieregelId | aandResultaatAcceptatie | omschrijving
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  const fetchRules = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        withApiEnv(`/api/products?productId=${encodeURIComponent(productId)}`),
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-store' },
        }
      );
      if (!res.ok) {
        throw new Error(`De acceptatieregels konden niet worden opgehaald`);
      }
      const data = await res.json();
      const validatieregels = Array.isArray(data.Validatieregels)
        ? data.Validatieregels
        : Array.isArray(data.validatieregels)
          ? data.validatieregels
          : Array.isArray(data.Data?.Validatieregels)
            ? data.Data.Validatieregels
            : [];
      setRules(validatieregels);
    } catch (err) {
      setError(err.message);
      setRules([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    const handleEnvChange = () => {
      if (productId) fetchRules();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Alleen UI: sorteren (default op ValidatieregelId)
  const sortedRules = useMemo(() => {
    const items = Array.isArray(rules) ? [...rules] : [];

    const getVal = (r) => {
      const id = r?.ValidatieregelId ?? r?.validatieregelId ?? '';
      const aand = r?.AandResultaatAcceptatie ?? r?.aandResultaatAcceptatie ?? '';
      const oms = r?.Omschrijving ?? r?.omschrijving ?? '';

      if (sortKey === 'validatieregelId') return id;
      if (sortKey === 'aandResultaatAcceptatie') return aand;
      return oms;
    };

    items.sort((a, b) => {
      const av = (getVal(a) ?? '').toString();
      const bv = (getVal(b) ?? '').toString();
      const cmp = av.localeCompare(bv, 'nl', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return items;
  }, [rules, sortKey, sortDir]);

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className={[baseBtn, inactiveBtn, 'inline-flex items-center gap-2'].join(' ')}
          >
            ← Terug
          </button>

          <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
            Acceptatieregels voor product {productId}
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 brand-card dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Overzicht van de acceptatieregels uit deze productdefinitie
            </p>

            <button
              onClick={fetchRules}
              disabled={loading}
              className={[
                baseBtn,
                activeBtn,
                'inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 dark:bg-yellow-900/30 dark:border-yellow-700/60">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5 dark:text-yellow-400" />
              <div>
                <p className="text-sm text-yellow-800 font-medium dark:text-yellow-200">
                  Actie mislukt
                </p>
                <p className="text-xs text-yellow-700 mt-1 dark:text-yellow-200/80">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : (
              <table className="w-full table-fixed">
                {/* zelfde “layout feel” als App.jsx */}
                <colgroup>
                  <col style={{ width: '150px' }} />
                  <col style={{ width: '210px' }} />
                  <col />
                  <col style={{ width: '120px' }} />
                </colgroup>

                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('validatieregelId')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        REGEL ID{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'validatieregelId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('aandResultaatAcceptatie')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        RESULTAAT{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'aandResultaatAcceptatie' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('omschrijving')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        OMSCHRIJVING{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'omschrijving' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      DETAILS
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
                  {sortedRules.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Geen acceptatieregels gevonden
                      </td>
                    </tr>
                  ) : (
                    sortedRules.map((regel) => {
                      const regelId = regel.ValidatieregelId || regel.validatieregelId;
                      const omschrijving = regel.Omschrijving ?? regel.omschrijving ?? '-';
                      const aand = regel.AandResultaatAcceptatie ?? regel.aandResultaatAcceptatie ?? '-';

                      return (
                        <tr key={regelId} className="hover:bg-gray-50 transition-colors dark:hover:bg-slate-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-slate-200">
                            {/* geen functionele wijziging: in ProductRules was dit geen link */}
                            <span className="inline-block">{regelId ?? '-'}</span>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-200">
                            {aand}
                          </td>

                          <td
                            className="px-6 py-4 text-sm text-gray-700 dark:text-slate-200 truncate"
                            title={omschrijving}
                          >
                            {omschrijving}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="w-full flex justify-center">
                              <button
                                onClick={() => navigate(`/rules/${regelId}`)}
                                disabled={!regelId}
                                className="px-3 py-2 border rounded-xl transition-all duration-150 brand-outline disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Toon details"
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductRules;
