import React, { useEffect, useState } from 'react';
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
        } catch {}
        throw new Error(message);
      }
      setRules((prev) =>
        prev.filter(
          (regel) => (regel.ValidatieregelId || regel.validatieregelId) !== regelId
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
    if (!editRuleId) return setEditError('RegelId ontbreekt.');
    if (!editOmschrijving.trim()) return setEditError('Omschrijving is verplicht.');
    if (!editExpressie.trim()) return setEditError('Xpath expressie is verplicht.');

    setEditSubmitting(true);
    try {
      const payload = {
        RegelId: editRuleId,
        Omschrijving: editOmschrijving.trim(),
        Expressie: editExpressie.trim(),
        ResourceId: crypto?.randomUUID?.(),
      };
      const response = await authFetch(withApiEnv('/api/acceptance-rules'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Update mislukt');
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
              Overzicht van validatieregels uit de productdefinitie
            </p>
            <button
              onClick={fetchRules}
              disabled={loading}
              className={[baseBtn, activeBtn, 'inline-flex items-center gap-2'].join(' ')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600" />
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-slate-200">
                      ValidatieregelId
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-slate-200">
                      AandResultaatAcceptatie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-slate-200">
                      Omschrijving
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-slate-200">
                      Details
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider dark:text-slate-200">
                      Aanpassen
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
                  {rules.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Geen acceptatieregels gevonden
                      </td>
                    </tr>
                  ) : (
                    rules.map((regel) => (
                      <tr key={regel.ValidatieregelId || regel.validatieregelId}>
                        <td className="px-6 py-4 text-sm font-medium">
                          {regel.ValidatieregelId ?? regel.validatieregelId}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {regel.AandResultaatAcceptatie ?? regel.aandResultaatAcceptatie}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {regel.Omschrijving ?? regel.omschrijving}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() =>
                              navigate(`/rules/${regel.ValidatieregelId || regel.validatieregelId}`)
                            }
                            className={[baseBtn, inactiveBtn].join(' ')}
                          >
                            Details
                          </button>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() =>
                                openEditModal(
                                  regel.ValidatieregelId || regel.validatieregelId,
                                  regel.Omschrijving || regel.omschrijving || '',
                                  regel.Expressie || regel.expressie || ''
                                )
                              }
                              className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(regel.ValidatieregelId || regel.validatieregelId)
                              }
                              disabled={deletingId === (regel.ValidatieregelId || regel.validatieregelId)}
                              className="p-2 rounded-md border border-red-100 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
