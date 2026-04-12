const http = require('http');
http.get('http://localhost:3005/dashboard', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // try to find the error in script tags
    const match = data.match(/"message":"(.*?)"/g);
    if (match) {
       console.log(match.slice(0, 5));
    }
    const stack = data.match(/"stack":"(.*?)"/);
    if (stack) console.log(stack[1].replace(/\\n/g, '\n'));
  });
});
