const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const t2 = \`      <main className="flex-1 p-6 overflow-y-auto w-full relative custom-scrollbar">\`;
const r2 = \`      <main className="flex-1 px-4 lg:px-6 h-[calc(100vh-64px)] lg:h-[calc(100vh-2rem)] overflow-y-auto w-full relative custom-scrollbar pb-24 lg:pb-0 pt-4 lg:pt-0">\`;

const t3 = \`            <div className="flex items-center gap-4">\`;
const r3 = \`            <div className="flex items-center gap-4 ml-auto lg:ml-0">\`;

const t4 = \`<div className="flex items-center justify-between mb-8">\`;
const r4 = \`<div className="flex items-center justify-between mb-4 lg:mb-8 bg-[#1a1a1a] lg:bg-transparent -mx-4 px-4 py-3 lg:mx-0 lg:p-0 sticky top-0 z-40 border-b border-[#333] lg:border-none">\`;

const t5 = \`<h1 className="text-3xl font-bold">Dashboard</h1>\`;
const r5 = \`<h1 className="text-xl lg:text-3xl font-bold">Dashboard</h1>\`;

if (content.includes(t2)) content = content.replace(t2, r2);
if (content.includes(t3)) content = content.replace(t3, r3);
if (content.includes(t4)) content = content.replace(t4, r4);
if (content.includes(t5)) content = content.replace(t5, r5);

fs.writeFileSync(path, content, 'utf8');
console.log("SUCCESS top layout");
