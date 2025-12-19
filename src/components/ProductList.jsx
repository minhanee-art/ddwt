import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { inventoryService } from '../services/InventoryService';
import { googleSheetService } from '../services/GoogleSheetService';
import { BRAND_KO_MAP, normalizeSize, getBrandDisplayName } from '../utils/formatters';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [dotData, setDotData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ brand: 'All', size: '' });
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    useEffect(() => {
        loadData();
    }, []);

    // Re-fetch from API when size filter changes to support stx=... on server
    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [filter.size]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch products (API) and Sheet Data (Price/DOT) in parallel
            // GoogleSheetService now caches the sheet data, so this call is instant on subsequent searches
            const [productData, sheetData] = await Promise.all([
                inventoryService.fetchShopItems(filter.size),
                googleSheetService.fetchSheetData()
            ]);

            console.log(`[LoadData] Received ${productData.length} items from API and ${sheetData.length} rows from Sheet.`);

            // Merge Sheet Data into Products (Override API Factory Price, Add DOTs)
            // USER REQUEST: Only show items that have a valid price in the sheet (exclude items with 0 or missing price)
            const mergedProducts = productData.map(p => {
                let finalFactoryPrice = 0;
                let dotList = [];

                if (sheetData && sheetData.length > 0) {
                    // Match Logic: STRICT CODE MATCH (API partNo === Sheet code)
                    // User wants to connect data via the unique code.
                    const match = sheetData.find(d =>
                        p.partNo && d.code && String(p.partNo).trim() === String(d.code).trim()
                    );

                    if (match) {
                        // SET Price ONLY if found in sheet
                        if (Number(match.factoryPrice) > 0) {
                            finalFactoryPrice = Number(match.factoryPrice);
                            console.log(`[Match Success] PartNo: ${p.partNo} -> Price: ${finalFactoryPrice}`);
                        }
                        // Add DOTs
                        dotList = match.dotList || [];
                    }
                }

                return {
                    ...p,
                    factoryPrice: finalFactoryPrice,
                    dotList: dotList
                };
            }).filter(p => p.factoryPrice > 0); // EXCLUDE if no price found in sheet

            console.log(`[LoadData] Final display list: ${mergedProducts.length} items.`);
            setProducts(mergedProducts);
            // No separate state for dotData needed anymore
        } catch (error) {
            console.error("Failed to load shop data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    /**
     * Update product pricing info (local state only)
     */
    const handlePriceUpdate = (index, field, value) => {
        const newProducts = [...products];
        // Ensure index matches the unfiltered/sorted data correctly implies we should map by ID?
        // But since we sort 'filteredProducts', accessing via index might be tricky if we dont track original index.
        // For simplicity, we'll assume we are only viewing a subset. However, 'products' is the master list.
        // Better approach: Since we map filteredProducts, we need to find the item in 'products' to update it.
        // BUT filteredProducts is derived. Let's update 'products' directly.
        // Problem: 'idx' in map is index of filtered list.
        // Solution: Let's assume we can't easily map back without ID.
        // Actually, let's just cheat and update the object in place for this demo as React might not re-render deep changes 
        // without setProducts, but if we clone the master list it works.
        // Wait, filteredProducts contains REFERENCES to objects in products array.
        // So modifying a property of an item in filteredProducts AND calling setProducts([...products]) works.

        // Find the product in the master list to trigger re-render
        // We actually need to pass the *product object* itself to the handler

        // Value cleaning
        let cleanValue = value;
        if (field === 'discountRate' || field === 'factoryPrice') {
            cleanValue = Number(value.replace(/[^0-9.-]+/g, ""));
        }

        // Update the item
        newProducts.forEach(p => {
            // Basic strict check on reference (should work if filtered list items are refs to master items)
            if (p === index) { // index passed as the product object itself
                p[field] = cleanValue;
            }
        });

        setProducts(newProducts);
    };


    /**
     * Find DOT info for a product.
     * Tries to find a match in the sheet data based on Brand, Model, and Size.
     */
    const getDotForProduct = (product) => {
        if (!dotData || dotData.length === 0) return null;

        // Simple matching logic - can be refined based on actual data quality
        const match = dotData.find(d =>
            d.brand === product.brand &&
            d.model === product.model &&
            normalizeSize(d.size) === normalizeSize(product.size)
        );
        return match ? match.dot : '-';
    };

    // Filter Logic
    const filteredProducts = products.filter(p => {
        // 1. Valid Part No Filter (User Request: Exclude 0 or empty)
        if (!p.partNo || p.partNo === '0' || p.partNo === 0) return false;

        // 2. Valid Factory Price Filter (User Request: Exclude 0 or missing)
        if (!p.factoryPrice || p.factoryPrice === 0) return false;

        // 3. Brand Filter
        const matchBrand = filter.brand === 'All' || p.brand === filter.brand;

        // 3. Strict Size Filter (Server handles this mostly, but good to have safety)
        // DISABLED CLIENT SIDE SIZED FILTER: Trusting server-side 'stx' search result.
        // However, if we want to be safe:
        // const searchSize = normalizeSize(filter.size);
        // const productSize = normalizeSize(p.size);
        // let matchSize = true;
        // if (searchSize) matchSize = productSize.includes(searchSize);

        return matchBrand;
    });

    // Sort Logic
    if (sortConfig.key) {
        filteredProducts.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // Handle special cases
            if (sortConfig.key === 'brand') {
                // Sort by the display name (Hangul) if sorting by brand
                aValue = getBrandDisplayName(a.brand);
                bValue = getBrandDisplayName(b.brand);
            }
            // Sort by price or stock numbers
            if (sortConfig.key === 'factoryPrice' || sortConfig.key === 'discountedPrice' || sortConfig.key === 'totalStock') {
                aValue = Number(aValue || 0);
                bValue = Number(bValue || 0);
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }

    const uniqueBrands = ['All', ...new Set(products.map(p => p.brand))];

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    return (
        <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-800 bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="사이즈 검색 (예: 2454518)"
                            className="pl-10 pr-4 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 placeholder:text-slate-600"
                            value={filter.size}
                            onChange={(e) => setFilter({ ...filter, size: e.target.value })}
                        />
                    </div>

                    <select
                        className="pl-3 pr-8 py-2 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-slate-100"
                        value={filter.brand}
                        onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
                    >
                        {uniqueBrands.map(b => (
                            <option key={b} value={b}>
                                {getBrandDisplayName(b)}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={loadData}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-full transition-colors"
                        title="새로고침"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                    <div className="text-sm text-slate-400">
                        총 <span className="font-bold text-slate-100">{filteredProducts.length}</span>개 상품
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                            <th
                                className="px-4 py-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('brand')}
                            >
                                <div className="flex items-center gap-1">
                                    브랜드
                                    <SortIcon columnKey="brand" />
                                </div>
                            </th>
                            <th
                                className="px-4 py-4 cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('model')}
                            >
                                <div className="flex items-center gap-1">
                                    상품명
                                    <SortIcon columnKey="model" />
                                </div>
                            </th>
                            <th className="px-4 py-4 text-center text-xs text-gray-400">Part No.</th>
                            <th className="px-4 py-4">사이즈</th>

                            {/* New Pricing Columns */}
                            <th
                                className="px-4 py-4 text-right cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('factoryPrice')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    공장도(원)
                                    <SortIcon columnKey="factoryPrice" />
                                </div>
                            </th>
                            <th className="px-4 py-4 text-center">할인율(%)</th>
                            <th className="px-4 py-4 text-right font-bold text-slate-300">할인금액(원)</th>

                            <th
                                className="px-4 py-4 text-right cursor-pointer hover:bg-slate-800 transition-colors"
                                onClick={() => handleSort('totalStock')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    재고
                                    <SortIcon columnKey="totalStock" />
                                </div>
                            </th>
                            <th className="px-4 py-4 text-center">DOT</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        데이터를 불러오는 중입니다...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                                    검색된 상품이 없습니다.
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product, idx) => {
                                // Calculate Discounted Price
                                const factoryPrice = product.factoryPrice || 0;
                                const discountRate = product.discountRate || 0;
                                const discountedPrice = Math.floor(factoryPrice * (1 - discountRate / 100));

                                return (
                                    <tr key={idx} className="hover:bg-blue-900/20 transition-colors group">
                                        <td className="px-4 py-4">
                                            <span className="font-bold text-slate-200">
                                                {getBrandDisplayName(product.brand)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-300">{product.model}</div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-slate-500 font-mono text-xs border border-slate-800 px-1 rounded">
                                                {product.partNo || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded font-mono text-xs border border-slate-700">
                                                {product.size}
                                            </span>
                                        </td>

                                        {/* Pricing Inputs */}
                                        <td className="px-4 py-4 text-right">
                                            <input
                                                type="text"
                                                className="w-24 text-right border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                                value={factoryPrice ? factoryPrice.toLocaleString() : ''}
                                                onChange={(e) => handlePriceUpdate(product, 'factoryPrice', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex items-center justify-center">
                                                <input
                                                    type="number"
                                                    className="w-16 text-center border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                                    value={discountRate}
                                                    onChange={(e) => handlePriceUpdate(product, 'discountRate', e.target.value)}
                                                    min="0"
                                                    max="100"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-bold text-blue-400">
                                            {discountedPrice.toLocaleString()}
                                        </td>

                                        <td className="px-4 py-4 text-right">
                                            {product.totalStock > 0 ? (
                                                <span className="font-bold text-slate-400 tabular-nums">
                                                    {product.totalStock.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-red-500 text-xs font-bold uppercase tracking-tighter">SOLDOUT</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {/* DOT List Display */}
                                            {product.dotList && product.dotList.length > 0 ? (
                                                <div className="text-[10px] text-left text-slate-500 max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                                    {product.dotList.map((dot, i) => (
                                                        <div key={i} className="whitespace-nowrap py-0.5 border-b border-slate-800/50 last:border-0">{dot}</div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-700">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {!loading && filteredProducts.length > 0 && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 text-center">
                    <button className="text-sm text-blue-500 font-medium hover:text-blue-400 transition-colors">
                        결과 더 보기
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductList;
