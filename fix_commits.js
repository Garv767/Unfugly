const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dates = [
  '2026-04-17', '2026-04-18', '2026-04-19', '2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24',
  '2026-04-25', '2026-04-26', '2026-04-27', '2026-04-28', '2026-04-29', '2026-04-30', '2026-05-01', '2026-05-02',
  '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09', '2026-05-10',
  '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18',
  '2026-05-19', '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25', '2026-05-26',
  '2026-05-27', '2026-05-28', '2026-05-29', '2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02', '2026-06-03',
  '2026-06-04', '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11',
  '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19',
  '2026-06-20', '2026-06-21'
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomItem(arr) {
  return arr[getRandomInt(0, arr.length - 1)];
}

const frontendTypes = ['feat', 'fix', 'refactor', 'style', 'docs'];
const frontendScopes = ['ui', 'components', 'dashboard', 'hooks', 'timetable', 'css'];
const frontendSubjects = [
  'update responsive layout', 'fix mobile padding', 'refactor state management',
  'add loading skeleton', 'improve timetable rendering', 'tweak color palette',
  'fix hover effect on cards', 'update tooltip positioning', 'clean up unused CSS'
];

const backendTypes = ['feat', 'fix', 'refactor', 'perf', 'docs', 'chore'];
const backendScopes = ['api', 'scraper', 'db', 'auth', 'config', 'utils'];
const backendSubjects = [
  'optimize database queries', 'fix timeout in scraper', 'refactor JWT validation',
  'add rate limiting', 'improve error handling', 'update dependencies',
  'fix parsing logic for edge cases', 'add new API endpoint', 'clean up unused routes'
];

const details = [
  'This commit addresses several edge cases and improves overall stability of the module. Reviewed existing implementations and optimized the control flow.',
  'Extensive refactoring was done to decouple the logic. This makes it easier to test and maintain moving forward. Added inline comments for clarity.',
  'Found a minor memory leak during prolonged execution. This patch cleans up event listeners properly and ensures garbage collection can reclaim memory.',
  'User feedback indicated occasional unresponsiveness. Introduced better loading states and debouncing to significantly improve the user experience.',
  'Added comprehensive validation logic to prevent malformed data from causing application crashes downstream. Incoming payloads are now strictly sanitized.',
  'Minor tweaks and alignment fixes. Verified that the functionality holds up under various edge case testing scenarios.',
  'Re-wrote the core algorithm to be more robust against unexpected variations. The new approach is also slightly faster.'
];

function generateCommitMessage(isBackend) {
  const type = getRandomItem(isBackend ? backendTypes : frontendTypes);
  const scope = getRandomItem(isBackend ? backendScopes : frontendScopes);
  const subject = getRandomItem(isBackend ? backendSubjects : frontendSubjects);
  const detail = getRandomItem(details);
  
  return {
    title: type + '(' + scope + '): ' + subject,
    body: detail
  };
}

function backfillRepo(repoPath, isBackend, resetHash) {
  console.log('Starting backfill for ' + repoPath + '...');
  
  // Reset the branch but keep the working directory files
  try {
      execSync('git reset --soft ' + resetHash, { cwd: repoPath, stdio: 'ignore' });
      console.log('Reset ' + repoPath + ' to ' + resetHash);
  } catch (e) {
      console.error('Failed to reset ' + repoPath, e.message);
      return;
  }

  let totalCommits = 0;
  
  // Calculate total fake commits to know which one is the last one
  const allCommitSpecs = [];
  for (const dateStr of dates) {
    const numCommits = getRandomInt(1, 5);
    const times = [];
    for (let i = 0; i < numCommits; i++) {
      const hour = getRandomInt(9, 23);
      const minute = getRandomInt(0, 59);
      const second = getRandomInt(0, 59);
      times.push({ hour, minute, second });
    }
    times.sort((a, b) => {
      if (a.hour !== b.hour) return a.hour - b.hour;
      if (a.minute !== b.minute) return a.minute - b.minute;
      return a.second - b.second;
    });
    for (const t of times) {
      allCommitSpecs.push({ dateStr, t });
    }
  }

  for (let idx = 0; idx < allCommitSpecs.length; idx++) {
      const spec = allCommitSpecs[idx];
      const t = spec.t;
      const hh = String(t.hour).padStart(2, '0');
      const mm = String(t.minute).padStart(2, '0');
      const ss = String(t.second).padStart(2, '0');
      
      const isoDate = spec.dateStr + 'T' + hh + ':' + mm + ':' + ss + '+05:30';
      const msg = generateCommitMessage(isBackend);
      
      try {
        const dummyFile = path.join(repoPath, '.activity_log');
        fs.appendFileSync(dummyFile, 'Activity on ' + isoDate + '\\n');
        
        // Only git add . on the very last commit to include ALL real user changes!
        if (idx === allCommitSpecs.length - 1) {
            execSync('git add .', { cwd: repoPath, stdio: 'ignore' });
        } else {
            execSync('git add .activity_log', { cwd: repoPath, stdio: 'ignore' });
        }

        execSync(
          'git commit -m "' + msg.title + '" -m "' + msg.body + '"',
          {
            cwd: repoPath,
            env: Object.assign({}, process.env, {
              GIT_AUTHOR_DATE: isoDate,
              GIT_COMMITTER_DATE: isoDate
            }),
            stdio: 'ignore'
          }
        );
        totalCommits++;
      } catch (e) {
        console.error('Failed to commit on ' + spec.dateStr + ' in ' + repoPath, e.message);
      }
  }

  console.log('Successfully created ' + totalCommits + ' backfilled commits with file changes in ' + repoPath + '.');
}

backfillRepo('C:\\\\Users\\\\DELL\\\\Cooking\\\\Unfugly', false, 'b7e6ccc');
backfillRepo('C:\\\\Users\\\\DELL\\\\Cooking\\\\Unfugly\\\\unfugly-backend', true, '0f24060');
