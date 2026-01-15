import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle, Pencil, X } from 'lucide-react';
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
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRuleId, setEditRuleId] = useState(null);
  const [editOmschrijving, setEditOmschrijving] = useState('');
  const [editExpressie, setEditExpressie] = useState('');
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

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
        throw new Error(`Failed to fetch product rules (status ${res.status})`);
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

  const handleDelete = async (regelId) => {
    if (!regelId) return;
    setDeletingId(regelId);
    setError(null);
    try {
      const response = await authFetch(
        withApiEnv(`/api/acceptance-rules?regelId=${encodeURIComponent(regelId)}`),
        {
          method: 'DELETE',
          headers: { 'Cache-Control': 'no-store' },
        }
      );
      if (!response.ok) {
        let message = `Failed to delete rule (status ${response.status})`;
        try {
          const payload = await response.json();
          message = payload.message || payload.error || message;
        } catch (err) {
          // ignore JSON parse failure
        }
        throw new Error(message);
      }
      setRules((prev) =>
        prev.filter((regel) => (regel.ValidatieregelId || regel.validatieregelId) !== regelId)
      );
      setShowDeleteSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openEditModal = (regelId, omschrijvingValue, expressieValue) => {
    setEditRuleId(regelId);
    setEditOmschrijving(omschrijvingValue || '');
    setEditExpressie(expressieValue || '');
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError(null);

    if (!editRuleId) {
      setEditError('RegelId ontbreekt.');
      return;
    }
    if (!editOmschrijving.trim()) {
      setEditError('Omschrijving is verplicht.');
      return;
    }
    if (!editExpressie.trim()) {
      setEditError('Xpath expressie is verplicht.');
      return;
    }

    setEditSubmitting(true);
    try {
      const resourceId = crypto?.randomUUID ? crypto.randomUUID() : undefined;
      const payload = {
        RegelId: editRuleId,
        Omschrijving: editOmschrijving.trim(),
        Expressie: editExpressie.trim(),
        ResourceId: resourceId,
      };
      const response = await authFetch(withApiEnv('/api/acceptance-rules'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to update rule (status ${response.status})`;
        try {
          const payloadError = await response.json();
          message = payloadError.message || payloadError.error || message;
        } catch (err) {
          // ignore JSON parse failure
        }
        throw new Error(message);
      }

      setShowEditModal(false);
      setEditRuleId(null);
      setEditOmschrijving('');
      setEditExpressie('');
      fetchRules();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

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
                  Kon acceptatieregels niet laden
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
                  <col style={{ width: '150px' }} />
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
                        VALIDATIEREGEL ID{' '}
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
                        AANDRESULTAATACCEPTATIE{' '}
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      AANPASSEN
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
                  {sortedRules.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Geen acceptatieregels gevonden
                      </td>
                    </tr>
                  ) : (
                    sortedRules.map((regel) => {
                      const regelId = regel.ValidatieregelId || regel.validatieregelId;

                      // EXACT: alleen als AandHerkomstValidatieRegel === 'Tp'
                      const isTp = (regel.AandHerkomstValidatieRegel ?? '') === 'Tp';

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

                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <div className="w-full flex justify-center">
                              {isTp ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      openEditModal(
                                        regelId,
                                        regel.Omschrijving || regel.omschrijving || '',
                                        regel.Expressie || regel.expressie || ''
                                      )
                                    }
                                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                    title="Bewerk acceptatieregel"
                                    aria-label={`Bewerk acceptatieregel ${regelId}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>

                                  <button
                                    onClick={() => handleDelete(regelId)}
                                    disabled={deletingId === regelId}
                                    className="p-2 rounded-md border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                    title="Verwijder acceptatieregel"
                                    aria-label={`Verwijder acceptatieregel ${regelId}`}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400" title="Alleen TP-regels zijn aanpasbaar">
                                  —
                                </span>
                              )}
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

      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm border border-gray-200 dark:bg-slate-900 dark:border-slate-700 neon-modal">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Melding</p>
              <button
                onClick={() => setShowDeleteSuccess(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit melding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-5 text-sm text-gray-700 dark:text-slate-200">
              Acceptatieregel succesvol verwijderd
            </div>
            <div className="px-4 py-3 flex justify-end">
              <button onClick={() => setShowDeleteSuccess(false)} className={[baseBtn, inactiveBtn].join(' ')}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg border border-gray-200 dark:bg-slate-900 dark:border-slate-700 neon-modal">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">
                Bewerk acceptatieregel {editRuleId}
              </p>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit formulier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-omschrijving">
                  Omschrijving
                </label>
                <input
                  id="edit-omschrijving"
                  type="text"
                  value={editOmschrijving}
                  onChange={(event) => setEditOmschrijving(event.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-expressie">
                  Aangepaste Xpath expressie
                </label>
                <textarea
                  id="edit-expressie"
                  rows="5"
                  value={editExpressie}
                  onChange={(event) => setEditExpressie(event.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {editError && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2 dark:bg-red-900/30 dark:border-red-700/60 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={[baseBtn, inactiveBtn].join(' ')}
                >
                  Annuleren
                </button>

                <button
                  type="submit"
                  disabled={editSubmitting}
                  className={[baseBtn, activeBtn, 'px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed'].join(' ')}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductRules;
