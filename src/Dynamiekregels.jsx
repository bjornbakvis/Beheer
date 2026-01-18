import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

// Zelfde knop-stijl als TopNav.jsx
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const makeUuid = () => (crypto?.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

const emptyEntiteit = () => ({
  EntiteitcodeId: '',
  AfdDekkingcode: '',
  AttribuutcodeId: '',
  RubriekId: '',
});

const emptyRekenregelCreate = () => ({
  _id: makeUuid(),
  Operator: 'NotSet',
  Waarde: '',
  Doel: emptyEntiteit(),
});

const emptyRekenregelEdit = () => ({
  _id: makeUuid(),
  _isNew: true,
  _deleted: false,
  RekenregelId: 0,
  Operator: 'NotSet',
  Waarde: '',
  Doel: emptyEntiteit(),
});

const Dynamiekregels = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState('regelId'); // regelId | omschrijving
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  const [deletingId, setDeletingId] = useState(null);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  // Delete bevestiging (altijd eerst vragen)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteRegelId, setPendingDeleteRegelId] = useState(null);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createFieldErrors, setCreateFieldErrors] = useState({});
  const [createForm, setCreateForm] = useState(() => ({
    omschrijving: '',
    afdBrancheCodeId: '',
    gevolg: '',
    bron: emptyEntiteit(),
    rekenregels: [emptyRekenregelCreate()],
  }));

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);
  const [editRuleId, setEditRuleId] = useState(null);
  const [editForm, setEditForm] = useState(() => ({
    regelId: '',
    omschrijving: '',
    afdBrancheCodeId: '',
    gevolg: 'NotSet',
    resourceId: '',
    bron: emptyEntiteit(),
    rekenregels: [emptyRekenregelEdit()],
  }));
  const [originalEditSnapshot, setOriginalEditSnapshot] = useState(null);

  const rulesPerPage = 10;

  const navigate = useNavigate();
  const location = useLocation();
  const restoredListRef = useRef(false);

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
        throw new Error('De dynamiekregels konden niet worden opgehaald');
      }

      const data = await response.json();
      const normalized = normalizeRules(data.rules || data.data || data);
      setRules(normalized);
    } catch (err) {
      setError(err.message);
      setRules([]);
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
          const oms = (rule.omschrijving ?? '').toString().toLowerCase();
          return regelId.includes(q) || oms.includes(q);
        });

    const sorted = [...filtered].sort((a, b) => {
      const av = sortKey === 'regelId' ? (a.regelId ?? '') : (a.omschrijving ?? '');
      const bv = sortKey === 'regelId' ? (b.regelId ?? '') : (b.omschrijving ?? '');

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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleDelete = async (regelId) => {
    if (!regelId) return;
    setDeletingId(regelId);
    setError(null);

    try {
      const response = await authFetch(withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`), {
        method: 'DELETE',
        headers: { 'Cache-Control': 'no-store' },
      });

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

  const openDeleteConfirm = (regelId) => {
    setPendingDeleteRegelId(regelId);
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setPendingDeleteRegelId(null);
  };

  // Alleen aanpassen mogelijk als RegelId >= 10000
  const canEditRule = (rule) => {
    const n = Number.parseInt((rule?.regelId ?? '').toString(), 10);
    return Number.isFinite(n) && n >= 10000;
  };

  const toNumberOrZero = (raw) => {
    if (raw === null || raw === undefined) return 0;
    const s = raw.toString().trim();
    if (!s) return 0;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };

  const cleanEntiteit = (e) => ({
    EntiteitcodeId: (e?.EntiteitcodeId ?? '').toString(),
    AfdDekkingcode: (e?.AfdDekkingcode ?? '').toString(),
    AttribuutcodeId: (e?.AttribuutcodeId ?? '').toString(),
    RubriekId: toNumberOrZero(e?.RubriekId ?? ''),
  });


  // Create input sanitizers (alleen voor toevoegen)
  const sanitizeDigits = (raw, maxLen) => {
    const s = (raw ?? '').toString();
    const only = s.replace(/\D+/g, '');
    return typeof maxLen === 'number' ? only.slice(0, maxLen) : only;
  };

  const sanitizeAlnum = (raw, maxLen) => {
    const s = (raw ?? '').toString();
    const only = s.replace(/[^a-z0-9]/gi, '');
    return typeof maxLen === 'number' ? only.slice(0, maxLen) : only;
  };

  const clearCreateFieldError = (path) => {
    if (!path) return;
    setCreateFieldErrors((prev) => {
      if (!prev || !prev[path]) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const validateCreateForm = () => {
    const errors = {};

    const isDigits = (v) => /^\d+$/.test(v);
    const isAlnum = (v) => /^[a-z0-9]+$/i.test(v);

    const norm = (v) => (v ?? '').toString().trim();

    const afd = norm(createForm.afdBrancheCodeId);
    if (afd) {
      if (!isDigits(afd) || afd.length > 3) errors['afdBrancheCodeId'] = 'Afd branchecode mag maximaal 3 cijfers lang zijn.';
    }

    const omschrijving = norm(createForm.omschrijving);
    if (!omschrijving) errors['omschrijving'] = 'Omschrijving is verplicht.';
    else if (omschrijving.length > 200) errors['omschrijving'] = 'Omschrijving mag maximaal 200 tekens bevatten.';

    const gevolg = norm(createForm.gevolg);
    if (!gevolg) errors['gevolg'] = 'Gevolg is verplicht.';
    else if (gevolg !== 'TonenVerplicht' && gevolg !== 'TonenOptioneel')
      errors['gevolg'] = 'Gevolg moet TonenVerplicht of TonenOptioneel zijn.';

    const validateEntiteit = (entity, basePath, requireEntiteitcode) => {
      const ent = norm(entity?.EntiteitcodeId);
      const dek = norm(entity?.AfdDekkingcode);
      const att = norm(entity?.AttribuutcodeId);
      const rub = norm(entity?.RubriekId);

      if (requireEntiteitcode) {
        if (!ent) errors[`${basePath}.EntiteitcodeId`] = 'Entiteitcode is verplicht.';
        else if (ent.length !== 2 || !isAlnum(ent))
          errors[`${basePath}.EntiteitcodeId`] = 'Entiteitcode moet precies 2 alfanumerieke tekens lang zijn.';
      } else if (ent) {
        if (ent.length !== 2 || !isAlnum(ent))
          errors[`${basePath}.EntiteitcodeId`] = 'Entiteitcode moet precies 2 alfanumerieke tekens lang zijn.';
      }

      if (dek) {
        if (!isDigits(dek) || dek.length !== 4) errors[`${basePath}.AfdDekkingcode`] = 'AFD-dekkingcode moet precies 4 cijfers lang zijn.';
      }

      if (att) {
        if (att.length > 7 || !isAlnum(att))
          errors[`${basePath}.AttribuutcodeId`] = 'Attribuutcode mag maximaal 7 alfanumerieke tekens lang zijn.';
      }

      if (rub) {
        if (!isDigits(rub) || rub.length > 6) errors[`${basePath}.RubriekId`] = 'RubriekId mag maximaal 6 cijfers lang zijn.';
      }

      if (att && rub) {
        errors[`${basePath}.AttribuutcodeId`] = 'Attribuutcode en RubriekId mogen niet beide zijn gevuld.';
        errors[`${basePath}.RubriekId`] = 'Attribuutcode en RubriekId mogen niet beide zijn gevuld.';
      }
    };

    // Bron: entiteitcode verplicht
    validateEntiteit(createForm.bron, 'bron', true);

    // Bron-type check voor "waarde niet gevuld"
    const bronEnt = norm(createForm?.bron?.EntiteitcodeId).toLowerCase();
    const bronHeeftAttribuut = !!norm(createForm?.bron?.AttribuutcodeId);
    const bronHeeftRubriek = !!norm(createForm?.bron?.RubriekId);
    const bronIsDekkingObjectPartij = bronEnt === 'dekking' || bronEnt === 'object' || bronEnt === 'partij';
    const bronIsTypeZonderAttribuutRubriek = bronIsDekkingObjectPartij && !bronHeeftAttribuut && !bronHeeftRubriek;

    const rekenregels = Array.isArray(createForm.rekenregels) ? createForm.rekenregels : [];
    rekenregels.forEach((r, idx) => {
      const rid = (r?._id ?? '').toString().trim() || `idx-${idx}`;

      const op = norm(r?.Operator);
      if (!op || op === 'NotSet') errors[`rekenregels.${rid}.Operator`] = 'Operator is verplicht.';

      const waarde = norm(r?.Waarde);
      if (waarde) {
        if (waarde.length > 30 || !isAlnum(waarde))
          errors[`rekenregels.${rid}.Waarde`] = 'Waarde mag maximaal 30 alfanumerieke tekens lang zijn.';
      }
      if (bronIsTypeZonderAttribuutRubriek && waarde) {
        errors[`rekenregels.${rid}.Waarde`] = 'Waarde mag niet gevuld zijn als de Bron een dekking, object of partij is.';
      }

      // Doel: entiteitcode verplicht
      validateEntiteit(r?.Doel, `rekenregels.${rid}.Doel`, true);
    });
return errors;
  };

  // Real-time create validatie: herbereken fouten zodra createForm wijzigt terwijl modal open staat
  useEffect(() => {
    if (!showCreateModal) return;
    const errors = validateCreateForm();
    setCreateFieldErrors(errors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createForm, showCreateModal]);


  const openCreateModal = () => {
    setCreateError(null);
    setCreateSubmitting(false);
    setCreateFieldErrors({});
    setCreateForm({
      omschrijving: '',
      afdBrancheCodeId: '',
      gevolg: '',
      bron: emptyEntiteit(),
      rekenregels: [emptyRekenregelCreate()],
    });
    setShowCreateModal(true);
  };

  const buildCreatePayload = () => {
    const afd = toNumberOrZero(createForm.afdBrancheCodeId);

    return {
      Omschrijving: createForm.omschrijving.trim(),
      AfdBrancheCodeId: afd,
      Bron: cleanEntiteit(createForm.bron),
      Gevolg: (createForm.gevolg ?? 'NotSet').toString(),
      ResourceId: makeUuid(),
      Rekenregels: (createForm.rekenregels || []).map((r) => ({
        Operator: (r.Operator ?? 'NotSet').toString(),
        Waarde: (r.Waarde ?? '').toString(),
        Doel: cleanEntiteit(r.Doel),
      })),
    };
  };

  const handleCreateSubmit = async (event) => {
    event.preventDefault();
    setCreateError(null);

    const errors = validateCreateForm();
    if (Object.keys(errors).length) {
      setCreateFieldErrors(errors);
      setCreateError('Controleer de velden met foutmeldingen.');
      return;
    }

    setCreateSubmitting(true);
    try {
      const payload = buildCreatePayload();

      const response = await authFetch(withApiEnv('/api/dynamiekregels'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to create dynamiekregel (status ${response.status})`;
        try {
          const payloadError = await response.json();
          message = payloadError.message || payloadError.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      setShowCreateModal(false);
      setCurrentPage(1);
      fetchRules();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const snapshotRekenregel = (r) => {
    const doel = r?.Doel || {};
    return {
      RekenregelId: r?.RekenregelId ?? 0,
      Operator: (r?.Operator ?? '').toString(),
      Waarde: (r?.Waarde ?? '').toString(),
      Doel: {
        EntiteitcodeId: (doel?.EntiteitcodeId ?? '').toString(),
        AfdDekkingcode: (doel?.AfdDekkingcode ?? doel?.AfdDekingcode ?? '').toString(),
        AttribuutcodeId: (doel?.AttribuutcodeId ?? '').toString(),
        RubriekId: toNumberOrZero(doel?.RubriekId ?? 0),
      },
    };
  };

  const sameRekenregel = (a, b) => {
    if (!a || !b) return false;
    if ((a.Operator ?? '') !== (b.Operator ?? '')) return false;
    if ((a.Waarde ?? '') !== (b.Waarde ?? '')) return false;
    const ad = a.Doel || {};
    const bd = b.Doel || {};
    return (
      (ad.EntiteitcodeId ?? '') === (bd.EntiteitcodeId ?? '') &&
      (ad.AfdDekkingcode ?? '') === (bd.AfdDekkingcode ?? '') &&
      (ad.AttribuutcodeId ?? '') === (bd.AttribuutcodeId ?? '') &&
      toNumberOrZero(ad.RubriekId ?? 0) === toNumberOrZero(bd.RubriekId ?? 0)
    );
  };

  const openEditModal = async (regelId) => {
    if (!regelId) return;
    setEditError(null);
    setEditSubmitting(false);
    setEditRuleId(regelId);

    try {
      const response = await authFetch(withApiEnv(`/api/dynamiekregels?regelId=${encodeURIComponent(regelId)}`));
      if (!response.ok) throw new Error('Failed to fetch dynamiekregel detail');
      const data = await response.json();

      const bron = data.Bron || {};
      const mappedBron = {
        EntiteitcodeId: (bron.EntiteitcodeId ?? '').toString(),
        AfdDekkingcode: (bron.AfdDekkingcode ?? bron.AfdDekingcode ?? '').toString(),
        AttribuutcodeId: (bron.AttribuutcodeId ?? '').toString(),
        RubriekId: (bron.RubriekId ?? '').toString(),
      };

      const rekenregels = Array.isArray(data.Rekenregels) ? data.Rekenregels : [];
      const mappedRekenregels = (rekenregels.length ? rekenregels : [{}]).map((r) => ({
        _id: makeUuid(),
        _isNew: false,
        _deleted: false,
        RekenregelId: r.RekenregelId ?? 0,
        Operator: r.Operator ?? 'NotSet',
        Waarde: r.Waarde ?? '',
        Doel: {
          EntiteitcodeId: (r?.Doel?.EntiteitcodeId ?? '').toString(),
          AfdDekkingcode: (r?.Doel?.AfdDekkingcode ?? r?.Doel?.AfdDekingcode ?? '').toString(),
          AttribuutcodeId: (r?.Doel?.AttribuutcodeId ?? '').toString(),
          RubriekId: (r?.Doel?.RubriekId ?? '').toString(),
        },
      }));

      const snapshot = {
        RegelId: data.RegelId,
        Omschrijving: (data.Omschrijving ?? '').toString(),
        AfdBrancheCodeId: data.AfdBrancheCodeId,
        Gevolg: (data.Gevolg ?? 'NotSet').toString(),
        ResourceId: (data.ResourceId ?? '').toString(),
        Bron: cleanEntiteit(mappedBron),
        Rekenregels: mappedRekenregels.map((rr) => snapshotRekenregel(rr)),
      };

      setOriginalEditSnapshot(snapshot);

      setEditForm({
        regelId: (data.RegelId ?? '').toString(),
        omschrijving: (data.Omschrijving ?? '').toString(),
        afdBrancheCodeId: (data.AfdBrancheCodeId ?? '').toString(),
        gevolg: (data.Gevolg ?? 'NotSet').toString(),
        resourceId: (data.ResourceId ?? '').toString(),
        bron: mappedBron,
        rekenregels: mappedRekenregels,
      });

      setShowEditModal(true);
    } catch (err) {
      setEditError(err.message);
      setShowEditModal(true);
    }
  };

  const buildUpdatePayload = () => {
    const afd = toNumberOrZero(editForm.afdBrancheCodeId);
    const regelIdNum = toNumberOrZero(editForm.regelId);
    const resourceId = makeUuid();

    const originalById = new Map(
      (originalEditSnapshot?.Rekenregels || []).map((rr) => [toNumberOrZero(rr.RekenregelId), rr])
    );

    const rekenregels = (editForm.rekenregels || []).map((r) => {
      const idNum = toNumberOrZero(r.RekenregelId);
      const isDeleted = !!r._deleted;
      const isNew = !!r._isNew || idNum === 0;

      const currentSnap = snapshotRekenregel(r);
      const originalSnap = originalById.get(idNum);

      let actie = 'NotSet';
      if (isDeleted) actie = 'Verwijderen';
      else if (isNew) actie = 'Toevoegen';
      else if (originalSnap && !sameRekenregel(currentSnap, originalSnap)) actie = 'Wijzigen';

      return {
        Actie: actie,
        RekenregelId: idNum,
        Operator: (r.Operator ?? 'NotSet').toString(),
        Waarde: (r.Waarde ?? '').toString(),
        Doel: cleanEntiteit(r.Doel),
      };
    });

    return {
      RegelId: regelIdNum,
      Omschrijving: editForm.omschrijving.trim(),
      AfdBrancheCodeId: afd,
      Bron: cleanEntiteit(editForm.bron),
      Gevolg: (editForm.gevolg ?? 'NotSet').toString(),
      ResourceId: resourceId,
      Rekenregels: rekenregels,
    };
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    setEditError(null);

    const regelIdNum = toNumberOrZero(editForm.regelId);
    if (!regelIdNum) {
      setEditError('RegelId ontbreekt.');
      return;
    }

    const omschrijving = editForm.omschrijving.trim();
    if (!omschrijving) {
      setEditError('Omschrijving is verplicht.');
      return;
    }

    const afd = toNumberOrZero(editForm.afdBrancheCodeId);
    if (!afd) {
      setEditError('Afd branchecode moet een geheel getal zijn.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload = buildUpdatePayload();

      const response = await authFetch(withApiEnv('/api/dynamiekregels'), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `Failed to update dynamiekregel (status ${response.status})`;
        try {
          const payloadError = await response.json();
          message = payloadError.message || payloadError.error || message;
        } catch (_) {}
        throw new Error(message);
      }

      setShowEditModal(false);
      setEditRuleId(null);
      setOriginalEditSnapshot(null);
      fetchRules();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditSubmitting(false);
    }
  };

  const updateCreateRekenregel = (id, patch) => {
    setCreateForm((prev) => ({
      ...prev,
      rekenregels: prev.rekenregels.map((r) => (r._id === id ? { ...r, ...patch } : r)),
    }));
  };

  const updateEditRekenregel = (id, patch) => {
    setEditForm((prev) => ({
      ...prev,
      rekenregels: prev.rekenregels.map((r) => (r._id === id ? { ...r, ...patch } : r)),
    }));
  };

  const updateCreateDoel = (id, patch) => {
    updateCreateRekenregel(id, { Doel: { ...(createForm.rekenregels.find((r) => r._id === id)?.Doel || {}), ...patch } });
  };

  const updateEditDoel = (id, patch) => {
    updateEditRekenregel(id, { Doel: { ...(editForm.rekenregels.find((r) => r._id === id)?.Doel || {}), ...patch } });
  };

  const removeCreateRekenregel = (id) => {
    setCreateForm((prev) => {
      const remaining = prev.rekenregels.filter((r) => r._id !== id);
      return { ...prev, rekenregels: remaining.length ? remaining : [emptyRekenregelCreate()] };
    });

    // Opschonen van eventuele foutmeldingen voor deze rekenregel (zonder gedrag te veranderen)
    setCreateFieldErrors((prev) => {
      if (!prev) return prev;
      const prefix = `rekenregels.${id}.`;
      const next = {};
      let changed = false;
      for (const [k, v] of Object.entries(prev)) {
        if (k.startsWith(prefix)) {
          changed = true;
          continue;
        }
        next[k] = v;
      }
      return changed ? next : prev;
    });
  };

  const removeEditRekenregel = (id) => {
    setEditForm((prev) => {
      const item = prev.rekenregels.find((r) => r._id === id);
      if (!item) return prev;
      // Existing rekenregel: mark for delete
      if (!item._isNew && toNumberOrZero(item.RekenregelId) > 0) {
        return {
          ...prev,
          rekenregels: prev.rekenregels.map((r) => (r._id === id ? { ...r, _deleted: true } : r)),
        };
      }
      // New rekenregel: remove from list
      const remaining = prev.rekenregels.filter((r) => r._id !== id);
      return { ...prev, rekenregels: remaining.length ? remaining : [emptyRekenregelEdit()] };
    });
  };

  const restoreEditRekenregel = (id) => {
    setEditForm((prev) => ({
      ...prev,
      rekenregels: prev.rekenregels.map((r) => (r._id === id ? { ...r, _deleted: false } : r)),
    }));
  };

  const renderEntiteitFields = (value, onChange, prefixId, createPathPrefix) => {
    const getErr = (suffix) => (createPathPrefix ? createFieldErrors[`${createPathPrefix}.${suffix}`] : null);
    const errEnt = getErr('EntiteitcodeId');
    const errDek = getErr('AfdDekkingcode');
    const errAtt = getErr('AttribuutcodeId');
    const errRub = getErr('RubriekId');

    const baseInput =
      'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-300" htmlFor={`${prefixId}-entiteit`}>
            Entiteitcode
          </label>
          <input
            id={`${prefixId}-entiteit`}
            type="text"
            value={value.EntiteitcodeId}
            onChange={(e) => {
              if (createPathPrefix) {
                clearCreateFieldError(`${createPathPrefix}.EntiteitcodeId`);
                const v = sanitizeAlnum(e.target.value, 2);
                onChange({ EntiteitcodeId: v });
                return;
              }
              onChange({ EntiteitcodeId: e.target.value });
            }}
            className={[baseInput, errEnt ? 'border-red-400' : ''].join(' ')}
          />
          {errEnt ? <p className="mt-1 text-xs text-red-600">{errEnt}</p> : null}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-300" htmlFor={`${prefixId}-dekking`}>
            AFD-dekkingcode
          </label>
          <input
            id={`${prefixId}-dekking`}
            type="text"
            value={value.AfdDekkingcode}
            onChange={(e) => {
              if (createPathPrefix) {
                clearCreateFieldError(`${createPathPrefix}.AfdDekkingcode`);
                const v = sanitizeDigits(e.target.value, 4);
                onChange({ AfdDekkingcode: v });
                return;
              }
              onChange({ AfdDekkingcode: e.target.value });
            }}
            className={[baseInput, errDek ? 'border-red-400' : ''].join(' ')}
          />
          {errDek ? <p className="mt-1 text-xs text-red-600">{errDek}</p> : null}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-300" htmlFor={`${prefixId}-attribuut`}>
            Attribuutcode
          </label>
          <input
            id={`${prefixId}-attribuut`}
            type="text"
            value={value.AttribuutcodeId}
            onChange={(e) => {
              if (createPathPrefix) {
                clearCreateFieldError(`${createPathPrefix}.AttribuutcodeId`);
                const v = sanitizeAlnum(e.target.value, 7);
                onChange({ AttribuutcodeId: v });
                return;
              }
              onChange({ AttribuutcodeId: e.target.value });
            }}
            className={[baseInput, errAtt ? 'border-red-400' : ''].join(' ')}
          />
          {errAtt ? <p className="mt-1 text-xs text-red-600">{errAtt}</p> : null}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-300" htmlFor={`${prefixId}-rubriek`}>
            RubriekId
          </label>
          <input
            id={`${prefixId}-rubriek`}
            type="number"
            value={value.RubriekId}
            onChange={(e) => {
              if (createPathPrefix) {
                clearCreateFieldError(`${createPathPrefix}.RubriekId`);
                const v = sanitizeDigits(e.target.value, 6);
                onChange({ RubriekId: v });
                return;
              }
              onChange({ RubriekId: e.target.value });
            }}
            className={[baseInput, errRub ? 'border-red-400' : ''].join(' ')}
          />
          {errRub ? <p className="mt-1 text-xs text-red-600">{errRub}</p> : null}
        </div>
      </div>
    );
  };

  const renderRekenregels = (items, mode) => {
    const isEdit = mode === 'edit';

    return (
      <div className="space-y-3">
        {items.map((r, idx) => {
          const deleted = !!r._deleted;

          const baseInput =
            'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 disabled:opacity-60 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100';

          const opErr = !isEdit ? createFieldErrors[`rekenregels.${r._id}.Operator`] : null;
          const waardeErr = !isEdit ? createFieldErrors[`rekenregels.${r._id}.Waarde`] : null;

          return (
            <div
              key={r._id}
              className={`rounded-xl border border-gray-200 p-4 bg-white/70 dark:border-slate-700 dark:bg-slate-900/40 ${
                deleted ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
                  Rekenregel {idx + 1}
                  {deleted ? ' (verwijderen)' : ''}
                </p>

                <div className="flex items-center gap-2">
                  {isEdit && deleted ? (
                    <button
                      type="button"
                      onClick={() => restoreEditRekenregel(r._id)}
                      className={[baseBtn, inactiveBtn, 'px-3 py-1.5 text-xs'].join(' ')}
                    >
                      Herstellen
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => (isEdit ? removeEditRekenregel(r._id) : removeCreateRekenregel(r._id))}
                    className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                    title="Verwijder rekenregel"
                    aria-label="Verwijder rekenregel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-300">Operator</label>
                  <input
                    type="text"
                    value={r.Operator}
                    disabled={deleted}
                    onChange={(e) => {
                      if (!isEdit) clearCreateFieldError(`rekenregels.${r._id}.Operator`);
                      isEdit
                        ? updateEditRekenregel(r._id, { Operator: e.target.value })
                        : updateCreateRekenregel(r._id, { Operator: e.target.value });
                    }}
                    className={[baseInput, !isEdit && opErr ? 'border-red-400' : ''].join(' ')}
                    placeholder="Bijv. GelijkAan"
                  />
                  {!isEdit && opErr ? <p className="mt-1 text-xs text-red-600">{opErr}</p> : null}
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-300">Waarde</label>
                  <input
                    type="text"
                    value={r.Waarde}
                    disabled={deleted}
                    onChange={(e) => {
                      if (!isEdit) clearCreateFieldError(`rekenregels.${r._id}.Waarde`);
                      isEdit
                        ? updateEditRekenregel(r._id, { Waarde: e.target.value })
                        : (() => {
                        const v = sanitizeAlnum(e.target.value, 30);
                        updateCreateRekenregel(r._id, { Waarde: v });
                      })();
                    }}
                    className={[baseInput, !isEdit && waardeErr ? 'border-red-400' : ''].join(' ')}
                    placeholder="Bijv. 15"
                  />
                  {!isEdit && waardeErr ? <p className="mt-1 text-xs text-red-600">{waardeErr}</p> : null}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">Doel</p>
                <div className="mt-2">
                  {renderEntiteitFields(
                    r.Doel,
                    (patch) => (isEdit ? updateEditDoel(r._id, patch) : updateCreateDoel(r._id, patch)),
                    `${mode}-doel-${r._id}`,
                    !isEdit ? `rekenregels.${r._id}.Doel` : undefined
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div>
          <button
            type="button"
            onClick={() =>
              isEdit
                ? setEditForm((prev) => ({ ...prev, rekenregels: [...prev.rekenregels, emptyRekenregelEdit()] }))
                : setCreateForm((prev) => ({ ...prev, rekenregels: [...prev.rekenregels, emptyRekenregelCreate()] }))
            }
            className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Rekenregel toevoegen
          </button>
        </div>
      </div>
    );
  };

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
                  placeholder="Zoek op Regel ID of Omschrijving (deelmatch)"
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
                  onClick={openCreateModal}
                  className={[baseBtn, activeBtn, 'flex items-center justify-center gap-2'].join(' ')}
                >
                  + Nieuwe regel
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 dark:bg-yellow-900/30 dark:border-yellow-700/60">
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
            ) : error ? null : (
              <table className="w-full table-fixed">
                <colgroup>
                  <col style={{ width: '120px' }} />
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
                              navigate(`/dynamiekregels/${rule.regelId}`, {
                                state: { listState: { searchTerm, currentPage, sortKey, sortDir } },
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
                                navigate(`/dynamiekregels/${rule.regelId}`, {
                                  state: { listState: { searchTerm, currentPage, sortKey, sortDir } },
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
                            {canEditRule(rule) ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEditModal(rule.regelId)}
                                  className="p-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 transition-colors dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                                  title="Bewerk dynamiekregel"
                                  aria-label={`Bewerk dynamiekregel ${rule.regelId}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>

                                <button
                                  onClick={() => openDeleteConfirm(rule.regelId)}
                                  disabled={deletingId === rule.regelId}
                                  className="p-2 rounded-md border border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-900/20"
                                  title="Verwijder dynamiekregel"
                                  aria-label={`Verwijder dynamiekregel ${rule.regelId}`}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <span
                                className="text-xs text-gray-400"
                                title="Alleen regels met Regel ID vanaf 10000 zijn aanpasbaar"
                              >
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
              <div className="text-sm text-gray-700 dark:text-slate-200">Totaal {filteredRules.length} regels</div>

              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(safePage - 1)}
                  disabled={safePage === 1}
                  className={[baseBtn, inactiveBtn, 'px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed'].join(
                    ' '
                  )}
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
                  className={[baseBtn, inactiveBtn, 'px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed'].join(
                    ' '
                  )}
                  aria-label="Volgende pagina"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 brand-modal">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Bevestig verwijderen</p>
              <button
                onClick={closeDeleteConfirm}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit bevestiging"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-5 text-sm text-gray-700 dark:text-slate-200">
              Weet je zeker dat je dynamiekregel <span className="font-medium">{pendingDeleteRegelId}</span> wilt verwijderen?
            </div>

            <div className="px-4 py-3 flex justify-end gap-2">
              <button onClick={closeDeleteConfirm} className={[baseBtn, inactiveBtn].join(' ')}>
                Annuleren
              </button>
              <button
                onClick={() => {
                  const id = pendingDeleteRegelId;
                  closeDeleteConfirm();
                  if (id) handleDelete(id);
                }}
                disabled={!pendingDeleteRegelId || deletingId === pendingDeleteRegelId}
                className={[
                  baseBtn,
                  'px-4 py-2 border border-red-200 text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition disabled:opacity-60 disabled:cursor-not-allowed dark:border-red-700/60 dark:text-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/40',
                ].join(' ')}
              >
                Verwijder
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 brand-modal">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Melding</p>
              <button
                onClick={() => setShowDeleteSuccess(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit melding"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 py-5 text-sm text-gray-700 dark:text-slate-200">Dynamiekregel succesvol verwijderd</div>
            <div className="px-4 py-3 flex justify-end">
              <button onClick={() => setShowDeleteSuccess(false)} className={[baseBtn, inactiveBtn].join(' ')}>
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 brand-modal">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Nieuwe dynamiekregel</p>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit formulier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="create-omschrijving">
                  Omschrijving
                </label>
                <input
                  id="create-omschrijving"
                  type="text"
                  maxLength={200}
                  value={createForm.omschrijving}
                  onChange={(e) => {
                    clearCreateFieldError('omschrijving');
                    setCreateForm((p) => ({ ...p, omschrijving: e.target.value }));
                  }}
                  className={[
                    'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                    createFieldErrors['omschrijving'] ? 'border-red-400' : '',
                  ].join(' ')}
                />
                {createFieldErrors['omschrijving'] ? (
                  <p className="mt-1 text-xs text-red-600">{createFieldErrors['omschrijving']}</p>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="create-afd">
                    Afd branchecode
                  </label>
                  <input
                    id="create-afd"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    value={createForm.afdBrancheCodeId}
                    onChange={(e) => {
                      clearCreateFieldError('afdBrancheCodeId');
                      const v = sanitizeDigits(e.target.value, 3);
                      setCreateForm((p) => ({ ...p, afdBrancheCodeId: v }));
                    }}
                    className={[
                      'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                      createFieldErrors['afdBrancheCodeId'] ? 'border-red-400' : '',
                    ].join(' ')}
                  />
                  {createFieldErrors['afdBrancheCodeId'] ? (
                    <p className="mt-1 text-xs text-red-600">{createFieldErrors['afdBrancheCodeId']}</p>
                  ) : null}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="create-gevolg">
                    Gevolg
                  </label>
                  <select
                    id="create-gevolg"
                    value={createForm.gevolg}
                    onChange={(e) => {
                      clearCreateFieldError('gevolg');
                      setCreateForm((p) => ({ ...p, gevolg: e.target.value }));
                    }}
                    required
                    className={[
                      'mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100',
                      createFieldErrors['gevolg'] ? 'border-red-400' : '',
                    ].join(' ')}
                  >
                    <option value="">— Kies een gevolg —</option>
                    <option value="TonenVerplicht">TonenVerplicht</option>
                    <option value="TonenOptioneel">TonenOptioneel</option>
                  </select>
                  {createFieldErrors['gevolg'] ? (
                    <p className="mt-1 text-xs text-red-600">{createFieldErrors['gevolg']}</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Bron</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">(optioneel)</p>
                <div className="mt-3">
                  {renderEntiteitFields(
                    createForm.bron,
                    (patch) => setCreateForm((p) => ({ ...p, bron: { ...p.bron, ...patch } })),
                    'create-bron',
                    'bron'
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Rekenregels</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                  Een dynamiekregel kan meerdere rekenregels hebben.
                </p>
                <div className="mt-3">{renderRekenregels(createForm.rekenregels, 'create')}</div>
              </div>

              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:bg-red-900/30 dark:border-red-700/60 dark:text-red-300">
                  {createError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>

                <button
                  type="submit"
                  disabled={createSubmitting}
                  className={[baseBtn, activeBtn, 'px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed'].join(' ')}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-gray-200 brand-modal">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100">Bewerk dynamiekregel {editRuleId}</p>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
                aria-label="Sluit formulier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-regelid">
                    Regel ID
                  </label>
                  <input
                    id="edit-regelid"
                    type="number"
                    value={editForm.regelId}
                    readOnly
                    className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600 dark:bg-slate-800/60 dark:border-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-afd">
                    Afd branchecode
                  </label>
                  <input
                    id="edit-afd"
                    type="number"
                    value={editForm.afdBrancheCodeId}
                    onChange={(e) => setEditForm((p) => ({ ...p, afdBrancheCodeId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-omschrijving">
                  Omschrijving
                </label>
                <input
                  id="edit-omschrijving"
                  type="text"
                  maxLength={200}
                  value={editForm.omschrijving}
                  onChange={(e) => setEditForm((p) => ({ ...p, omschrijving: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-slate-200" htmlFor="edit-gevolg">
                  Gevolg
                </label>
                <input
                  id="edit-gevolg"
                  type="text"
                  value={editForm.gevolg}
                  onChange={(e) => setEditForm((p) => ({ ...p, gevolg: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                  placeholder="Bijv. UitsluitenOptioneel"
                />
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Bron</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">(optioneel)</p>
                <div className="mt-3">
                  {renderEntiteitFields(
                    editForm.bron,
                    (patch) => setEditForm((p) => ({ ...p, bron: { ...p.bron, ...patch } })),
                    'edit-bron'
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
                <p className="text-sm font-semibold text-gray-800 dark:text-slate-100">Rekenregels</p>
                <p className="text-xs text-gray-500 mt-1 dark:text-slate-400">
                  Toevoegen/verwijderen wordt automatisch als Actie meegegeven bij opslaan.
                </p>
                <div className="mt-3">{renderRekenregels(editForm.rekenregels, 'edit')}</div>
              </div>

              {editError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 dark:bg-red-900/30 dark:border-red-700/60 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md border border-gray-200 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Annuleren
                </button>

                <button
                  type="submit"
                  disabled={editSubmitting}
                  className={[baseBtn, activeBtn, 'px-4 py-2 disabled:opacity-60 disabled:cursor-not-allowed'].join(' ')}
                >
                  Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dynamiekregels;
