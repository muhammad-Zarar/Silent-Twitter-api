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

    // 2. Validate URL
    if (!url || (!url.includes('twitter.com') && !url.includes('x.com'))) {
        return res.status(400).json({ ok: false, message: "Provide a valid Twitter/X URL" });
    }

    try {
        // 3. Clean the URL (Removes tracking tags like ?s=46)
        const urlObj = new URL(url);
        const pathname = urlObj.pathname; // Gets exactly "/username/status/12345"

        // ==========================================
        // 🚀 ENGINE 1: vxTwitter
        // ==========================================
        const vxUrl = `https://api.vxtwitter.com${pathname}`;
        const vxRes = await fetch(vxUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (vxRes.ok) {
            const data = await vxRes.json();
            if (data.hasMedia && data.mediaURLs && data.mediaURLs.length > 0) {
                return res.status(200).json({
                    ok: true,
                    author: data.user_name,
                    handle: `@${data.user_screen_name}`,
                    caption: data.text,
                    likes: data.likes || 0,
                    retweets: data.retweets || 0,
                    mediaType: data.media_extended[0].type, // 'video' or 'image'
                    downloadUrls: data.mediaURLs
                });
            }
        }

        // ==========================================
        // 🚀 ENGINE 2: FxTwitter (Fallback)
        // ==========================================
        const fxUrl = `https://api.fxtwitter.com${pathname}`;
        const fxRes = await fetch(fxUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (fxRes.ok) {
            const json = await fxRes.json();
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

        // If both engines fail to find media
        return res.status(404).json({ ok: false, message: "No media found in this tweet, or the tweet is private." });

    } catch (error) {
        // Now it will tell us EXACTLY what broke
        console.error("Vercel API Error:", error.message);
        return res.status(500).json({ ok: false, message: "Server Error: " + error.message });
    }
};
