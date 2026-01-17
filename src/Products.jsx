import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TopNav from './TopNav';
import { withApiEnv } from './apiEnv';
import { authFetch } from './apiAuth';

// Zelfde knop-stijl als TopNav.jsx / App.jsx / Dynamiekregels.jsx
const baseBtn =
  'px-3 py-2 rounded-xl text-sm font-medium transition-colors border focus:outline-none focus:ring-2 focus:ring-red-200';
const inactiveBtn = 'brand-outline hover:bg-red-50';
const activeBtn = 'brand-primary text-white border-transparent shadow-sm';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting zoals App.jsx / Dynamiekregels.jsx
  const [sortKey, setSortKey] = useState('productId'); // productId | omschrijving
  const [sortDir, setSortDir] = useState('asc'); // asc | desc

  const navigate = useNavigate();

  const normalizeProducts = (incoming) => {
    if (!incoming) return [];

    const flatten = (items) =>
      items.flatMap((item) => {
        if (!item) return [];
        if (Array.isArray(item)) return flatten(item);
        if (Array.isArray(item.Data)) return flatten(item.Data);

        return [
          {
            productId:
              item.ProductId ??
              item.Productid ??
              item.productid ??
              item.productId ??
              item.productID ??
              '',
            omschrijving: item.Omschrijving ?? item.omschrijving ?? '',
          },
        ];
      });

    return flatten(Array.isArray(incoming) ? incoming : [incoming]);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await authFetch(withApiEnv('/api/products'), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch productdefinitions (status ${res.status})`);
      }

      const data = await res.json();
      const normalized = normalizeProducts(data.products || data.data || data);
      setProducts(normalized);
    } catch (err) {
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    const handleEnvChange = () => {
      fetchProducts();
    };
    window.addEventListener('apiEnvChange', handleEnvChange);
    return () => window.removeEventListener('apiEnvChange', handleEnvChange);
  }, []);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const filtered = (Array.isArray(products) ? products : []).filter((product) => {
      const omschrijving = product.omschrijving?.toLowerCase() || '';
      if (omschrijving.startsWith('unit 4')) return false;
      if (!term) return true;
      return product.productId?.toString().toLowerCase().includes(term) || omschrijving.includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      const av =
        sortKey === 'productId'
          ? (a.productId ?? '')
          : (a.omschrijving ?? '');

      const bv =
        sortKey === 'productId'
          ? (b.productId ?? '')
          : (b.omschrijving ?? '');

      const cmp = av.toString().localeCompare(bv.toString(), 'nl', {
        numeric: true,
        sensitivity: 'base',
      });

      return sortDir === 'asc' ? cmp : -cmp;
    });

    return sorted;
  }, [products, searchTerm, sortKey, sortDir]);

  return (
    <div className="min-h-screen brand-page">
      <TopNav />
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl border border-gray-200 brand-card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Producten</h1>
                <p className="text-sm text-gray-600 mt-1">Overzicht van de beschikbare producten</p>
              </div>

              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Zoek op Product Id of Omschrijving"
                  className="w-full md:w-64 px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 transition"
                />

                <button
                  onClick={fetchProducts}
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
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-6 mt-6 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 font-medium">Actie mislukt</p>
                <p className="text-xs text-yellow-700 mt-1">De productdefinities konden niet worden opgehaald</p>
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
                  <col style={{ width: '170px' }} />
                  <col style={{ width: '170px' }} />
                </colgroup>

                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => toggleSort('productId')}
                        className="inline-flex items-center gap-2 hover:opacity-80 select-none"
                        title="Klik om te sorteren"
                      >
                        PRODUCT ID{' '}
                        <span className="inline-block w-4 text-right text-[1em] leading-none">
                          {sortKey === 'productId' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                        </span>
                      </button>
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
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

                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      ACCEPTATIEREGELS
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">
                      DYNAMIEKREGELS
                    </th>
                  </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                        Geen producten gevonden
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr
                        key={product.productId || product.omschrijving}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.productId || '-'}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700 truncate" title={product.omschrijving}>
                          {product.omschrijving || '-'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="w-full flex justify-center">
                            <button
                              onClick={() => navigate(`/producten/${product.productId}/regels`)}
                              disabled={!product.productId}
                              className="px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border brand-outline"
                              title="Toon acceptatieregels"
                            >
                              Bekijk
                            </button>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="w-full flex justify-center">
                            <button
                              onClick={() => navigate(`/producten/${product.productId}/dynamiekregels`)}
                              disabled={!product.productId}
                              className="px-3 py-2 rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed border brand-outline"
                              title="Toon dynamiekregels"
                            >
                              Bekijk
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
