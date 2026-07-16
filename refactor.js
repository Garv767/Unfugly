const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('webapp/src', (filePath) => {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.js')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We look for fetch(..., { ... credentials: 'include' ... })
    // and replace or append headers: { Authorization: ... }
    
    // First, in login/page.tsx, save the token
    if (filePath.includes('login') && filePath.includes('page.tsx')) {
        content = content.replace(
            /const data = await res\.json\(\);\s*if \(\!res\.ok\) throw new Error\(data\.error \|\| 'Login failed'\);/g,
            "const data = await res.json();\n      if (!res.ok) throw new Error(data.error || 'Login failed');\n      if (data.token) localStorage.setItem('unfugly_token', data.token);"
        );
    }

    // In dashboard/page.tsx, handle logout
    if (filePath.includes('dashboard') && filePath.includes('page.tsx')) {
        content = content.replace(
            /await fetch\(\$\{API_URL\}\/api\/v1\/auth\/logout, \{ method: 'POST', credentials: 'include' \}\)\.catch\(\(\) => \{\}\);/g,
            "await fetch(${API_URL}/api/v1/auth/logout, { method: 'POST', credentials: 'include' }).catch(() => {});\n    localStorage.removeItem('unfugly_token');"
        );
    }

    // In BottomNav.tsx, handle logout
    if (filePath.includes('BottomNav.tsx')) {
        content = content.replace(
            /await fetch\(\$\{API_URL\}\/api\/v1\/auth\/logout, \{ method: 'POST', credentials: 'include' \}\);/g,
            "await fetch(${API_URL}/api/v1/auth/logout, { method: 'POST', credentials: 'include' });\n      localStorage.removeItem('unfugly_token');"
        );
    }

    // Now, replace fetch(..., { ... }) to include headers
    // It's safer to use a regex that matches etch(${API_URL} and injects a helper, OR just write a global helper
    // Since we don't want to break existing headers, let's just do a simple replacement for the most common patterns.
    
    // Replace: { credentials: 'include' } 
    // With: { credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } }
    
    content = content.replace(
        /\{\s*credentials:\s*'include'\s*\}/g,
        "{ credentials: 'include', headers: { ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) } }"
    );

    // For POST/PUT requests that already have headers:
    // headers: { 'Content-Type': 'application/json' }
    content = content.replace(
        /headers:\s*\{\s*'Content-Type':\s*'application\/json'\s*\}/g,
        "headers: { 'Content-Type': 'application/json', ...((typeof window !== 'undefined' && localStorage.getItem('unfugly_token')) ? { Authorization: 'Bearer ' + localStorage.getItem('unfugly_token') } : {}) }"
    );

    if (original !== content) {
        fs.writeFileSync(filePath, content);
        console.log('Updated', filePath);
    }
});
