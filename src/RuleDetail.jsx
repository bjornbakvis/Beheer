import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

const RuleDetail = () => {
  const { regelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/acceptance-rules?regelId=${encodeURIComponent(regelId)}`,
          {
            headers: {
              'Cache-Control': 'no-store',
              ...getAuthHeader(),
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setDetail(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [regelId]);

  const explainRule = async () => {
    setExplainLoading(true);
    setExplainError(null);

    try {
      const response = await fetch(
        `/api/explain-rule?regelId=${encodeURIComponent(regelId)}`,
        {
          headers: {
            'Cache-Control': 'no-store',
            ...getAuthHeader(),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }

      const explanation = await response.text();
      setDetail((prev) => ({ ...prev, Explanation: explanation }));
    } catch (err) {
      setExplainError(err.message);
    } finally {
      setExplainLoading(false);
    }
  };

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <button
            onClick={() => {
              const listState = location.state?.listState;
              if (listState) {
                navigate('/', { state: { listState } });
              } else {
                navigate(-1);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200 brand-outline hover:bg-red-50 dark:text-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 dark:bg-slate-900 dark:border-slate-700 neon-card">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-4 dark:bg-yellow-900/30 dark:border-yellow-700/60 dark:text-yellow-200">
              <AlertCircle className="w-5 h-5 mt-0.5" />
              <div>
                <h3 className="font-medium">Fout bij laden van details</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : detail ? (
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Regel ID</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">{detail.RegelID}</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Extern nummer</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">{detail.Externnummer}</dd>
              </div>

              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Omschrijving</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-slate-100">{detail.Omschrijving}</dd>
              </div>

              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Expressie</dt>
                <dd className="mt-1 text-sm font-mono bg-gray-50 p-4 rounded-md overflow-x-auto dark:bg-slate-800 dark:text-slate-100">
                  {detail.Expressie}
                </dd>
              </div>

              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Schema</dt>
                <dd className="mt-1 text-sm font-mono bg-gray-50 p-4 rounded-md overflow-x-auto dark:bg-slate-800 dark:text-slate-100">
                  {JSON.stringify(detail.Schema, null, 2)}
                </dd>
              </div>

              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-slate-400">Uitleg</dt>
                <dd className="mt-1">
                  {detail.Explanation ? (
                    <pre className="text-sm font-mono bg-gray-50 p-4 rounded-md overflow-x-auto dark:bg-slate-800 dark:text-slate-100">
                      {detail.Explanation}
                    </pre>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={explainRule}
                        disabled={explainLoading}
                        className="w-fit px-3 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {explainLoading ? 'Bezig...' : 'Genereer uitleg'}
                      </button>

                      {explainError && (
                        <div className="flex items-start gap-3 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-4 dark:bg-yellow-900/30 dark:border-yellow-700/60 dark:text-yellow-200">
                          <AlertCircle className="w-5 h-5 mt-0.5" />
                          <div>
                            <h3 className="font-medium">Fout bij uitleg genereren</h3>
                            <p className="text-sm mt-1">{explainError}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-600 dark:text-slate-300">Geen details gevonden.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RuleDetail;
