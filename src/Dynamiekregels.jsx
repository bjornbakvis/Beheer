import React, { useState, useEffect, useRef, useMemo } from 'react';
import { RefreshCw, ChevronLeft, ChevronRight, AlertCircle, X, Pencil, Info } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

// Zelfde knop-stijl als TopNav.jsx
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const Dynamiekregels = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('regelId'); // regelId | externNummer | omschrijving
  const [sortDir, setSortDir] = useState('asc'); // asc | desc
  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    omschrijving: '',
    expressie: '',
    afdBrancheCode: '',
  });
  const [createError, setCreateError] = useState(null);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRuleId, setEditRuleId] = useState(null);
  const [editOmschrijving, setEditOmschrijving] = useState('');
  const [editExpressie, setEditExpressie] = useState('');
  const [editError, setEditError] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const rulesPerPage = 10;

  const navigate = useNavigate();
  const location = useLocation();
  const restoredListRef = useRef(false);

  const makeId = () =>
    crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10);

  const createEmptyCondition = () => ({
    id: makeId(),
    operator: '=',
    value: '',
    joiner: 'and',
  });

  const createEmptyRecord = () => ({
    id: makeId(),
    rubriek: '',
    joiner: 'and',
    conditions: [createEmptyCondition()],
  });

  const [xpathBuilder, setXpathBuilder] = useState(() => ({
    records: [createEmptyRecord()],
  }));

  const [builderError, setBuilderError] = useState(null);

  const operatorOptions = [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: 'contains', label: 'contains' },
    { value: 'not-contains', label: 'not contains' },
    { value: 'starts-with', label: 'starts-with' },
    { value: 'ends-with', label: 'ends-with' },
  ];

  const joinerOptions = [
    { value: 'and', label: 'EN' },
    { value: 'or', label: 'OF' },
  ];

  // Normalize varying API shapes into the fields the table expects
  const normalizeRules = (incoming) => {
    if (!incoming) return [];

    const flatten = (items) =>
      items.flatMap((item) => {
        if (!item) return [];
        if (Array.isArray(item)) return flatten(item);
        if (Array.isArray(item.Data)) return flatten(item.Data);

        return [
          {
            regelId: item.regelId ?? item.RegelId ?? item.id ?? '',
            externNummer: item.externNummer ?? item.ExternNummer ?? '',
            omschrijving: item.omschrijving ?? item.Omschrijving ?? '',
          },
        ];
      });

    return flatten(Array.isArray(incoming) ? incoming : [incoming]);
  };

  const fetchRules = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(withApiEnv('/api/dynamiekregels'));

      if (!response.ok) {
        throw new Error('Failed to fetch dynamiekregels');
      }

      const data = await response.json();
      const normalized = normalizeRules(data.rules || data.data || data);
      setRules(normalized);
    } catch (err) {
      setError(err.message);
      // Demo data for illustration when API fails
      setRules([
        { regelId: 'R001', externNummer: 'EXT-2024-001', omschrijving: 'Leeftijdsgrens voor standaard verzekering' },
        { regelId: 'R002', externNummer: 'EXT-2024-002', omschrijving: 'Medische keuring vereist boven drempelwaarde' },
        { regelId: 'R003', externNummer: 'EXT-2024-003', omschrijving: 'Geografische beperking voor bepaalde gebieden' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
    const handleEnvChange = () => {
      setCurrentPage(1);
      fetchRules();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const listState = location.state?.listState;
    if (!restoredListRef.current && listState) {
      if (typeof listState.searchTerm === 'string') setSearchTerm(listState.searchTerm);
      if (typeof listState.sortKey === 'string') setSortKey(listState.sortKey);
      if (typeof listState.sortDir === 'string') setSortDir(listState.sortDir);
      if (Number.isFinite(listState.currentPage)) setCurrentPage(listState.currentPage);
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
    const q = searchTerm.trim().toLowerCase();

    const filtered = !q
      ? rules
      : rules.filter((rule) => {
          const regelId = (rule.regelId ?? '').toString().toLowerCase();
          const extern = (rule.externNummer ?? '').toString().toLowerCase();
          const oms = (rule.omschrijving ?? '').toString().toLowerCase();
          return regelId.includes(q) || extern.includes(q) || oms.includes(q);
        });

    const sorted = [...filtered].sort((a, b) => {
      const av =
        sortKey === 'regelId'
          ? (a.regelId ?? '')
          : sortKey === 'externNummer'
            ? (a.externNummer ?? '')
            : (a.omschrijving ?? '');

      const bv =
        sortKey === 'regelId'
          ? (b.regelId ?? '')
          : sortKey === 'externNummer'
            ? (b.externNummer ?? '')
            : (b.omschrijving ?? '');

      const cmp = av.toString().localeCompare(bv.toString(), 'nl', {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [rules, searchTerm, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / rulesPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastRule = safePage * rulesPerPage;
  const indexOfFirstRule = indexOfLastRule - rulesPerPage;
  const currentRules = filteredRules.slice(indexOfFirstRule, indexOfLastRule);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);

  const handleRefresh = () => {
    setCurrentPage(1);
    fetchRules();
  };

  const handleDelete = async (regelId) => {
    if (!regelId) return;
    setDeletingId(regelId);
    setError(null);

    try {
      const response = await authFetch(
        withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`),
        {
          method: 'DELETE',
          headers: { 'Cache-Control': 'no-store' },
        }
      );

      if (!response.ok) {
        let message = `Failed to delete dynamiekregel (status ${response.status})`;
        try {
          const payload = await response.json();
          message = payload.message || payload.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      setRules((prev) => prev.filter((rule) => rule.regelId !== regelId));
      setShowDeleteSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleCreateInputChange = (field) => (event) => {
    setCreateForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleRecordUpdate = (recordId, updates) => {
    setXpathBuilder((prev) => ({
      ...prev,
      records: prev.records.map((record) => (record.id === recordId ? { ...record, ...updates } : record)),
    }));
    setBuilderError(null);
  };

  const handleConditionUpdate = (recordId, conditionId, updates) => {
    setXpathBuilder((prev) => ({
      ...prev,
      records: prev.records.map((record) => {
        if (record.id !== recordId) return record;
        return {
          ...record,
          conditions: record.conditions.map((condition) =>
            condition.id === conditionId ? { ...condition, ...updates } : condition
          ),
        };
      }),
    }));
    setBuilderError(null);
  };

  const handleAddCondition = (recordId) => {
    setXpathBuilder((prev) => ({
      ...prev,
      records: prev.records.map((record) =>
        record.id === recordId ? { ...record, conditions: [...record.conditions, createEmptyCondition()] } : record
      ),
    }));
    setBuilderError(null);
  };

  const handleRemoveCondition = (recordId, conditionId) => {
    setXpathBuilder((prev) => ({
      ...prev,
      records: prev.records.map((record) => {
        if (record.id !== recordId) return record;
        const remaining = record.conditions.filter((condition) => condition.id !== conditionId);
        return { ...record, conditions: remaining.length ? remaining : [createEmptyCondition()] };
      }),
    }));
    setBuilderError(null);
  };

  const handleAddRecord = () => {
    setXpathBuilder((prev) => ({ ...prev, records: [...prev.records, createEmptyRecord()] }));
    setBuilderError(null);
  };

  const handleRemoveRecord = (recordId) => {
    setXpathBuilder((prev) => {
      const remaining = prev.records.filter((record) => record.id !== recordId);
      return { ...prev, records: remaining.length ? remaining : [createEmptyRecord()] };
    });
    setBuilderError(null);
  };

  const normalizeJoiner = (joiner) => (joiner === 'or' ? 'or' : 'and');
  const isNumericValue = (value) => /^-?\d+$/.test(value);

  const buildXPathLiteral = (rawValue) => {
    if (!rawValue.includes("'")) return `'${rawValue}'`;
    if (!rawValue.includes('"')) return `"${rawValue}"`;
    const parts = rawValue.split("'");
    const wrapped = parts.map((part) => (part ? `'${part}'` : "''"));
    return `concat(${wrapped.join(',\"\'\",')})`;
  };

  const buildConditionExpression = (rubriek, condition) => {
    const value = condition.value.trim();
    if (!value) return null;

    const fieldPath = `//${rubriek}`;
    const fieldLower = `lower-case(${fieldPath})`;
    const valueLiteral = buildXPathLiteral(value);
    const valueLower = `lower-case(${valueLiteral})`;

    const numericOperators = ['>', '<', '>=', '<='];
    if (numericOperators.includes(condition.operator) && isNumericValue(value)) {
      return `number(${fieldPath}) ${condition.operator} ${value}`;
    }

    switch (condition.operator) {
      case '=':
        return `${fieldLower} = ${valueLower}`;
      case '!=':
        return `${fieldLower} != ${valueLower}`;
      case 'contains':
        return `contains(${fieldLower},${valueLower})`;
      case 'not-contains':
        return `not(contains(${fieldLower},${valueLower}))`;
      case 'starts-with':
        return `starts-with(${fieldLower},${valueLower})`;
      case 'ends-with':
        return `ends-with(${fieldLower},${valueLower})`;
      case '>':
      case '<':
      case '>=':
      case '<=':
        return `${fieldLower} ${condition.operator} ${valueLower}`;
      default:
        return `${fieldLower} = ${valueLower}`;
    }
  };

  const buildRecordExpression = (record) => {
    const rubriek = record.rubriek.trim();
    if (!rubriek) return null;

    const conditionExpressions = record.conditions
      .map((condition) => buildConditionExpression(rubriek, condition))
      .filter(Boolean);

    if (conditionExpressions.length === 0) return null;

    let combined = conditionExpressions[0];
    for (let i = 1; i < conditionExpressions.length; i += 1) {
      const joiner = normalizeJoiner(record.conditions[i].joiner);
      combined = `${combined} ${joiner} ${conditionExpressions[i]}`;
    }

    const conditionBlock = conditionExpressions.length > 1 ? `((${combined}))` : `(${combined})`;
    return `(fn:exists(//${rubriek}) and ${conditionBlock})`;
  };

  const buildXPathExpression = (records) => {
    const recordExpressions = records
      .map((record) => ({ expr: buildRecordExpression(record), joiner: normalizeJoiner(record.joiner) }))
      .filter((record) => record.expr);

    if (recordExpressions.length === 0) return '';

    let combined = recordExpressions[0].expr;
    for (let i = 1; i < recordExpressions.length; i += 1) {
      combined = `${combined} ${recordExpressions[i].joiner} ${recordExpressions[i].expr}`;
    }

    return `if(( ${combined} )) then false() else true()`;
  };

  const handleApplyBuilder = () => {
    const expression = buildXPathExpression(xpathBuilder.records);
    if (!expression) {
      setBuilderError('Vul minimaal een rubriek en waarde in.');
      return;
    }
    setCreateForm((prev) => ({ ...prev, expressie: expression }));
    setBuilderError(null);
  };

  const openEditModal = (regelId, omschrijvingValue, expressieValue) => {
    setEditRuleId(regelId);
    setEditOmschrijving(omschrijvingValue || '');
    setEditExpressie(expressieValue || '');
    setEditError(null);
    setShowEditModal(true);
  };

  // (Edit/Create submit handlers staan verderop in jouw versie; laat ik hier ongemoeid)
  // — jouw bestaande file blijft verder hetzelfde, behalve de kolom en details-state.

  return (
    <div className="min-h-screen brand-page">
      <TopNav />

      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl border border-gray-200 brand-card">
          <div className="p-6 border-b border-gray-200 dark:border-slate-700">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Dynamiekregels</h1>
                <p className="text-sm text-gray-600 mt-1 dark:text-slate-300">Beheer van dynamiekregels</p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Zoek op Regel ID, Extern Nummer of Omschrijving (deelmatch)"
                  className="w-full md:w-60 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />

                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={[
                    baseBtn,
                    activeBtn,
                    'flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>

                <button
                  onClick={() => setShowCreateModal(true)}
                  className={[baseBtn, activeBtn, 'flex items-center justify-center gap-2'].join(' ')}
                >
                  + Nieuwe regel
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 dark:bg-yellow-900/30 dark:border-yellow-700/60">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5 dark:text-yellow-400" />
              <div>
                <p className="text-sm text-yellow-800 font-medium dark:text-yellow-200">Actie mislukt</p>
                <p className="text-xs text-yellow-700 mt-1 dark:text-yellow-200/80">{error}</p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
              </div>
            ) : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '104px' }} />
                  <col />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '150px' }} />
                </colgroup>

                <thead className="bg-gray-50 border-b border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('regelId')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        REGEL ID{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'regelId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('omschrijving')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        OMSCHRIJVING{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'omschrijving' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      DETAILS
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider dark:text-slate-300 whitespace-nowrap">
                      AANPASSEN
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200 dark:bg-slate-900 dark:divide-slate-800">
                  {currentRules.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                        Geen dynamiekregels gevonden
                      </td>
                    </tr>
                  ) : (
                    currentRules.map((rule) => (
                      <tr key={rule.regelId} className="hover:bg-gray-50 transition-colors dark:hover:bg-slate-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-slate-200">
                          <button
                            onClick={() =>
                              navigate(`/rules/${rule.regelId}`, {
                                state: {
                                  listState: { searchTerm, currentPage, sortKey, sortDir },
                                  source: 'dynamiekregels',
                                },
                              })
                            }
                            className="hover:underline"
                          >
                            {rule.regelId}
                          </button>
                        </td>

                        <td
                          className="px-6 py-4 text-sm text-gray-700 dark:text-slate-200 truncate"
                          title={rule.omschrijving}
                        >
                          {rule.omschrijving}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="w-full flex justify-center">
                            <button
                              onClick={() =>
                                navigate(`/rules/${rule.regelId}`, {
                                  state: {
                                    listState: { searchTerm, currentPage, sortKey, sortDir },
                                    source: 'dynamiekregels',
                                  },
                                })
                              }
                              className="px-3 py-2 border rounded-xl transition-all duration-150 brand-outline"
                              title="Toon details"
                            >
                              Details
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="w-full flex justify-center">
                            {rule.externNummer?.toString().toLowerCase().includes('tp') ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditModal(rule.regelId, rule.omschrijving, '')}
                                  className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                  title="Bewerk dynamiekregel"
                                  aria-label={`Bewerk dynamiekregel ${rule.regelId}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => handleDelete(rule.regelId)}
                                  disabled={deletingId === rule.regelId}
                                  className="p-2 rounded-md border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                  title="Verwijder dynamiekregel"
                                  aria-label={`Verwijder dynamiekregel ${rule.regelId}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400" title="Alleen TP-regels zijn aanpasbaar">
                                —
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          {rules.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between dark:border-slate-700">
              <div className="text-sm text-gray-700 dark:text-slate-200">Totaal {filteredRules.length} regels.</div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage === 1}
                  className={[baseBtn, inactiveBtn, 'px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed'].join(' ')}
                  aria-label="Vorige pagina"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;

                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= safePage - 1 && pageNumber <= safePage + 1)
                  ) {
                    const isActive = safePage === pageNumber;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={[baseBtn, isActive ? activeBtn : inactiveBtn].join(' ')}
                      >
                        {pageNumber}
                      </button>
                    );
                  }

                  if (pageNumber === safePage - 2 || pageNumber === safePage + 2) {
                    return (
                      <span key={pageNumber} className="px-2 py-2 text-gray-500 dark:text-slate-400">
                        ...
                      </span>
                    );
                  }

                  return null;
                })}

                <button
                  onClick={() => handlePageChange(safePage + 1)}
                  disabled={safePage === totalPages}
                  className={[baseBtn, inactiveBtn, 'px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed'].join(' ')}
                  aria-label="Volgende pagina"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* De modals (create/edit/delete-success) staan in jouw bestaande file verderop.
          Daar hoef je voor deze wijziging niets aan te passen. */}
    </div>
  );
};

export default Dynamiekregels;
