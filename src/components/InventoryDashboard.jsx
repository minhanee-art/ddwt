import React, { useState, useEffect } from 'react';
import { Warehouse, AlertTriangle, RefreshCw, Plus, ScanLine, Search } from 'lucide-react';
import { inventoryService } from '../services/InventoryService';

const InventoryDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [lowStockItems, setLowStockItems] = useState([]);
    const [filter, setFilter] = useState('all'); // all, store, warehouse

    useEffect(() => {
        loadInventory();
    }, []);

    const loadInventory = () => {
        // In a real app, we would have a specific API for this.
        // Here we just grab all inventory from the service mock.
        const allInv = inventoryService.inventory.map(inv => {
            const product = inventoryService.products.find(p => p.id === inv.productId);
            return { ...inv, product };
        });

        setInventory(allInv);
        setLowStockItems(allInv.filter(i => i.stockQty <= i.reorderPoint));
    };

    const filteredInventory = inventory.filter(item => {
        if (filter === 'all') return true;
        return item.type === filter;
    });

    return (
        <div className="space-y-6">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">총 재고 자산</h3>
                        <Warehouse className="text-blue-600" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">
                        {(inventory.reduce((acc, curr) => acc + (curr.cost * curr.stockQty), 0) / 1000000).toFixed(1)}M 원
                    </p>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                        <RefreshCw size={12} className="mr-1" /> 실시간 연동됨
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-medium">재고 부족 알림</h3>
                        <AlertTriangle className="text-red-500" size={24} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{lowStockItems.length} 건</p>
                    <p className="text-xs text-red-500 mt-1">자동 발주 시스템 대기 중</p>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-center items-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <ScanLine size={32} className="text-blue-600 mb-2" />
                    <h3 className="font-bold text-slate-800">RFID 입고 스캔</h3>
                    <p className="text-xs text-gray-400">SGTIN-96 태그 인식</p>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-bold">재고 현황</h2>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setFilter('store')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${filter === 'store' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            매장
                        </button>
                        <button
                            onClick={() => setFilter('warehouse')}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${filter === 'warehouse' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                        >
                            물류센터
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3">상품명 (Model)</th>
                                <th className="px-6 py-3">사이즈</th>
                                <th className="px-6 py-3">위치</th>
                                <th className="px-6 py-3 text-right">재고수량</th>
                                <th className="px-6 py-3 text-right">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredInventory.slice(0, 20).map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 font-medium text-slate-800">
                                        {item.product?.brand} {item.product?.model}
                                    </td>
                                    <td className="px-6 py-3 text-gray-600">{item.product?.size}</td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${item.type === 'store' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {item.location}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right font-bold">{item.stockQty}</td>
                                    <td className="px-6 py-3 text-right">
                                        {item.stockQty <= item.reorderPoint ? (
                                            <span className="text-red-500 font-bold text-xs flex items-center justify-end">
                                                <AlertTriangle size={12} className="mr-1" /> 재고부족
                                            </span>
                                        ) : (
                                            <span className="text-green-500 text-xs">정상</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="p-4 border-t border-gray-200 text-center text-xs text-gray-400">
                    Showing top 20 items of {filteredInventory.length}
                </div>
            </div>
        </div>
    );
};

export default InventoryDashboard;
