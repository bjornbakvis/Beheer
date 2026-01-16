import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle, RefreshCw, Copy } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

// Zelfde knop-stijl als App.jsx (Refresh + Nieuwe regel)
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

// Rows: waarden altijd in dezelfde kolom (ook bij ingesprongen secties)
const Row = ({ label, value, indent = false }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[224px_1fr] gap-1 sm:gap-4">
    <div className={['text-gray-900 font-medium', indent ? 'sm:pl-6' : ''].join(' ')}>
      {label}
    </div>
    <div className="text-gray-900 break-words">{formatValue(value)}</div>
  </div>
);

const RowLight = ({ label, value, indent = false }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[224px_1fr] gap-1 sm:gap-4">
    <div className={['text-gray-900', indent ? 'sm:pl-6' : ''].join(' ')}>
      {label}
    </div>
    <div className="text-gray-900 break-words">{formatValue(value)}</div>
  </div>
);

const DynamiekregelDetail = () => {
  const { regelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state met subtiele animatie
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonModalMounted, setJsonModalMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  const openJsonModal = () => {
    setShowJsonModal(true);
    requestAnimationFrame(() => setJsonModalMounted(true));
  };

  const closeJsonModal = () => {
    setJsonModalMounted(false);
    window.setTimeout(() => {
      setShowJsonModal(false);
      setCopied(false);
    }, 180);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store', ...getAuthHeader() },
      });

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

  useEffect(() => {
    if (regelId) fetchDetail();

    const handleEnvChange = () => {
      if (regelId) fetchDetail();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
  }, [regelId]);

  const vm = useMemo(() => {
    if (!detail) return null;

    const bron = detail.Bron || {};

    return {
      omschrijving: detail.Omschrijving,
      afdBranchecode: detail.AfdBrancheCodeId,
      herkomst: detail.Herkomst,

      bronEntiteit: bron.EntiteitcodeId,
      bronAfdDekking: bron.AfdDekingcode ?? bron.AfdDekkingcode,
      bronAttribuut: bron.AttribuutcodeId,

      rekenregels: Array.isArray(detail.Rekenregels) ? detail.Rekenregels : [],
      gevolg: detail.Gevolg,
    };
  }, [detail]);

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-4xl mx-auto p-6">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const listState = location.state?.listState;
                if (listState) {
                  navigate('/dynamiekregels', { state: { listState } });
                } else {
                  navigate(-1);
                }
              }}
              className={[baseBtn, inactiveBtn, 'flex items-center gap-2'].join(' ')}
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>

            <h1 className="text-2xl font-semibold text-gray-900">Dynamiekregel {regelId}</h1>
          </div>

          {/* Right aligned buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDetail}
              disabled={loading}
              className={[
                baseBtn,
                activeBtn,
                'flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>

            <button onClick={openJsonModal} className={[baseBtn, activeBtn].join(' ')}>
              Volledige JSON
            </button>
          </div>
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
          ) : !vm ? (
            <p className="text-sm text-gray-600">Geen details gevonden.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg text-gray-900">{vm.omschrijving}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Inhoud</div>

                {/* 1 punt kleiner, waarden overal uitgelijnd */}
                <div className="mt-2 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <Row label="AFD-branchecode" value={vm.afdBranchecode} />
                  <Row label="Herkomst" value={vm.herkomst} />

                  <div>
                    <div className="font-medium text-gray-900">Bron</div>
                    <div className="mt-2 space-y-3">
                      <RowLight indent label="Entiteitcode" value={vm.bronEntiteit} />
                      <RowLight indent label="AFD-dekkingcode" value={vm.bronAfdDekking} />
                      <RowLight indent label="Attribuutcode" value={vm.bronAttribuut} />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <div className="font-medium text-gray-900">Rekenregels</div>

                    <div className="mt-3 space-y-3">
                      {vm.rekenregels.map((rr, idx) => {
                        const doel = rr.Doel || {};
                        return (
                          <div
                            key={idx}
                            className="rounded-lg border border-gray-200 bg-white/70 p-4 space-y-3"
                          >
                            <div className="font-medium text-gray-900">Rekenregel {idx + 1}</div>

                            <div className="space-y-3">
                              <RowLight indent label="Operator" value={rr.Operator} />
                              <RowLight indent label="Waarde" value={rr.Waarde} />
                            </div>

                            <div className="pt-3 border-t border-gray-200">
                              <div className="font-medium text-gray-900">Doel</div>
                              <div className="mt-2 space-y-3">
                                <RowLight indent label="Entiteitcode" value={doel.EntiteitcodeId} />
                                <RowLight
                                  indent
                                  label="AFD-dekkingcode"
                                  value={doel.AfdDekingcode ?? doel.AfdDekkingcode}
                                />
                                <RowLight indent label="Attribuutcode" value={doel.AttribuutcodeId} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <Row label="Gevolg" value={vm.gevolg} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && (
        <div
          className={[
            'fixed inset-0 z-50 flex items-center justify-center p-4',
            'transition-opacity duration-200',
            jsonModalMounted ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
          // Klik naast popup sluit (panel stopt bubbling)
          onMouseDown={closeJsonModal}
        >
          <div
            className={[
              'absolute inset-0',
              'bg-black/50',
              'backdrop-blur-[2px]',
              'transition-opacity duration-200',
              jsonModalMounted ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
          />

          <div
            className={[
              'relative w-full max-w-3xl rounded-2xl border border-gray-200 brand-modal bg-white shadow-2xl',
              'transition-transform duration-200',
              jsonModalMounted ? 'translate-y-0 scale-100' : 'translate-y-2 scale-[0.98]',
            ].join(' ')}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              {/* titel: dik + 1 punt groter */}
              <p className="text-base font-semibold text-gray-900">Volledige JSON</p>

              {/* Sluiten naar header (op plek van Kopieer JSON) */}
              <button onClick={closeJsonModal} className={[baseBtn, activeBtn, 'flex items-center gap-2'].join(' ')}>
                Sluiten
              </button>
            </div>

            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
              <pre className="text-sm font-sans whitespace-pre-wrap break-words text-gray-900 leading-relaxed">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </div>

            {/* Kopieer JSON naar footer (regel waar Sluiten eerst stond), rechts uitgelijnd */}
            <div className="px-5 py-4 border-t border-gray-200 flex justify-end">
              <button onClick={copyJson} className={[baseBtn, activeBtn, 'flex items-center gap-2'].join(' ')}>
                <Copy className="w-4 h-4" />
                {copied ? 'Gekopieerd' : 'Kopieer JSON'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamiekregelDetail;
