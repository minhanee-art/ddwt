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
                    newCart[existingIndex].qty += 1; // Add 1 more if already exists
                } else {
                    newCart.push({ product: item, qty: 1 });
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
            {/* Premium Toolbar */}
            <div className="p-5 border-b border-white/5 bg-slate-900/50">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Search & Brand Group */}
                    <div className="flex flex-col sm:flex-row flex-1 gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                            <input
                                type="text"
                                placeholder="규격 입력 (예: 2454518)"
                                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600"
                                value={filter.size}
                                onChange={(e) => setFilter({ ...filter, size: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && filter.size.trim() && loadData()}
                            />
                        </div>

                        <select
                            className="w-full sm:w-48 pl-4 pr-10 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                            value={filter.brand}
                            onChange={(e) => setFilter({ ...filter, brand: e.target.value })}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 12px center', backgroundSize: '16px', backgroundRepeat: 'no-repeat' }}
                        >
                            {brandOptions.map(b => (
                                <option key={b} value={b} className="bg-slate-900">
                                    {b === 'Hankook' ? '한국+라우펜' : getBrandDisplayName(b)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Action Group */}
                    <div className="flex flex-row gap-2">
                        <button
                            onClick={loadData}
                            disabled={!filter.size.trim() || loading}
                            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                        >
                            {loading ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
                            <span className="whitespace-nowrap">검색하기</span>
                        </button>

                        <div className="flex gap-2">
                            {selectedItems.length > 0 && (
                                <button
                                    onClick={addToCart}
                                    className="p-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg active:scale-95 animate-in slide-in-from-right-4"
                                    title="장바구니 담기"
                                >
                                    <ShoppingBag size={20} />
                                </button>
                            )}

                            {cartItems.length > 0 && (
                                <button
                                    onClick={() => setShowShareModal(true)}
                                    className="p-3 bg-green-500 hover:bg-green-400 text-slate-900 font-bold rounded-xl transition-all shadow-lg active:scale-95 animate-in zoom-in"
                                    title="장바구니 보기"
                                >
                                    <ShoppingCart size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[11px] font-bold tracking-wider">
                    <div className="flex items-center gap-3 text-slate-500 uppercase">
                        <span>Result Count</span>
                        <span className="text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">{filteredProducts.length}</span>
                    </div>
                    <div className="text-slate-600 italic lg:block hidden">
                        * 공장도 가격이 등록된 상품만 리스팅됩니다.
                    </div>
                </div>
            </div>

            {/* Data Display */}
            <div className="relative">
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-800/30 text-slate-500 font-bold uppercase tracking-wider border-b border-white/5">
                            <tr>
                                <th className="px-5 py-4 w-12 text-center">
                                    <button onClick={toggleSelectAll} className="hover:text-blue-400 transition-colors">
                                        {selectedItems.length === filteredProducts.length && filteredProducts.length > 0
                                            ? <CheckSquare size={20} className="text-blue-500" />
                                            : <Square size={20} />
                                        }
                                    </button>
                                </th>
                                <th className="px-5 py-4 cursor-pointer group" onClick={() => handleSort('brand')}>
                                    <div className="flex items-center gap-2">브랜드 <SortIcon columnKey="brand" /></div>
                                </th>
                                <th className="px-5 py-4 cursor-pointer group" onClick={() => handleSort('model')}>
                                    <div className="flex items-center gap-2">상품명 <SortIcon columnKey="model" /></div>
                                </th>
                                <th className="px-5 py-4">규격</th>
                                <th className="px-5 py-4 text-right cursor-pointer group" onClick={() => handleSort('factoryPrice')}>
                                    <div className="flex items-center justify-end gap-2">공장도 <SortIcon columnKey="factoryPrice" /></div>
                                </th>
                                <th className="px-5 py-4 text-center">DC(%)</th>
                                <th className="px-5 py-4 text-right font-black text-slate-400">판매가</th>
                                <th className="px-5 py-4 text-right cursor-pointer group" onClick={() => handleSort('totalStock')}>
                                    <div className="flex items-center justify-end gap-2">재고 <SortIcon columnKey="totalStock" /></div>
                                </th>
                                <th className="px-5 py-4 text-center">DOT</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-10 h-10 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                                            <span className="text-slate-500 font-bold">Synchronizing Data...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="py-24 text-center text-slate-500">
                                        <Search size={48} className="mx-auto mb-4 opacity-10" />
                                        <div className="font-black text-xl mb-1">NO DATA FOUND</div>
                                        <p className="text-sm opacity-50 font-medium">Please refine your search query.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredProducts.map((p, idx) => {
                                    const factoryPrice = p.factoryPrice ?? 0;
                                    const discountRate = p.discountRate || 0;
                                    const discountedPrice = Math.floor(factoryPrice * (1 - discountRate / 100));
                                    const selected = isSelected(p);

                                    return (
                                        <tr key={idx} className={`group transition-premium hover:bg-blue-600/5 ${selected ? 'bg-blue-600/10' : ''}`}>
                                            <td className="px-5 py-4 text-center">
                                                <button onClick={() => toggleSelectItem(p)} className={`transition-colors ${selected ? 'text-blue-500' : 'text-slate-700 group-hover:text-slate-500'}`}>
                                                    {selected ? <CheckSquare size={20} /> : <Square size={20} />}
                                                </button>
                                            </td>
                                            <td className="px-5 py-4 font-black text-slate-200">{getBrandDisplayName(p.brand)}</td>
                                            <td className="px-5 py-4 font-bold text-slate-400">{p.model}</td>
                                            <td className="px-5 py-4">
                                                <span className="bg-slate-800/50 px-2 py-1 rounded font-mono text-[11px] border border-white/5 text-slate-400">{p.size}</span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <input
                                                    type="text"
                                                    className="w-24 text-right bg-slate-800/30 border border-white/5 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                                    value={factoryPrice ? factoryPrice.toLocaleString() : ''}
                                                    onChange={(e) => handlePriceUpdate(p, 'factoryPrice', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <input
                                                    type="text"
                                                    className="w-12 text-center bg-blue-500/5 border border-blue-500/10 rounded px-1 py-1 text-xs font-black text-blue-400 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
                                                    value={discountRate}
                                                    onChange={(e) => handlePriceUpdate(p, 'discountRate', e.target.value.replace(/[^0-9]/g, ''))}
                                                />
                                            </td>
                                            <td className="px-5 py-4 text-right font-black text-blue-400 tabular-nums">{discountedPrice.toLocaleString()}</td>
                                            <td className="px-5 py-4 text-right font-black tabular-nums">
                                                {p.totalStock > 0 ? <span className="text-slate-400">{p.totalStock.toLocaleString()}</span> : <span className="text-red-500/50">OUT</span>}
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex flex-col gap-0.5 max-h-12 overflow-y-auto no-scrollbar">
                                                    {p.dotList?.map((dot, i) => <div key={i} className="text-[10px] text-slate-600 whitespace-nowrap">{dot}</div>)}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden p-4 space-y-4">
                    {loading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                            <span className="text-lg font-black text-slate-500 italic">LOADING...</span>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="py-20 text-center opacity-30">
                            <Search size={64} className="mx-auto mb-4" />
                            <div className="text-2xl font-black italic">NO RESULTS</div>
                        </div>
                    ) : (
                        filteredProducts.map((p, idx) => {
                            const factoryPrice = p.factoryPrice ?? 0;
                            const discountRate = p.discountRate || 0;
                            const discountedPrice = Math.floor(factoryPrice * (1 - discountRate / 100));
                            const selected = isSelected(p);

                            return (
                                <div key={idx} className={`relative p-5 rounded-2xl border transition-premium overflow-hidden ${selected ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-900/40' : 'bg-slate-900/50 border-white/5'}`}>
                                    {/* Selection Glow */}
                                    {selected && <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-[60px] pointer-events-none"></div>}

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div onClick={() => toggleSelectItem(p)} className="cursor-pointer">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="px-2 py-0.5 bg-blue-600 text-[10px] font-black rounded uppercase tracking-tighter shadow-lg shadow-blue-900/40">{getBrandDisplayName(p.brand)}</span>
                                                <span className={`transition-colors ${selected ? 'text-blue-400' : 'text-slate-600'}`}>
                                                    {selected ? <CheckSquare size={22} /> : <Square size={22} />}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-white leading-tight">{p.model}</h3>
                                            <p className="text-xs font-mono text-slate-500 mt-1">{p.size}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Stock</div>
                                            <div className={`text-xl font-black italic ${p.totalStock > 0 ? 'text-slate-300' : 'text-red-500/50'}`}>
                                                {p.totalStock > 0 ? p.totalStock.toLocaleString() : 'OUT'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5 relative z-10">
                                        <div>
                                            <label className="text-[10px] text-slate-600 font-black uppercase mb-1 block">Factory Price</label>
                                            <input
                                                type="text"
                                                className="w-full bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2 text-sm font-bold text-slate-300 focus:ring-1 focus:ring-blue-500/50 outline-none"
                                                value={factoryPrice ? factoryPrice.toLocaleString() : ''}
                                                onChange={(e) => handlePriceUpdate(p, 'factoryPrice', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-slate-600 font-black uppercase mb-1 block">Discount %</label>
                                            <input
                                                type="text"
                                                className="w-full bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 text-sm font-black text-blue-400 focus:ring-1 focus:ring-blue-500/50 outline-none"
                                                value={discountRate}
                                                onChange={(e) => handlePriceUpdate(p, 'discountRate', e.target.value.replace(/[^0-9]/g, ''))}
                                            />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-end justify-between relative z-10">
                                        <div className="flex flex-wrap gap-1 max-w-[60%]">
                                            {p.dotList?.slice(0, 3).map((dot, i) => (
                                                <span key={i} className="text-[9px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-white/5">{dot}</span>
                                            ))}
                                            {p.dotList?.length > 3 && <span className="text-[9px] text-slate-600">+{p.dotList.length - 3} more</span>}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest leading-none mb-1">Sales Price</div>
                                            <div className="text-2xl font-black text-blue-400 drop-shadow-[0_0_10px_rgba(37,99,235,0.4)]">
                                                {discountedPrice.toLocaleString()}<span className="text-sm ml-0.5">₩</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Sticky Mobile Add to Cart Button */}
            {selectedItems.length > 0 && (
                <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-40 animate-in slide-in-from-bottom-8">
                    <button
                        onClick={addToCart}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-900 font-black rounded-2xl shadow-2xl flex items-center justify-center gap-3 active:scale-[0.98] transition-transform overflow-hidden group"
                    >
                        <ShoppingBag size={24} className="group-hover:animate-bounce" />
                        <span className="text-lg">장바구니에 {selectedItems.length}개 추가</span>
                        <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rotate-12"></div>
                    </button>
                </div>
            )}

            {!loading && filteredProducts.length > 0 && (
                <div className="p-4 border-t border-slate-800 bg-slate-900 text-center">
                    <button className="text-sm text-blue-500 font-medium hover:text-blue-400 transition-colors">
                        결과 더 보기
                    </button>
                </div>
            )}

            {/* Premium Share Modal */}
            {showShareModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-slate-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                        {/* Header */}
                        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-800/30">
                            <div>
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    <Share2 className="text-blue-500" />
                                    견적서 생성
                                </h3>
                                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                                    {cartItems.length} ITEMS IN BASKET
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={clearCart}
                                    className="px-3 py-1.5 text-[10px] font-black text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border border-red-400/30 uppercase tracking-tighter"
                                >
                                    Empty
                                </button>
                                <button
                                    onClick={() => setShowShareModal(false)}
                                    className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-premium"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
                            {cartItems.map((item, i) => {
                                const p = item.product;
                                const discountedPrice = Math.floor((p.factoryPrice || 0) * (1 - (p.discountRate || 0) / 100));
                                const subtotal = discountedPrice * item.qty;
                                return (
                                    <div key={i} className="bg-slate-800/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-4 group relative">
                                        <button
                                            onClick={() => removeFromCart(item)}
                                            className="absolute top-2 right-2 w-8 h-8 bg-slate-800 text-slate-500 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition-premium shadow-lg z-10"
                                        >
                                            <X size={16} />
                                        </button>

                                        <div className="flex justify-between items-start pr-8">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-blue-600/20 text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                        {getBrandDisplayName(p.brand)}
                                                    </span>
                                                    <span className="text-white font-black text-sm">{p.model}</span>
                                                </div>
                                                <div className="text-slate-500 text-[11px] font-bold font-mono uppercase">{p.size}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[9px] text-slate-600 font-black uppercase mb-1">Total</div>
                                                <div className="text-blue-400 font-black text-lg">{subtotal.toLocaleString()}원</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-white/5 shadow-inner">
                                                <button
                                                    onClick={() => updateCartQty(item, -1)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-xl"
                                                >
                                                    -
                                                </button>
                                                <span className="w-10 text-center font-black text-blue-500 text-lg tabular-nums">{item.qty}</span>
                                                <button
                                                    onClick={() => updateCartQty(item, 1)}
                                                    className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors font-black text-xl"
                                                >
                                                    +
                                                </button>
                                            </div>

                                            <div className="text-right text-[10px] text-slate-500 font-bold italic">
                                                Unit Price: {discountedPrice.toLocaleString()}원
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Total Sum Footer */}
                        <div className="px-6 py-6 bg-slate-800/50 border-t border-white/5 flex justify-between items-end">
                            <div>
                                <span className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px] block mb-1">Estimation Total</span>
                                <span className="text-3xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                                    {cartItems.reduce((acc, item) => {
                                        const p = item.product;
                                        const price = Math.floor((p.factoryPrice || 0) * (1 - (p.discountRate || 0) / 100));
                                        return acc + (price * item.qty);
                                    }, 0).toLocaleString()}<span className="text-sm ml-1 opacity-50 font-medium italic uppercase">KRW</span>
                                </span>
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="p-6 bg-slate-900 space-y-4 pb-10 sm:pb-6">
                            <button
                                onClick={copyToClipboard}
                                className="w-full py-5 bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-lg rounded-2xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 active:scale-[0.98] transition-all group overflow-hidden relative"
                            >
                                <Copy size={22} className="group-hover:rotate-12 transition-transform" />
                                견적 내용 복사
                                <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 rotate-12"></div>
                            </button>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={copyAccount}
                                    className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all border border-white/5"
                                >
                                    계좌번호 복사
                                </button>
                                <a
                                    href="https://toss.im/_m/transfer?bank=%EA%B8%B0%EC%97%85&account=15207812304017"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl transition-all border border-blue-500/20 text-center flex items-center justify-center"
                                >
                                    토스 송금
                                </a>
                            </div>

                            <button
                                onClick={() => setShowShareModal(false)}
                                className="w-full text-slate-600 text-xs font-bold uppercase tracking-[0.2em] hover:text-slate-400 transition-colors"
                            >
                                Dismiss Modal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;
