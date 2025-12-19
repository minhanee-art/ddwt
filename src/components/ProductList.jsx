import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, AlertCircle, ArrowUpDown, ArrowUp, ArrowDown, Share2, X, Copy, ExternalLink, Check, CheckSquare, Square, ShoppingCart, ShoppingBag } from 'lucide-react';
import { inventoryService } from '../services/InventoryService';
import { googleSheetService } from '../services/GoogleSheetService';
import { BRAND_KO_MAP, normalizeSize, getBrandDisplayName } from '../utils/formatters';

const ProductList = () => {
    const [products, setProducts] = useState([]);
    const [dotData, setDotData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ brand: 'All', size: '' });
    const [sortConfig, setSortConfig] = useState({ key: 'totalStock', direction: 'desc' });
    const [selectedItems, setSelectedItems] = useState([]);
    const [cartItems, setCartItems] = useState([]); // Array of objects: { product, qty }
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        // Only clear if empty, no auto-load
        if (filter.size.trim().length === 0) {
            setProducts([]);
            setLoading(false);
        }
    }, [filter.size]);

    const loadData = async () => {
        setLoading(true);
        try {
            const searchSizeNorm = normalizeSize(filter.size);
            console.log(`[LoadData] Starting Sheet-First Search for: ${searchSizeNorm}`);

            // 1. Fetch Google Sheet Data (Primary Source)
            // 2. Fetch Blackcircles Inventory (Stock Source)
            const [sheetData, productData] = await Promise.all([
                googleSheetService.fetchSheetData(),
                inventoryService.fetchShopItems(filter.size)
            ]);

            // 3. Filter Sheet Data by Size and Price
            // Rule: Must match normalized size AND have factoryPrice > 0
            const filteredSheetEntries = sheetData.filter(d => {
                const sheetSizeNorm = normalizeSize(d.size);
                // match if sheet size (e.g. 2454519) matches search query
                return sheetSizeNorm.includes(searchSizeNorm) && d.factoryPrice > 0;
            });

            console.log(`[Sheet Data] Found ${filteredSheetEntries.length} matching entries in sheet.`);

            // 4. Create Stock Map from Blackcircles data
            // We've captured uniqueCode, itId, and internalCode. We match against ANY of them.
            const findInventoryMatch = (sheetCode) => {
                const sCode = String(sheetCode || '').trim();
                return productData.find(p => {
                    return String(p.partNo || '').trim() === sCode ||
                        String(p.itId || '').trim() === sCode ||
                        String(p.stId || '').trim() === sCode;
                });
            };

            // 5. Merge Sheet Data with Live Stock
            const mergedProducts = filteredSheetEntries.map(s => {
                const shopMatch = findInventoryMatch(s.code);

                if (shopMatch) {
                    console.log(`[Stock Success] Matched Sheet Code: ${s.code} with Shop! Stock: ${shopMatch.totalStock}`);
                }

                // Priority for display: Sheet Data for Price/DOT/Brand
                // Priority for Size: Detailed string from Shop if available
                return {
                    brand: s.brand || (shopMatch?.brand),
                    model: s.model || (shopMatch?.model),
                    size: shopMatch ? shopMatch.size : s.size, // SHOP size has more detail (4P, 105W etc)
                    partNo: s.code, // From sheet
                    factoryPrice: s.factoryPrice, // From sheet
                    dotList: s.dotList || [], // From sheet
                    totalStock: shopMatch ? shopMatch.totalStock : 0, // FROM SHOP
                    supplyPrice: shopMatch ? shopMatch.supplyPrice : 0,
                    discountRate: 0,
                    internalCode: s.code
                };
            }).filter(p => {
                return p.factoryPrice > 0;
            });

            console.log(`[LoadData] Final display list: ${mergedProducts.length} items.`);

            // Default Sort by Stock Descending
            const sortedProducts = [...mergedProducts].sort((a, b) => (b.totalStock || 0) - (a.totalStock || 0));

            setProducts(sortedProducts);
            setSortConfig({ key: 'totalStock', direction: 'desc' });
            setSelectedItems([]); // Clear selection when new search performed
        } catch (error) {
            console.error('Data Loading Error:', error);
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
            if (value === '') {
                cleanValue = '';
            } else {
                cleanValue = Number(value.toString().replace(/[^0-9.-]+/g, ""));
            }
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
        // 1. DISCONTINUED Filter (Now handled primarily at service level, but safely checked here)
        const isDiscontinued =
            (p.brand && p.brand.includes('단종')) ||
            (p.model && p.model.includes('단종'));
        if (isDiscontinued) return false;

        // 2. Brand Filter
        // USER REQUEST: Integrated Hankook + Laufenn
        // Making this matching more robust by checking both English and Korean names
        let matchBrand = filter.brand === 'All';
        if (!matchBrand) {
            const pBrandNum = p.brand.toLowerCase();
            const pBrandKo = getBrandDisplayName(p.brand);

            if (filter.brand === 'Hankook') {
                // Check for Hankook or Laufenn in various forms
                matchBrand = pBrandNum.includes('hankook') ||
                    pBrandNum.includes('laufenn') ||
                    pBrandKo.includes('한국') ||
                    pBrandKo.includes('라우펜');
            } else {
                // Check if p.brand (Eng) or its Ko name contains the filter brand (Eng) or its Ko name
                const targetBrandEng = filter.brand.toLowerCase();
                const targetBrandKo = getBrandDisplayName(filter.brand);

                matchBrand = pBrandNum.includes(targetBrandEng) ||
                    pBrandKo.includes(targetBrandKo);
            }
        }

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

    const addToCart = () => {
        setCartItems(prev => {
            const newCart = [...prev];
            selectedItems.forEach(item => {
                const existingIndex = newCart.findIndex(c =>
                    c.product.partNo === item.partNo &&
                    c.product.brand === item.brand &&
                    c.product.model === item.model &&
                    c.product.size === item.size
                );
                if (existingIndex > -1) {
                    newCart[existingIndex].qty += 4; // Add 4 more if already exists
                } else {
                    newCart.push({ product: item, qty: 4 });
                }
            });
            return newCart;
        });
        setSelectedItems([]);
        alert(`${selectedItems.length}개의 품목이 장바구니에 담겼습니다.`);
    };

    const removeFromCart = (cartItem) => {
        setCartItems(prev => prev.filter(item => item !== cartItem));
    };

    const updateCartQty = (cartItem, delta) => {
        setCartItems(prev => prev.map(item => {
            if (item === cartItem) {
                const newQty = Math.max(1, item.qty + delta);
                return { ...item, qty: newQty };
            }
            return item;
        }));
    };

    const clearCart = () => {
        if (window.confirm('장바구니를 모두 비우시겠습니까?')) {
            setCartItems([]);
        }
    };

    // Selection Handlers
    const toggleSelectItem = (product) => {
        setSelectedItems(prev => {
            const exists = prev.find(item => item === product);
            if (exists) {
                return prev.filter(item => item !== product);
            } else {
                return [...prev, product];
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectedItems.length === filteredProducts.length && filteredProducts.length > 0) {
            setSelectedItems([]);
        } else {
            setSelectedItems([...filteredProducts]);
        }
    };

    const isSelected = (product) => selectedItems.includes(product);

    const generateShareText = () => {
        let text = "[대동타이어 견적안내]\n";
        text += "Tel. 1566-1342\n\n";
        let totalSum = 0;
        cartItems.forEach((item, i) => {
            const p = item.product;
            const discountedPrice = Math.floor((p.factoryPrice || 0) * (1 - (p.discountRate || 0) / 100));
            const subtotal = discountedPrice * item.qty;
            totalSum += subtotal;

            text += `${i + 1}. ${getBrandDisplayName(p.brand)} ${p.model}\n`;
            text += `   규격: ${p.size}\n`;
            text += `   단가: ${discountedPrice.toLocaleString()}원 (할인율: ${p.discountRate}%)\n`;
            text += `   수량: ${item.qty}개\n`;
            text += `   소계: ${subtotal.toLocaleString()}원\n\n`;
        });
        text += `총 합계금액: ${totalSum.toLocaleString()}원\n`;
        text += "-----------------------------\n";
        text += "기업 15207812304017 (주)대동휠앤타이어";
        return text;
    };

    const copyToClipboard = () => {
        const text = generateShareText();
        navigator.clipboard.writeText(text).then(() => {
            alert('견적 내용이 클립보드에 복사되었습니다.');
        });
    };

    const copyAccount = () => {
        navigator.clipboard.writeText("15207812304017").then(() => {
            alert('계좌번호(기업 15207812304017)가 복사되었습니다.');
        });
    };

    const brandOptions = [
        'All',
        'Hankook',
        'Michelin',
        'Dunlop',
        'Yokohama',
        'Goodyear',
        'Kumho',
        'Pirelli',
        'Continental'
    ];

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp size={14} className="text-blue-600" />
            : <ArrowDown size={14} className="text-blue-600" />;
    };

    return (
        <div className="bg-slate-900 rounded-xl shadow-2xl border border-slate-800 overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px] md:flex-none md:w-52">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="사이즈 검색"
                            className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-800 text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-slate-600"
                            value={filter.size}
                            onChange={(e) => setFilter({ ...filter, size: e.target.value })}
                            onKeyDown={(e) => e.key === 'Enter' && filter.size.trim() && loadData()}
                        />
                    </div>

                    <select
                        className="flex-1 md:flex-none pl-3 pr-8 py-2 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-slate-100 min-w-[120px]"
                        value={filter.brand}
                        onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
                    >
                        {brandOptions.map(b => (
                            <option key={b} value={b}>
                                {b === 'Hankook' ? '한국+라우펜' : getBrandDisplayName(b)}
                            </option>
                        ))}
                    </select>

                    <button
                        onClick={loadData}
                        disabled={!filter.size.trim()}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-all shadow-lg active:scale-95"
                    >
                        <Search size={16} />
                        <span>검색</span>
                    </button>

                    <div className="flex gap-2 w-full md:w-auto">
                        {selectedItems.length > 0 && (
                            <button
                                onClick={addToCart}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition-all shadow-lg active:scale-95 animate-in fade-in slide-in-from-left-2 duration-300"
                            >
                                <ShoppingBag size={16} />
                                <span className="whitespace-nowrap text-sm">담기 ({selectedItems.length})</span>
                            </button>
                        )}

                        {cartItems.length > 0 && (
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-all shadow-lg animate-in fade-in zoom-in duration-300"
                            >
                                <ShoppingCart size={16} />
                                <span className="whitespace-nowrap text-sm">장바구니 ({cartItems.length})</span>
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
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

                    <div className="text-[10px] text-slate-500 italic hidden sm:block">
                        * 공장도 가격이 있는 상품만 표시됩니다.
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-slate-800/50 text-slate-400 font-medium border-b border-slate-800">
                        <tr>
                            <th className="px-4 py-4 w-10 text-center">
                                <button onClick={toggleSelectAll} className="p-1 hover:bg-slate-700 rounded transition-colors text-slate-400">
                                    {selectedItems.length === filteredProducts.length && filteredProducts.length > 0
                                        ? <CheckSquare size={18} className="text-blue-500" />
                                        : <Square size={18} />
                                    }
                                </button>
                            </th>
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
                            <th className="px-4 py-4 text-center text-xs text-gray-400">Part No.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                        데이터를 불러오는 중입니다...
                                    </div>
                                </td>
                            </tr>
                        ) : filteredProducts.length === 0 ? (
                            <tr>
                                <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                                    <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                                    {filter.size.trim().length === 0 ? "사이즈를 입력하여 검색을 시작하세요." : "검색된 상품이 없습니다."}
                                </td>
                            </tr>
                        ) : (
                            filteredProducts.map((product, idx) => {
                                // Calculate Discounted Price
                                const factoryPrice = product.factoryPrice ?? 0;
                                const discountRate = (product.discountRate === undefined || product.discountRate === null) ? 0 : product.discountRate;
                                const discountedPrice = Math.floor((Number(factoryPrice) || 0) * (1 - (Number(discountRate) || 0) / 100));

                                return (
                                    <tr key={idx} className={`hover:bg-blue-900/20 transition-colors group ${isSelected(product) ? 'bg-blue-900/10' : ''}`}>
                                        <td className="px-4 py-4 text-center">
                                            <button
                                                onClick={() => toggleSelectItem(product)}
                                                className={`p-1 rounded transition-colors ${isSelected(product) ? 'text-blue-500' : 'text-slate-600 hover:text-slate-400'}`}
                                            >
                                                {isSelected(product) ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="font-bold text-slate-200">
                                                {getBrandDisplayName(product.brand)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="font-medium text-slate-300">{product.model}</div>
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
                                                    type="text"
                                                    className="w-16 text-center border border-slate-700 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-800 text-slate-200 hover:bg-slate-700"
                                                    value={discountRate}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        handlePriceUpdate(product, 'discountRate', val === '' ? '' : Number(val));
                                                    }}
                                                    onFocus={() => { if (Number(discountRate) === 0) handlePriceUpdate(product, 'discountRate', ''); }}
                                                    onBlur={() => { if (discountRate === '') handlePriceUpdate(product, 'discountRate', 0); }}
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
                                                <div className="text-[10px] text-left text-slate-500">
                                                    {product.dotList.map((dot, i) => (
                                                        <div key={i} className="whitespace-nowrap py-0.5 border-b border-slate-800/50 last:border-0">{dot}</div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-700">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-slate-500 font-mono text-xs border border-slate-800 px-1 rounded">
                                                {product.partNo || '-'}
                                            </span>
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

            {/* Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/50">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Share2 className="text-blue-500" />
                                    장바구니 견적 공유
                                </h3>
                                <p className="text-slate-400 text-sm mt-1">장바구니에 {cartItems.length}개의 품목이 담겨 있습니다.</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearCart}
                                    className="px-3 py-1 text-xs text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/20"
                                >
                                    장바구니 비우기
                                </button>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {cartItems.map((item, i) => {
                                const p = item.product;
                                const discountedPrice = Math.floor((p.factoryPrice || 0) * (1 - (p.discountRate || 0) / 100));
                                const subtotal = discountedPrice * item.qty;
                                return (
                                    <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4 group relative">
                                        <button
                                            onClick={() => removeFromCart(item)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-slate-700 text-slate-400 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 hover:text-white transition-all shadow-lg z-10"
                                            title="삭제"
                                        >
                                            <X size={14} />
                                        </button>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-blue-600/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                                                    {getBrandDisplayName(p.brand)}
                                                </span>
                                                <span className="text-white font-bold">{p.model}</span>
                                            </div>
                                            <div className="text-slate-400 text-sm font-mono">{p.size}</div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {/* Qty Controller */}
                                            <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-slate-700">
                                                <button
                                                    onClick={() => updateCartQty(item, -1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                                >
                                                    -
                                                </button>
                                                <span className="w-10 text-center font-bold text-blue-400">{item.qty}</span>
                                                <button
                                                    onClick={() => updateCartQty(item, 1)}
                                                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="flex flex-col items-end min-w-[120px]">
                                                <div className="text-slate-500 text-[10px] mb-1">
                                                    단가: {discountedPrice.toLocaleString()}원
                                                </div>
                                                <div className="text-blue-400 text-lg font-black">{subtotal.toLocaleString()}원</div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Sum Footer */}
                        <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-slate-400 font-bold">총 합계금액</span>
                            <span className="text-2xl font-black text-white">
                                {cartItems.reduce((acc, item) => {
                                    const p = item.product;
                                    const price = Math.floor((p.factoryPrice || 0) * (1 - (p.discountRate || 0) / 100));
                                    return acc + (price * item.qty);
                                }, 0).toLocaleString()}원
                            </span>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex flex-col gap-3">
                            <button
                                onClick={copyToClipboard}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg rounded-xl flex items-center justify-center gap-3 shadow-xl transform transition-transform active:scale-[0.98]"
                            >
                                <Copy size={20} />
                                견적 공유하기
                            </button>

                            <div className="flex flex-col items-center gap-3 py-2 border-t border-slate-800 mt-2 pt-4">
                                <div className="text-slate-400 text-xs">-----------------------------</div>
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={copyAccount}
                                        className="text-slate-300 font-bold hover:text-blue-400 transition-colors"
                                    >
                                        기업 15207812304017 (주)대동휠앤타이어
                                    </button>
                                    <a
                                        href="https://toss.im/_m/transfer?bank=%EA%B8%B0%EC%97%85&account=15207812304017"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-blue-500 font-medium bg-blue-500/10 px-3 py-1.5 rounded-full hover:bg-blue-500/20 transition-all border border-blue-500/20"
                                    >
                                        토스로 송금하기
                                    </a>
                                </div>

                                <div className="flex items-center gap-6 mt-2">
                                    <a
                                        href="tel:1566-1342"
                                        className="text-slate-400 text-sm hover:text-blue-400 transition-colors flex items-center gap-1"
                                    >
                                        전화문의: 1566-1342
                                    </a>
                                    <button
                                        onClick={() => setShowShareModal(false)}
                                        className="text-slate-500 text-sm hover:text-slate-300 transition-colors"
                                    >
                                        닫기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
