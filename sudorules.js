const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const os = require('os');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const ROOT_DIR = __dirname;
const SOLVER_DIR = path.join(ROOT_DIR, 'CSP-Rules-V2.1');
const CLIPS_EXE = path.join(SOLVER_DIR, 'CLIPS', 'clip-63.exe');

function normalizePuzzle(input) {
    const normalized = String(input || '')
        .replace(/[|+\-!]/g, '')
        .replace(/\s+/g, '')
        .replace(/0/g, '.');

    if (!/^[1-9.]{81}$/.test(normalized)) {
        throw new Error('Puzzle must contain exactly 81 cells using digits 1-9 and "." or "0" for empty cells.');
    }

    return normalized;
}

function parseSolvedGrid(output) {
    const lines = output.split(/\r?\n/);
    const gridLines = [];

    for (const line of lines) {
        if (!line.includes('!')) continue;
        const digits = line.replace(/[^1-9]/g, '');
        if (digits.length === 9) {
            gridLines.push(digits);
        }
    }

    return gridLines.length >= 9 ? gridLines.slice(-9) : null;
}

function parseRulesUsed(output) {
    const lines = output.split(/\r?\n/);
    const rules = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('Entering_level_')) continue;
        if (trimmed.startsWith('Resolution state')) continue;
        if (trimmed.startsWith('Starting non trivial part of solution.')) continue;
        if (trimmed.startsWith('PUZZLE ')) continue;
        if (trimmed.startsWith('nb-facts =')) continue;
        if (trimmed.startsWith('Puzzle ')) continue;
        if (trimmed.startsWith('init-time =')) continue;
        if (trimmed.startsWith('CLIPS>')) continue;
        if (trimmed.startsWith('***')) continue;

        const isRuleLine =
            trimmed.includes('==>') ||
            trimmed.startsWith('hidden-single') ||
            trimmed.startsWith('naked-single') ||
            trimmed.startsWith('naked-pairs') ||
            trimmed.startsWith('hidden-pairs') ||
            trimmed.startsWith('x-wing') ||
            trimmed.startsWith('finned-') ||
            trimmed.startsWith('biv-chain') ||
            trimmed.startsWith('z-chain') ||
            trimmed.startsWith('t-whip') ||
            trimmed.startsWith('whip[');

        if (isRuleLine) {
            rules.push(trimmed);
        }
    }

    return rules;
}

async function runSolver(input) {
    const puzzle = normalizePuzzle(input);

    if (!fs.existsSync(CLIPS_EXE)) {
        throw new Error(`CLIPS executable not found: ${CLIPS_EXE}`);
    }

    const commandFile = path.join(os.tmpdir(), `sudorules-${process.pid}-${Date.now()}.clp`);
    const command = [
        '(batch "SudoRules-V20.1-config.clp")',
        `(solve "${puzzle}")`,
        '(exit)',
        '',
    ].join('\n');

    await fsp.writeFile(commandFile, command, 'utf8');

    try {
        const { stdout, stderr } = await execFileAsync(CLIPS_EXE, ['-f', commandFile], {
            cwd: SOLVER_DIR,
            maxBuffer: 16 * 1024 * 1024,
            windowsHide: true,
        });

        const rawOutput = `${stdout}${stderr ? `\n${stderr}` : ''}`;

        return {
            puzzle,
            solvedGrid: parseSolvedGrid(rawOutput),
            rulesUsed: parseRulesUsed(rawOutput),
            rawOutput,
        };
    } finally {
        await fsp.unlink(commandFile).catch(() => {});
    }
}

module.exports = {
    runSolver,
    normalizePuzzle,
    parseSolvedGrid,
    parseRulesUsed,
};
