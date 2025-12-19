import React from 'react';

const ShopLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            {/* Minimal Header */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-lg font-bold text-white tracking-tight">
                            대동타이어 <span className="text-blue-500 text-base font-light mx-1">|</span> <span className="text-slate-400 font-medium">제품검색</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 uppercase tracking-widest">
                        <span className="font-semibold">Live System</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"></div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
            </main>

            <footer className="bg-slate-900 border-t border-slate-800 py-4 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center text-[10px] text-slate-600 uppercase tracking-widest font-medium">
                    &copy; 2025 DDWT DAEDONG TIRE. DATA SOURCE: BLACKCIRCLES & GOOGLE SHEETS.
                </div>
            </footer>
        </div>
    );
};

export default ShopLayout;
