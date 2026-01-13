
// App.jsx — volledige vervanging
// - RegelID & Externnummer gecentreerd
// - Default sortering op RegelID (asc)
// - Vaste kolombreedtes (80% van eerdere waarden)
// - Geen layout-verspringen (table-layout: fixed + colgroup)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Pencil, X } from 'lucide-react';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

const normalize = (v) => (v ?? '').toString();

const App = () => {
  const navigate = useNavigate();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('regelId'); // default sort
  const [sortDir, setSortDir] = useState('asc');

  const tableRef = useRef(null);

  useEffect(() => {
    const fetchRules = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(withApiEnv('/api/acceptance-rules'), {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-store' },
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();
        setRules(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchRules();
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const visibleRules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    const filtered = !q
      ? rules
      : rules.filter((r) => {
          return (
            normalize(r.regelId).toLowerCase().includes(q) ||
            normalize(r.externNummer).toLowerCase().includes(q) ||
            normalize(r.omschrijving).toLowerCase().includes(q)
          );
        });

    const sorted = [...filtered].sort((a, b) => {
      const av =
        sortKey === 'regelId'
          ? normalize(a.regelId)
          : sortKey === 'externNummer'
          ? normalize(a.externNummer)
          : normalize(a.omschrijving);

      const bv =
        sortKey === 'regelId'
          ? normalize(b.regelId)
          : sortKey === 'externNummer'
          ? normalize(b.externNummer)
          : normalize(b.omschrijving);

      const cmp = av.localeCompare(bv, 'nl', { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [rules, searchTerm, sortKey, sortDir]);

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-4">Acceptatieregels</h1>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Zoek op RegelID, Externnummer of Omschrijving"
          className="mb-4 w-full max-w-md px-3 py-2 border rounded"
        />

        {error && (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded flex gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table
            ref={tableRef}
            className="w-full border-collapse table-fixed bg-white"
          >
            <colgroup>
              <col style={{ width: '128px' }} />
              <col style={{ width: '176px' }} />
              <col />
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
            </colgroup>

            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">
                  <button onClick={() => toggleSort('regelId')}>
                    RegelID {sortKey === 'regelId' ? (sortDir === 'asc' ? '▲' : '▼') : ' '}
                  </button>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase">
                  <button onClick={() => toggleSort('externNummer')}>
                    Externnummer {sortKey === 'externNummer' ? (sortDir === 'asc' ? '▲' : '▼') : ' '}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">
                  <button onClick={() => toggleSort('omschrijving')}>
                    Omschrijving {sortKey === 'omschrijving' ? (sortDir === 'asc' ? '▲' : '▼') : ' '}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase">Aanpassen</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    Laden...
                  </td>
                </tr>
              ) : (
                visibleRules.map((r) => {
                  const canManage = normalize(r.externNummer).toLowerCase().includes('tp');
                  return (
                    <tr key={r.regelId} className="border-t">
                      <td className="px-4 py-3 text-center font-medium whitespace-nowrap">
                        {r.regelId}
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {r.externNummer}
                      </td>
                      <td
                        className="px-4 py-3 truncate"
                        title={r.omschrijving}
                      >
                        {r.omschrijving}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/rules/${r.regelId}`)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Details
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        {canManage ? (
                          <div className="flex gap-2">
                            <Pencil className="w-4 h-4 cursor-pointer" />
                            <X className="w-4 h-4 cursor-pointer text-red-600" />
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default App;
