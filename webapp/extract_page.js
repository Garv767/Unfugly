const fs = require('fs');

const logPath = 'C:/Users/DELL/.gemini/antigravity-ide/brain/cfd6a155-78db-4b30-a506-a6a23d0cf185/.system_generated/logs/transcript.jsonl';
const logData = fs.readFileSync(logPath, 'utf8');

const lines = logData.split('\n');
let pageTsxContent = '';

for (let i = lines.length - 1; i >= 0; i--) {
    if (!lines[i]) continue;
    try {
        const step = JSON.parse(lines[i]);
        if (step.tool_calls) {
            for (const call of step.tool_calls) {
                if (call.name === 'default_api:write_to_file' || call.name === 'default_api:replace_file_content' || call.name === 'default_api:multi_replace_file_content') {
                    // This is not the full file.
                }
            }
        }
        
        // Let's look for a view_file output that contains the full file!
        if (step.content && step.content.includes('File Path: `file:///c:/Users/DELL/Cooking/Unfugly/webapp/src/app/dashboard/page.tsx`') && step.content.includes('The above content shows the entire, complete file contents')) {
            pageTsxContent = step.content;
            break;
        }
    } catch(e) {}
}

if (pageTsxContent) {
    // Extract the lines from the view_file output
    const extractedLines = [];
    const linesOfContent = pageTsxContent.split('\n');
    let capturing = false;
    for (const line of linesOfContent) {
        if (line.includes('The following code has been modified to include a line number')) {
            capturing = true;
            continue;
        }
        if (line.includes('The above content shows the entire')) {
            capturing = false;
        }
        if (capturing) {
            // strip the line number
            const match = line.match(/^\d+:\s(.*)$/);
            if (match) {
                extractedLines.push(match[1]);
            } else if (line.trim() === '') {
                extractedLines.push('');
            }
        }
    }
    
    if (extractedLines.length > 0) {
        fs.writeFileSync('src/app/dashboard/page.tsx', extractedLines.join('\n'), 'utf8');
        console.log("RESTORED FULL PAGE.TSX FROM LOGS!");
    } else {
        console.log("Found view_file output but could not extract lines");
    }
} else {
    console.log("Could not find full view_file output for page.tsx in transcript");
}
