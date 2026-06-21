const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'unfugly-backend', 'routes', 'v1', 'auth.js');
let content = fs.readFileSync(filePath, 'utf8');

const newEndpoint = `
// POST /api/v1/auth/login-cookie
router.post('/login-cookie', async (req, res) => {
    const { net_id, raw_cookies } = req.body;
    if (!net_id || !raw_cookies) return res.status(400).json({ error: 'Missing net_id or cookies' });

    try {
        const cookies = [];
        const lines = raw_cookies.split('\\n');
        for (const line of lines) {
            const parts = line.split('\\t');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const value = parts[1].trim();
                let domain = parts[2] ? parts[2].trim() : '.srmist.edu.in';
                const path = parts[3] ? parts[3].trim() : '/';
                if (name && value) {
                    // Ensure Playwright format accepts it
                    if (domain === 'academia.srmist.edu.in') domain = '.academia.srmist.edu.in';
                    cookies.push({ name, value, domain, path });
                }
            }
        }

        if (cookies.length === 0) {
            return res.status(400).json({ error: 'Failed to parse cookies. Ensure they are in TSV format.' });
        }

        // Upsert the cookies into the user's log
        const { error } = await supabase.from('user_logs').upsert({
            user_net_id: net_id.toLowerCase(),
            academia_cookies: cookies,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_net_id' });

        if (error) throw error;

        // Give them a token
        const token = jwt.sign({ net_id: net_id.toLowerCase() }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, net_id: net_id.toLowerCase(), message: 'Cookie session imported' });
    } catch (err) {
        console.error(\`[v1] Login Cookie Error [\${net_id}]:\`, err.message);
        res.status(500).json({ error: err.message || 'Failed to import session' });
    }
});

// POST /api/v1/auth/logout
`;

content = content.replace('// POST /api/v1/auth/logout\n', newEndpoint);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Added login-cookie route');
