import { execSync } from 'node:child_process';

function commandExists(command) {
    try {
        execSync(`${command} --version`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

if (!commandExists('pre-commit')) {
    console.warn(
        '\n[postinstall] pre-commit is not installed, so git hooks (lint/typecheck/build on commit) are NOT active.\n' +
            '  Install it with: pipx install pre-commit  (or: pip install pre-commit)\n' +
            '  Then run: pre-commit install\n',
    );
    process.exit(0);
}

try {
    execSync('pre-commit install', { stdio: 'inherit' });
} catch {
    console.warn('[postinstall] Failed to run "pre-commit install" — run it manually.');
}
