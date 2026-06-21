const fs = require('fs');

const logPath = 'C:/Users/DELL/.gemini/antigravity-ide/brain/cfd6a155-78db-4b30-a506-a6a23d0cf185/.system_generated/logs/transcript.jsonl';
const logData = fs.readFileSync(logPath, 'utf8');

const lines = logData.split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
        const step = JSON.parse(lines[i]);
        if (step.content && step.content.includes('File Path: `file:///c:/Users/DELL/Cooking/Unfugly/webapp/src/app/dashboard/page.tsx`') && step.content.includes('Total Lines:')) {
            // Check if it shows from line 1
            if (step.content.includes('Showing lines 1 to')) {
                console.log("Found view_file at index", i);
                const extractedLines = [];
                const linesOfContent = step.content.split('\n');
                let capturing = false;
                for (const line of linesOfContent) {
                    if (line.includes('The following code has been modified to include a line number')) {
                        capturing = true;
                        continue;
                    }
                    if (line.includes('The above content does NOT show the entire file contents') || line.includes('The above content shows the entire, complete file contents')) {
                        capturing = false;
                    }
                    if (capturing) {
                        const match = line.match(/^(\d+):\s(.*)$/);
                        if (match) {
                            extractedLines.push(match[2]);
                        } else if (line.trim() === '') {
                            // Empty lines are empty lines
                        }
                    }
                }
                if (extractedLines.length > 0) {
                    fs.writeFileSync('src/app/dashboard/page.tsx', extractedLines.join('\n'), 'utf8');
                    console.log("RESTORED " + extractedLines.length + " lines");
                    process.exit(0);
                }
            }
        }
    } catch(e) {}
}

console.log("Could not find suitable view_file");
