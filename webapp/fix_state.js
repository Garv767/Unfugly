const fs = require('fs');
const path = 'src/app/dashboard/page.tsx';
let content = fs.readFileSync(path, 'utf8');

if (!content.includes("const [activeTab, setActiveTab] = useState('Timetable');")) {
    const target = 'const router = useRouter();';
    const replacement = `const router = useRouter();
  const [activeTab, setActiveTab] = useState('Timetable');`;
    content = content.replace(target, replacement);
    fs.writeFileSync(path, content, 'utf8');
}
console.log("FIXED STATE");
