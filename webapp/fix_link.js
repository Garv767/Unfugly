const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("import Link from 'next/link';")) {
    content = content.replace("import { useEffect, useState, useRef } from 'react';", "import { useEffect, useState, useRef } from 'react';\nimport Link from 'next/link';");
    fs.writeFileSync(path, content, 'utf8');
}
console.log("FIXED LINK");
