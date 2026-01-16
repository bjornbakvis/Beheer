import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const Row = ({ label, value }) => (
  <div className="flex gap-4">
    <div className="w-56 font-medium text-gray-900">{label}</div>
    <div className="flex-1 text-gray-900 break-words">{formatValue(value)}</div>
  </div>
);

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
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };

    if (regelId) fetchDetail();

    const handleEnvChange = () => {
      if (regelId) fetchDetail();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
  }, [regelId]);

  const vm = useMemo(() => {
    if (!detail || typeof detail !== 'object') return null;

    const omschrijving = detail.Omschrijving ?? '';
    const afdBranchecode = detail.AfdBrancheCodeId;
    const herkomst = detail.Herkomst;

    const bron = detail.Bron || {};
    const bronEntiteit = bron.EntiteitcodeId;

    // Future-proof: GET kan 1k hebben, PUT (later) 2k
    const bronAfdDekking = bron.AfdDekingcode ?? bron.AfdDekkingcode;

    const bronAttribuut = bron.AttribuutcodeId;

    const rekenregels = Array.isArray(detail.Rekenregels) ? detail.Rekenregels : [];
    const gevolg = detail.Gevolg;

    return {
      omschrijving,
      afdBranchecode,
      herkomst,
      bronEntiteit,
      bronAfdDekking,
      bronAttribuut,
      rekenregels,
      gevolg,
    };
  }, [detail]);

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

          <h1 className="text-2xl font-semibold text-gray-900">Dynamiekregel {regelId}</h1>
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
          ) : !detail || !vm ? (
            <p className="text-sm text-gray-600">Geen details gevonden.</p>
          ) : (
            <div className="space-y-6">
              {/* Omschrijving */}
              <div>
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg text-gray-900">{vm.omschrijving || '—'}</div>
              </div>

              {/* Inhoud */}
              <div>
                <div className="text-sm text-gray-500">Inhoud</div>

                <div className="mt-2 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Row label="AFD-branchecode" value={vm.afdBranchecode} />
                  <Row label="Herkomst" value={vm.herkomst} />

                  {/* Bron */}
                  <div className="mt-1">
                    <div className="font-medium text-gray-900">Bron</div>
                    <div className="mt-2 ml-6 space-y-3">
                      <Row label="Entiteitcode" value={vm.bronEntiteit} />
                      <Row label="AFD-dekkingcode" value={vm.bronAfdDekking} />
                      <Row label="Attribuutcode" value={vm.bronAttribuut} />
                    </div>
                  </div>

                  {/* Rekenregels */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="font-medium text-gray-900">Rekenregels</div>

                    <div className="mt-3 space-y-3">
                      {vm.rekenregels.length === 0 ? (
                        <div className="text-sm text-gray-700">Geen rekenregels gevonden.</div>
                      ) : (
                        vm.rekenregels.map((rr, idx) => {
                          const doel = rr?.Doel || {};
                          const doelAfdDekking = doel?.AfdDekingcode ?? doel?.AfdDekkingcode;

                          return (
                            <div
                              key={rr?.RekenregelId ?? idx}
                              className="rounded-lg border border-gray-200 bg-white/70 p-4 space-y-3"
                            >
                              <div className="font-medium text-gray-900">
                                Rekenregel {rr?.RekenregelId ?? idx + 1}
                              </div>

                              <div className="space-y-2">
                                <Row label="Rekenregel ID" value={rr?.RekenregelId} />
                                <Row label="Operator" value={rr?.Operator} />
                                <Row label="Waarde" value={rr?.Waarde} />
                              </div>

                              <div className="pt-3 border-t border-gray-200">
                                <div className="font-medium text-gray-900">Doel</div>
                                <div className="mt-2 ml-6 space-y-3">
                                  <Row label="Entiteitcode" value={doel?.EntiteitcodeId} />
                                  <Row label="AFD-dekkingcode" value={doelAfdDekking} />
                                  <Row label="Attribuutcode" value={doel?.AttribuutcodeId} />
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Gevolg */}
                  <div className="pt-4 border-t border-gray-200">
                    <Row label="Gevolg" value={vm.gevolg} />
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
