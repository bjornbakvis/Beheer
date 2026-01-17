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

// Recursief zoeken naar alle IsVanToepassingAls-blokken in een JSON object
const findIsVanToepassingAls = (node, path = 'root', out = []) => {
  if (node === null || node === undefined) return out;

  if (Array.isArray(node)) {
    node.forEach((item, idx) => findIsVanToepassingAls(item, `${path}[${idx}]`, out));
    return out;
  }

  if (typeof node !== 'object') return out;

  Object.entries(node).forEach(([key, value]) => {
    const nextPath = path ? `${path}.${key}` : key;

    if (key === 'IsVanToepassingAls' && Array.isArray(value)) {
      value.forEach((cond, idx) => {
        out.push({
          id: `${nextPath}[${idx}]`,
          path: nextPath,
          objectcodeId: cond?.ObjectcodeId ?? cond?.objectcodeId ?? '',
          waardesCount: Array.isArray(cond?.Waardes) ? cond.Waardes.length : Array.isArray(cond?.waardes) ? cond.waardes.length : 0,
          rekenregels: Array.isArray(cond?.Rekenregels)
            ? cond.Rekenregels
            : Array.isArray(cond?.rekenregels)
              ? cond.rekenregels
              : [],
        });
      });
    } else {
      findIsVanToepassingAls(value, nextPath, out);
    }
  });

  return out;
};

const formatRekenregels = (regels) => {
  if (!Array.isArray(regels) || regels.length === 0) return '-';
  // Compacte weergave: Operator + aantallen waardes
  return regels
    .map((r) => {
      const op = (r?.Operator ?? r?.operator ?? '').toString() || 'Onbekend';
      const w = Array.isArray(r?.Waardes) ? r.Waardes.length : Array.isArray(r?.waardes) ? r.waardes.length : 0;
      return `${op} (${w})`;
    })
    .join(', ');
};

const ProductDynamiekregels = () => {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [rawData, setRawData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDynamiek = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(withApiEnv(`/api/products?productId=${encodeURIComponent(productId)}`), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      });

      if (!res.ok) {
        throw new Error('De productdefinitie kon niet worden opgehaald');
      }

      const data = await res.json();
      setRawData(data);

      // Zoek alle ingebedde IsVanToepassingAls blokken
      const found = findIsVanToepassingAls(data, 'data', []);
      setItems(found);
    } catch (err) {
      setError(err.message);
      setItems([]);
      setRawData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDynamiek();
    const handleEnvChange = () => {
      if (productId) fetchDynamiek();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const rows = useMemo(() => {
    return Array.isArray(items) ? items : [];
  }, [items]);

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
            Dynamiek voor product {productId}
          </h1>
        </div>

        <div className="rounded-2xl border border-gray-200 brand-card dark:border-slate-700">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-slate-300">
              Overzicht van alle “IsVanToepassingAls” dynamiek-blokken in deze productdefinitie
            </p>

            <button
              onClick={fetchDynamiek}
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
            <div className="mx-6 mt-6 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 dark:bg-yellow-900/30 dark:border-yellow-700/60">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5 dark:text-yellow-400" />
              <div>
                <p className="text-sm text-yellow-800 font-medium dark:text-yellow-200">Actie mislukt</p>
                <p className="text-xs text-yellow-700 mt-1 dark:text-yellow-200/80">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : error ? null : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '260px' }} />
                  <col style={{ width: '140px' }} />
                  <col style={{ width: '160px' }} />
                  <col />
                </colgroup>

                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      LOCATIE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      OBJECTCODE ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      WAARDES
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      REKENREGELS
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Geen dynamiek gevonden
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-slate-800">
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-200 truncate" title={r.path}>
                          {r.path}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-slate-200">
                          {r.objectcodeId !== '' ? r.objectcodeId : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-200">
                          {Number.isFinite(r.waardesCount) ? r.waardesCount : 0}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-200 truncate" title={formatRekenregels(r.rekenregels)}>
                          {formatRekenregels(r.rekenregels)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* rawData wordt niet getoond; alleen bewaard voor eventueel debuggen later */}
        </div>
      </div>
    </div>
  );
};

export default ProductDynamiekregels;
