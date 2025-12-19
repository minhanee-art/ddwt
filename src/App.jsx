import React, { useEffect, useState } from 'react';
import TireBizPro from './components/TireBizPro';
import { inventoryService } from './services/InventoryService';

function App() {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        // Initialize the mock backend
        inventoryService.init();
        setIsReady(true);
    }, []);

    if (!isReady) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <h2 className="text-xl font-bold text-slate-800">TireBizPro System Loading...</h2>
                    <p className="text-slate-500">Connecting to Inventory Database...</p>
                </div>
            </div>
        );
    }

    return (
        <TireBizPro />
    );
}

export default App;
