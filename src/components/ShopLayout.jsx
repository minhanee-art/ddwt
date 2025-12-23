import React from 'react';

const ShopLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-blue-500/30">
            {/* Background Decorative Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            </div>

            {/* Premium Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky md:top-0 z-40 shadow-sm transition-all">
                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-14 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
                            대동타이어
                            <span className="hidden xs:inline text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em]">Inventory Management</span>
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1700px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
                {children}
            </main>

            <footer className="bg-slate-100 border-t border-slate-200 py-8 relative z-10">
                <div className="max-w-[1700px] mx-auto px-4 text-center">
                    <div className="text-[11px] text-slate-600 uppercase tracking-[0.3em] font-black mb-2">
                        대동타이어
                    </div>
                    <div className="text-[9px] text-slate-400 font-medium">
                        &copy; 2025 DDWT. ALL RIGHTS RESERVED. DATA SYNCED VIA BC-API & GOOGLE CLOUD.
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ShopLayout;
