const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'webapp', 'src', 'app', 'dashboard', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add state for the cookie modal
const stateRegex = /const \[isBgScraping, setIsBgScraping\] = useState\(false\);/;
const stateReplacement = `const [isBgScraping, setIsBgScraping] = useState(false);
  const [showCookieModal, setShowCookieModal] = useState(false);
  const [cookieTsv, setCookieTsv] = useState('');
  const [cookieLoading, setCookieLoading] = useState(false);`;
content = content.replace(stateRegex, stateReplacement);

// 2. Add handleCookieSubmit function
const fetchRegex = /useEffect\(\(\) => \{\n    const fetchDashboardData = async \(\) => \{/;
const handleCookieFn = `
  const handleCookieSubmit = async () => {
    setCookieLoading(true);
    try {
        const net_id = localStorage.getItem('unfugly_net_id') || 'gr2383';
        const res = await fetch('http://localhost:3000/api/v1/auth/login-cookie', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ net_id, raw_cookies: cookieTsv })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to import cookie session');
        
        // Success
        setShowCookieModal(false);
        setCookieTsv('');
        window.location.reload(); // Reload to trigger the scrape again
    } catch (err: any) {
        alert(err.message);
    } finally {
        setCookieLoading(false);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {`;
content = content.replace(fetchRegex, handleCookieFn);

// 3. Add the modal and button to the loading UI
const loadingRegex = /if \(loading\) \{\n    return \(\n      <div className="min-h-screen bg-\[#1F1F2E\] flex flex-col items-center justify-center space-y-4">\n        <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"><\/div>\n        <p className="text-xl font-medium text-accent2 animate-pulse">\{progressMsg\}<\/p>\n        <p className="text-sm text-muted">This usually takes 15-30 seconds depending on Academia speeds\.<\/p>\n      <\/div>\n    \);\n  \}/;

const loadingReplacement = `if (loading) {
    return (
      <div className="min-h-screen bg-[#1F1F2E] flex flex-col items-center justify-center space-y-4 p-4">
        {showCookieModal ? (
            <div className="bg-[#363636] p-6 rounded-lg shadow-2xl max-w-lg w-full border border-[#444] z-50">
                <h3 className="text-xl font-bold text-white mb-2">Import Academia Session</h3>
                <p className="text-sm text-gray-400 mb-4">
                    Paste the raw TSV cookies copied from Chrome DevTools (Application &gt; Cookies &gt; academia.srmist.edu.in).
                </p>
                <textarea 
                    className="w-full h-32 bg-[#2a2a2a] border border-[#555] rounded p-3 text-xs text-gray-300 font-mono mb-4 focus:outline-none focus:border-accent"
                    placeholder="_iamadt_client...	46b531...	.academia.srmist.edu.in..."
                    value={cookieTsv}
                    onChange={(e) => setCookieTsv(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                    <button 
                        className="px-4 py-2 rounded text-sm text-gray-300 hover:bg-[#444] transition"
                        onClick={() => setShowCookieModal(false)}
                        disabled={cookieLoading}
                    >
                        Cancel
                    </button>
                    <button 
                        className="px-4 py-2 bg-accent hover:bg-accent/80 text-black font-bold rounded text-sm transition"
                        onClick={handleCookieSubmit}
                        disabled={cookieLoading || !cookieTsv}
                    >
                        {cookieLoading ? 'Importing...' : 'Import & Retry'}
                    </button>
                </div>
            </div>
        ) : (
            <>
                <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xl font-medium text-accent2 animate-pulse">{progressMsg}</p>
                <p className="text-sm text-muted">This usually takes 15-30 seconds depending on Academia speeds.</p>
                
                <button 
                    onClick={() => setShowCookieModal(true)}
                    className="mt-8 px-4 py-2 bg-[#333] border border-[#444] hover:bg-[#444] text-xs text-gray-300 rounded transition"
                >
                    Rate limited? Import Session Cookie
                </button>
            </>
        )}
      </div>
    );
  }`;
content = content.replace(loadingRegex, loadingReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Modified loading screen');
