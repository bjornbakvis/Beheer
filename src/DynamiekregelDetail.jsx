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

const Row = ({ label, value }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[224px_1fr] gap-1 sm:gap-4">
    <div className="text-gray-900 font-medium">{label}</div>
    <div className="text-gray-900 break-words">{formatValue(value)}</div>
  </div>
);

const RowLight = ({ label, value }) => (
  <div className="grid grid-cols-1 sm:grid-cols-[224px_1fr] gap-1 sm:gap-4">
    <div className="text-gray-900">{label}</div>
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

  // Modal animatie state
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonModalMounted, setJsonModalMounted] = useState(false);

  const [copied, setCopied] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store', ...getAuthHeader() },
      });

      if (!res.ok) throw new Error(`Failed to fetch details (status ${res.status})`);

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
      rekenregels: detail.Rekenregels || [],
      gevolg: detail.Gevolg,
    };
  }, [detail]);

  const openJsonModal = () => {
    setShowJsonModal(true);
    requestAnimationFrame(() => setJsonModalMounted(true));
  };

  const closeJsonModal = () => {
    setJsonModalMounted(false);
    setTimeout(() => setShowJsonModal(false), 180);
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(detail, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // stil falen is prima hier
    }
  };

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className={[baseBtn, inactiveBtn, 'flex items-center gap-2'].join(' ')}
            >
              <ArrowLeft className="w-4 h-4" />
              Terug
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Dynamiekregel {regelId}</h1>
          </div>

          <div className="flex gap-2">
            <button
              onClick={fetchDetail}
              disabled={loading}
              className={[baseBtn, activeBtn, 'flex items-center gap-2'].join(' ')}
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
          {error && <div className="text-sm text-red-600">{error}</div>}

          {vm && (
            <>
              <div className="mb-6">
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg">{vm.omschrijving}</div>
              </div>

              <div className="text-sm text-gray-500 mb-1">Inhoud</div>
              <div className="text-sm space-y-5 rounded-xl border border-gray-200 bg-gray-50/70 p-5">
                <Row label="AFD-branchecode" value={vm.afdBranchecode} />
                <Row label="Herkomst" value={vm.herkomst} />

                <div>
                  <div className="font-medium">Bron</div>
                  <div className="ml-6 space-y-2">
                    <RowLight label="Entiteitcode" value={vm.bronEntiteit} />
                    <RowLight label="AFD-dekkingcode" value={vm.bronAfdDekking} />
                    <RowLight label="Attribuutcode" value={vm.bronAttribuut} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* JSON MODAL */}
      {showJsonModal && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${
            jsonModalMounted ? 'opacity-100' : 'opacity-0'
          }`}
          onMouseDown={(e) => e.target === e.currentTarget && closeJsonModal()}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

          <div
            className={`relative w-full max-w-3xl bg-white rounded-2xl border border-gray-200 shadow-2xl transition-transform duration-200 ${
              jsonModalMounted ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'
            }`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <p className="text-sm font-medium">Volledige JSON</p>

              <button
                onClick={copyJson}
                className={[baseBtn, activeBtn, 'flex items-center gap-2'].join(' ')}
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Gekopieerd' : 'Kopieer JSON'}
              </button>
            </div>

            <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
              <pre className="text-sm font-sans whitespace-pre-wrap break-words">
                {JSON.stringify(detail, null, 2)}
              </pre>
            </div>

            <div className="px-5 py-4 border-t flex justify-end">
              <button onClick={closeJsonModal} className={[baseBtn, inactiveBtn].join(' ')}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamiekregelDetail;
