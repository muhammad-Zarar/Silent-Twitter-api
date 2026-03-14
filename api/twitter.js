module.exports = async (req, res) => {
    // 1. Setup CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { url } = req.query;

    if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
        return res.status(400).json({ ok: false, message: "Provide a valid Twitter/X URL" });
    }

    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname; 

        // 🧠 THE BYPASS: Pretend to be the official Telegram Web Scraper
        // Cloudflare allows this user-agent 100% of the time!
        const stealthHeaders = {
            'User-Agent': 'TelegramBot (like TwitterBot)' 
        };

        // ==========================================
        // 🚀 ENGINE 1: vxTwitter
        // ==========================================
        const vxUrl = `https://api.vxtwitter.com${pathname}`;
        const vxRes = await fetch(vxUrl, { headers: stealthHeaders });
        
        const vxText = await vxRes.text(); // Read as text first to prevent JSON crash

        if (vxRes.ok && vxText.startsWith('{')) {
            const data = JSON.parse(vxText);
            if (data.hasMedia && data.mediaURLs && data.mediaURLs.length > 0) {
                return res.status(200).json({
                    ok: true,
                    author: data.user_name,
                    handle: `@${data.user_screen_name}`,
                    caption: data.text,
                    likes: data.likes || 0,
                    retweets: data.retweets || 0,
                    mediaType: data.media_extended[0].type,
                    downloadUrls: data.mediaURLs
                });
            }
        }

        // ==========================================
        // 🚀 ENGINE 2: FxTwitter (Fallback)
        // ==========================================
        const fxUrl = `https://api.fxtwitter.com${pathname}`;
        const fxRes = await fetch(fxUrl, { headers: stealthHeaders });
        
        const fxText = await fxRes.text();

        if (fxRes.ok && fxText.startsWith('{')) {
            const json = JSON.parse(fxText);
            const data = json.tweet;
            
            if (data && data.media && data.media.all && data.media.all.length > 0) {
                const mediaUrls = data.media.all.map(m => m.url);
                return res.status(200).json({
                    ok: true,
                    author: data.author.name,
                    handle: `@${data.author.screen_name}`,
                    caption: data.text,
                    likes: data.likes || 0,
                    retweets: data.retweets || 0,
                    mediaType: data.media.all[0].type === 'photo' ? 'image' : 'video', 
                    downloadUrls: mediaUrls
                });
            }
        }

        return res.status(404).json({ ok: false, message: "No media found in this tweet, or the tweet is private." });

    } catch (error) {
        console.error("Vercel API Error:", error.message);
        return res.status(500).json({ ok: false, message: "Server Error: " + error.message });
    }
};
