import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        port: 8080,
        proxy: {
            '/api/inventory': {
                target: 'https://blackcircles.co.kr',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/inventory/, '/seller/stock_list_option.php'),
                secure: false,
                headers: {
                    'Cookie': 'PHPSESSID=e0j66i422s2gfhukmng3hmjg1h; 6e1280981e1dfd9169c5dea9c28ff2e3=NTA0ODE3NDg1Mg%3D%3D; a3e94372a6379bc1ae3698dfdf38595b=NTJiYmM1MzNmMmY0OTNjNjM4YzhlMzI5N2UyNDI4ODU%3D',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            '/api/shop': {
                target: 'https://blackcircles.co.kr',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/shop/, '/shop/list.php'),
                secure: false,
                headers: {
                    'Cookie': 'PHPSESSID=e0j66i422s2gfhukmng3hmjg1h; 6e1280981e1dfd9169c5dea9c28ff2e3=NTA0ODE3NDg1Mg%3D%3D; a3e94372a6379bc1ae3698dfdf38595b=NTJiYmM1MzNmMmY0OTNjNjM4YzhlMzI5N2UyNDI4ODU%3D',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            },
            '/api/shop_ajax': {
                target: 'https://blackcircles.co.kr',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/shop_ajax/, '/ajax_call/shop/list_more.php'),
                secure: false,
                headers: {
                    'Cookie': 'PHPSESSID=e0j66i422s2gfhukmng3hmjg1h; 6e1280981e1dfd9169c5dea9c28ff2e3=NTA0ODE3NDg1Mg%3D%3D; a3e94372a6379bc1ae3698dfdf38595b=NTJiYmM1MzNmMmY0OTNjNjM4YzhlMzI5N2UyNDI4ODU%3D',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            },
        },
    },
});
