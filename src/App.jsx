import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle, X, Pencil } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

const App = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rulesPerPage = 10;

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('regelId');
  const [sortDir, setSortDir] = useState('asc');

  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const restoredListRef = useRef(false);

  const normalizeRules = (incoming) => {
    if (!incoming) return [];
    return (Array.isArray(incoming) ? incoming : [incoming]).map((item) => ({
      regelId: item.regelId ?? item.RegelId ?? '',
      externNummer: item.externNummer ?? item.ExternNummer ?? '',
      omschrijving: item.omschrijving ?? item.Omschrijving ?? '',
    }));
  };

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(withApiEnv('/api/acceptance-rules'));
      const data = await response.json();
      setRules(normalizeRules(data.rules || data.data || data));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  useEffect(() => {
    const listState = location.state?.listState;
    if (!restoredListRef.current && listState) {
      setSearchTerm(listState.searchTerm ?? '');
      setSortKey(listState.sortKey ?? 'regelId');
      setSortDir(listState.sortDir ?? 'asc');
      setCurrentPage(listState.currentPage ?? 1);
      restoredListRef.current = true;
    }
  }, [location.state]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredRules = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return [...rules]
      .filter(
        (r) =>
          r.regelId.toLowerCase().includes(q) ||
          r.externNummer.toLowerCase().includes(q) ||
          r.omschrijving.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = a[sortKey]?.toString() ?? '';
        const bv = b[sortKey]?.toString() ?? '';
        const cmp = av.localeCompare(bv, 'nl', { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [rules, searchTerm, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / rulesPerPage));
  const safePage = Math.min(currentPage, totalPages);

  const indexOfLastRule = safePage * rulesPerPage;
  const indexOfFirstRule = indexOfLastRule - rulesPerPage;
  const currentRules = filteredRules.slice(indexOfFirstRule, indexOfLastRule);

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl border border-brand-border brand-card">
          <div className="p-6 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Zoek..."
                className="px-3 py-2 border rounded-lg text-sm"
              />

              <div className="flex gap-2">
                {/* REFRESH – brand-primary */}
                <button
                  onClick={fetchRules}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 brand-primary"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button className="px-4 py-2 text-white rounded-lg brand-primary">
                  + Nieuwe regel
                </button>
              </div>
            </div>
          </div>

          <table className="w-full table-fixed">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">REGEL ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">EXTERN NUMMER</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase">OMSCHRIJVING</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase">DETAILS</th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase">AANPASSEN</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {currentRules.map((rule) => (
                <tr key={rule.regelId}>
                  <td className="px-6 py-4">{rule.regelId}</td>
                  <td className="px-6 py-4">{rule.externNummer}</td>
                  <td className="px-6 py-4 truncate">{rule.omschrijving}</td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <button className="px-3 py-2 border rounded-xl">Details</button>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {rule.externNummer.toLowerCase().includes('tp') ? (
                        <>
                          <button className="p-2 border rounded-md">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="p-2 border rounded-md text-red-600">
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* PAGINERING – brand-primary */}
          <div className="px-6 py-4 border-t flex justify-between items-center">
            <span className="text-sm">Totaal {filteredRules.length} regels</span>

            <div className="flex gap-2">
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      page === safePage
                        ? 'text-white border-transparent brand-primary'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6">
            <p>Acceptatieregel verwijderd</p>
            <button onClick={() => setShowDeleteSuccess(false)}>Sluiten</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
