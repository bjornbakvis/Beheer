import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, AlertCircle, Pencil, X, Search } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

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

  // UI-only
  const [query, setQuery] = useState('');

  const fetchRules = async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(withApiEnv(`/api/products?productId=${encodeURIComponent(productId)}`), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      });
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
        prev.filter(
          (regel) =>
            (regel.ValidatieregelId || regel.validatieregelId) !== regelId
        )
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

  // -----------------------
  // Helpers for display
  // -----------------------
  const normalizeId = (r) => r?.ValidatieregelId ?? r?.validatieregelId ?? '';
  const normalizeOmschrijving = (r) => r?.Omschrijving ?? r?.omschrijving ?? '';
  const normalizeAand = (r) => r?.AandResultaatAcceptatie ?? r?.aandResultaatAcceptatie ?? null;

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Array.isArray(rules) ? rules : [];

    // sort by id (string/number safe)
    const sorted = [...list].sort((a, b) => {
      const aId = String(normalizeId(a) ?? '');
      const bId = String(normalizeId(b) ?? '');
      return aId.localeCompare(bId, 'nl', { numeric: true, sensitivity: 'base' });
    });

    if (!q) return sorted;

    return sorted.filter((r) => {
      const id = String(normalizeId(r) ?? '').toLowerCase();
      const oms = String(normalizeOmschrijving(r) ?? '').toLowerCase();
      return id.includes(q) || oms.includes(q);
    });
  }, [rules, query]);

  const totalCount = rules.length;
  const shownCount = filteredRules.length;

  const Badge = ({ value }) => {
    // value can be boolean, "J"/"N", "true"/"false", 1/0, etc.
    const v = value;
    const truthy =
      v === true ||
      v === 1 ||
      v === '1' ||
      String(v).toLowerCase() === 'true' ||
      String(v).toLowerCase() === 'ja' ||
      String(v).toLowerCase() === 'j';

    const falsy =
      v === false ||
      v === 0 ||
      v === '0' ||
      String(v).toLowerCase() === 'false' ||
      String(v).toLowerCase() === 'nee' ||
      String(v).toLowerCase() === 'n';

    if (truthy) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-700">
          Ja
        </span>
      );
    }
    if (falsy) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-red-200 bg-red-50 text-red-700">
          Nee
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border border-gray-200 bg-gray-50 text-gray-700">
        Onbekend
      </span>
    );
  };

  return (
    <div className="min-h-screen brand-page">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-border text-brand-ink hover:bg-brand-surfaceMuted transition-colors"
          >
            ← Terug
          </button>
          <h1 className="text-2xl font-semibold text-brand-ink">
            Acceptatieregels voor product {productId}
          </h1>
        </div>

        <div className="rounded-2xl border border-brand-border brand-card">
          <div className="p-6 border-b border-brand-border flex items-start md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-brand-muted">
                Overzicht van validatieregels uit de productdefinitie
              </p>
              <p className="text-xs text-brand-muted mt-1">
                {shownCount} van {totalCount} regels
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-brand-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Zoek op regel-id of omschrijving…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/40 focus:border-brand-primary transition"
                />
              </div>

              <button
                onClick={fetchRules}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 text-white rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition brand-primary"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Kon acceptatieregels niet laden</p>
                <p className="text-xs text-yellow-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-brand-surfaceMuted border-b border-brand-border">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Regel ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Acceptatie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Omschrijving
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Acties
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-brand-border">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center">
                        <p className="text-sm text-brand-muted">
                          {totalCount === 0 ? 'Geen acceptatieregels gevonden' : 'Geen regels matchen je zoekopdracht'}
                        </p>
                        {totalCount > 0 ? (
                          <button
                            onClick={() => setQuery('')}
                            className="mt-3 px-3 py-2 text-sm font-medium rounded-xl border border-brand-border hover:bg-brand-surfaceMuted transition"
                          >
                            Zoekopdracht wissen
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((regel) => {
                      const rid = regel.ValidatieregelId || regel.validatieregelId;

                      return (
                        <tr key={rid}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                            {rid ?? '-'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <Badge value={normalizeAand(regel)} />
                          </td>

                          <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-200">
                            {normalizeOmschrijving(regel) || '-'}
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => navigate(`/rules/${rid}`)}
                              disabled={!rid}
                              className="px-3 py-2 border border-blue-100 text-blue-700 rounded-md hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/30 neon-outline"
                              title="Toon regel details"
                            >
                              Details
                            </button>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() =>
                                  openEditModal(
                                    rid,
                                    regel.Omschrijving || regel.omschrijving || '',
                                    regel.Expressie || regel.expressie || ''
                                  )
                                }
                                className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                title="Bewerk acceptatieregel"
                                aria-label={`Bewerk acceptatieregel ${rid}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => handleDelete(rid)}
                                disabled={deletingId === rid}
                                className="p-2 rounded-md border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Verwijder acceptatieregel"
                                aria-label={`Verwijder acceptatieregel ${rid}`}
                              >
                                <X className="w-4 h-4" />
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

      {/* Delete success modal */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm border border-gray-200 dark:bg-slate-900 dark:border-slate-700 neon-modal">
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
              <button
                onClick={() => setShowDeleteSuccess(false)}
                className="px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/30"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg border border-gray-200 dark:bg-slate-900 dark:border-slate-700 neon-modal">
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
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
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
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:bg-red-900/30 dark:border-red-700/60 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
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
