import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { getAuthHeader } from './apiAuth';

/**
 * Recursieve JSON viewer, leesbaar voor niet-tech users
 */
const JsonValue = ({ value, level = 0 }) => {
  const indent = { marginLeft: level * 16 };

  if (value === null) {
    return <span className="text-gray-500">null</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span>[]</span>;
    return (
      <div style={indent} className="space-y-1">
        {value.map((item, idx) => (
          <JsonValue key={idx} value={item} level={level + 1} />
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    return (
      <div style={indent} className="space-y-2">
        {Object.entries(value).map(([key, val]) => (
          <div key={key} className="flex gap-3">
            <div className="min-w-[180px] font-medium text-gray-900">
              {key}
            </div>
            <div className="flex-1 text-gray-800 break-words">
              <JsonValue value={val} level={level + 1} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    return <span>{value ? 'true' : 'false'}</span>;
  }

  return <span>{String(value)}</span>;
};

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
        const rule = Array.isArray(data) ? data[0] : data;
        setDetail(rule);
      } catch (err) {
        setError(err.message);
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
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200 brand-outline hover:bg-red-50"
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
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Kon details niet laden</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div>
                <div className="text-sm text-gray-500">Omschrijving</div>
                <div className="text-lg text-gray-900">
                  {detail.Omschrijving || detail.omschrijving || '-'}
                </div>
              </div>

              <div>
                <div className="text-lg font-semibold text-gray-900 mb-3">
                  Inhoud
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <JsonValue value={detail} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Geen details gevonden.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DynamiekregelDetail;
