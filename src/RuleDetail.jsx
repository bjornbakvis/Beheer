import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Info, Save, X } from 'lucide-react';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

// Consistente knop-stijl (zelfde als App.jsx / TopNav.jsx)
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const RuleDetail = () => {
  const navigate = useNavigate();
  const { regelId } = useParams();
  const location = useLocation();
  const productCode = location.state?.productCode;

  const isEdit = useMemo(
    () => new URLSearchParams(location.search).get('edit') === '1',
    [location.search]
  );

  const [rule, setRule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchRule = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(
        `/api/explain-rule?regelId=${encodeURIComponent(regelId)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRule(data);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regelId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await authFetch('/api/acceptance-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule),
      });
      if (!res.ok) throw new Error(await res.text());
      navigate(-1);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen brand-page">
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl brand-card">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                Regel {regelId}
              </h1>
              {productCode && (
                <p className="text-sm text-gray-600 dark:text-slate-300">
                  Product: {productCode}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className={[baseBtn, inactiveBtn, 'inline-flex items-center gap-2'].join(' ')}
              >
                <ChevronLeft size={16} />
                Terug
              </button>

              {isEdit && (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className={[
                    baseBtn,
                    activeBtn,
                    'inline-flex items-center gap-2',
                    saving ? 'opacity-60 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <Save size={16} />
                  Opslaan
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-sm text-gray-600 dark:text-slate-300">
                Laden...
              </div>
            ) : !rule ? (
              <div className="text-sm text-gray-600 dark:text-slate-300">
                Geen regel gevonden.
              </div>
            ) : (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl border border-gray-200 bg-white/80 dark:bg-slate-900/60 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3">
                    <Info size={16} className="text-gray-500 dark:text-slate-400" />
                    <h2 className="font-semibold text-gray-900 dark:text-slate-100">
                      Details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-300">
                        Externnummer
                      </div>
                      <div className="text-gray-900 dark:text-slate-100">
                        {rule.Externnummer}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-600 dark:text-slate-300">
                        Omschrijving
                      </div>
                      <div className="text-gray-900 dark:text-slate-100">
                        {rule.Omschrijving}
                      </div>
                    </div>
                  </div>
                </div>

                {isEdit && (
                  <div className="p-4 rounded-2xl border border-gray-200 bg-white/80 dark:bg-slate-900/60 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-900 dark:text-slate-100">
                        Bewerken (JSON)
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className={[baseBtn, inactiveBtn, 'inline-flex items-center gap-2'].join(' ')}
                      >
                        <X size={16} />
                        Annuleer
                      </button>
                    </div>

                    <textarea
                      value={JSON.stringify(rule, null, 2)}
                      onChange={(e) => {
                        try {
                          setRule(JSON.parse(e.target.value));
                        } catch {
                          // negeer parse errors tijdens typen
                        }
                      }}
                      className="w-full h-96 p-3 border border-gray-300 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default withApiEnv(RuleDetail);
