import React from 'react';

const ShopLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Premium Header */}
            <header className="bg-slate-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg transform rotate-3">
                            <span className="text-white font-black text-xs">DT</span>
                        </div>
                        <h1 className="text-lg font-black text-white tracking-tight flex items-baseline gap-2">
                            대동타이어
                            <span className="hidden xs:inline text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">Inventory Management</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse"></div>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                {children}
            </main>

            <footer className="bg-slate-900 border-t border-white/5 py-8 relative z-10">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold mb-2">
                        Daedong Tire & Wheel
                    </div>
                    <div className="text-[9px] text-slate-600">
                        &copy; 2025 DDWT. ALL RIGHTS RESERVED. DATA SYNCED VIA BC-API & GOOGLE CLOUD.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ShopLayout;
