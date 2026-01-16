import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

const DynamiekregelDetail = () => {
  const { regelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`),
          {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-store', ...getAuthHeader() },
          }
        );

        if (!res.ok) {
          throw new Error(`Failed to fetch details (status ${res.status})`);
        }

        const data = await res.json();
        setDetail(Array.isArray(data) ? data[0] : data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (regelId) fetchDetail();
    window.addEventListener('apiEnvChange', fetchDetail);
    return () => window.removeEventListener('apiEnvChange', fetchDetail);
  }, [regelId]);

  if (!detail) return null;

  const {
    RegelId,
    Omschrijving,
    AFDBrancheCodeId,
    Herkomst,
    Entiteitcode,
    AFDdekkingcode,
    AttribuutcodeId,
    ...rest
  } = detail;

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => {
              const listState = location.state?.listState;
              if (listState) {
                navigate('/dynamiekregels', { state: { listState } });
              } else {
                navigate(-1);
              }
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border brand-outline hover:bg-red-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">
            Dynamiekregel {regelId}
          </h1>
        </div>

        <div className="rounded-2xl brand-card border border-gray-200 p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-red-600 rounded-full" />
            </div>
          ) : error ? (
            <div className="flex gap-3 bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <div>
                <p className="text-sm font-medium">Kon details niet laden</p>
                <p className="text-xs">{error}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Omschrijving */}
              <div>
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg text-gray-900">{Omschrijving || '-'}</div>
              </div>

              {/* Inhoud */}
              <div>
                <div className="text-sm text-gray-500">Inhoud</div>

                <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex gap-4">
                    <div className="w-56 font-medium text-gray-900">AFD-branchecode</div>
                    <div>{AFDBrancheCodeId ?? '-'}</div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-56 font-medium text-gray-900">Herkomst</div>
                    <div>{Herkomst ?? '-'}</div>
                  </div>

                  <div className="ml-6 space-y-2">
                    <div className="flex gap-4">
                      <div className="w-50 font-medium text-gray-800">Entiteitcode</div>
                      <div>{Entiteitcode ?? '-'}</div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-50 font-medium text-gray-800">AFD-dekkingcode</div>
                      <div>{AFDdekkingcode ?? '-'}</div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-50 font-medium text-gray-800">Attribuutcode</div>
                      <div>{AttribuutcodeId ?? '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Volledige JSON */}
              <div>
                <div className="text-sm text-gray-500">Volledige JSON</div>
                <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-900 whitespace-pre-wrap break-words">
                  {JSON.stringify(detail, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamiekregelDetail;
