import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

const formatLabel = (key) => {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
};

const formatValue = (value) => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  // Object/array: toon compact, ruwe JSON staat eronder toch al
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
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

  const viewModel = useMemo(() => {
    if (!detail || typeof detail !== 'object') return null;

    const regelIdVal = detail.RegelId ?? detail.regelId ?? '';
    const omschrijvingVal = detail.Omschrijving ?? detail.omschrijving ?? '';

    const afdBrancheCodeId = detail.AFDBrancheCodeId ?? detail.AfdBrancheCodeId ?? detail.afdBrancheCodeId;
    const herkomst = detail.Herkomst ?? detail.herkomst;

    const entiteitcode = detail.Entiteitcode ?? detail.entiteitcode;
    const afdDekkingcode = detail.AFDdekkingcode ?? detail.afddekkingcode;
    const attribuutcode = detail.AttribuutcodeId ?? detail.attribuutcodeId;

    // Alles wat we NIET dubbel willen tonen in de nette weergave:
    const excludedKeys = new Set([
      'RegelId',
      'regelId',
      'Omschrijving',
      'omschrijving',

      'AFDBrancheCodeId',
      'AfdBrancheCodeId',
      'afdBrancheCodeId',

      'Herkomst',
      'herkomst',

      'Entiteitcode',
      'entiteitcode',
      'AFDdekkingcode',
      'afddekkingcode',
      'AttribuutcodeId',
      'attribuutcodeId',
    ]);

    const others = Object.entries(detail)
      .filter(([k]) => !excludedKeys.has(k))
      .sort(([a], [b]) => a.localeCompare(b, 'nl', { sensitivity: 'base' }));

    return {
      regelIdVal,
      omschrijvingVal,
      afdBrancheCodeId,
      herkomst,
      entiteitcode,
      afdDekkingcode,
      attribuutcode,
      others,
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
          ) : !detail || !viewModel ? (
            <p className="text-sm text-gray-600">Geen details gevonden.</p>
          ) : (
            <div className="space-y-6">
              {/* Omschrijving */}
              <div>
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg text-gray-900">{viewModel.omschrijvingVal || '—'}</div>
              </div>

              {/* Inhoud */}
              <div>
                <div className="text-sm text-gray-500">Inhoud</div>

                <div className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <Row label="AFD-branchecode" value={viewModel.afdBrancheCodeId} />
                  <Row label="Herkomst" value={viewModel.herkomst} />

                  {/* Bron + ingesprongen velden */}
                  <div className="mt-2">
                    <div className="font-medium text-gray-900">Bron</div>
                    <div className="mt-2 ml-6 space-y-2">
                      <Row label="Entiteitcode" value={viewModel.entiteitcode} />
                      <Row label="AFD-dekkingcode" value={viewModel.afdDekkingcode} />
                      <Row label="Attribuutcode" value={viewModel.attribuutcode} />
                    </div>
                  </div>

                  {/* Overige velden (alles wat verder nog in de API response zit) */}
                  {viewModel.others.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-gray-200 space-y-2">
                      {viewModel.others.map(([key, value]) => (
                        <Row key={key} label={formatLabel(key)} value={value} />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Volledige JSON (UI-font, normale grootte) */}
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
