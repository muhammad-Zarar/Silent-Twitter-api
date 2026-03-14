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
        // 3. The vxTwitter Bypass Hack
        const apiUrl = url.replace(/(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)/, 'https://api.vxtwitter.com');

        // 4. Use Native Fetch (No Axios needed!)
        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            return res.status(404).json({ ok: false, message: "Tweet not found or private." });
        }

        const data = await response.json();

        // 5. Check if tweet has media
        if (!data.hasMedia || !data.mediaURLs || data.mediaURLs.length === 0) {
            return res.status(404).json({ ok: false, message: "No video or image found in this tweet." });
        }

        // 6. Return clean data
        return res.status(200).json({
            ok: true,
            author: data.user_name,
            handle: `@${data.user_screen_name}`,
            caption: data.text,
            likes: data.likes,
            retweets: data.retweets,
            mediaType: data.media_extended[0].type, 
            downloadUrls: data.mediaURLs
        });

    } catch (error) {
        console.error("Vercel API Error:", error.message);
        return res.status(500).json({ ok: false, message: "Failed to bypass Twitter security or Tweet is private." });
    }
};
