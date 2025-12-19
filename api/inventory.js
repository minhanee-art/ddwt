export default async function handler(req, res) {
    const { stx } = req.query;

    // URL for Blackcircles inventory
    const targetUrl = `https://blackcircles.co.kr/seller/stock_list_option.php?stx=${encodeURIComponent(stx || '')}`;

    // Use Environment Variables for sensitive headers if possible
    // Falls back to current working values if not set
    const cookie = process.env.BLACKCIRCLES_COOKIE || 'PHPSESSID=e0j66i422s2gfhukmng3hmjg1h; 6e1280981e1dfd9169c5dea9c28ff2e3=NTA0ODE3NDg1Mg%3D%3D; a3e94372a6379bc1ae3698dfdf38595b=NTJiYmM1MzNmMmY0OTNjNjM4YzhlMzI5N2UyNDI4ODU%3D';
    const ua = process.env.BLACKCIRCLES_UA || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    try {
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Cookie': cookie,
                'User-Agent': ua,
                'Accept': 'text/html'
            }
        });

        const body = await response.text();

        // Set headers for the response
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Cache for 1 min on Vercel Edge

        res.status(200).send(body);
    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
}
