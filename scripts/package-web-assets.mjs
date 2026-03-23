import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = path.join(rootDir, 'CSP-Rules-V2.1');
const targetDir = path.join(rootDir, 'public', 'csp');
const bundlePath = path.join(targetDir, 'bundle.json');

const includeEntries = [
  'SudoRules-V20.1-web-config.clp',
  'CSP-Rules-Generic/CSP-Rules-Generic-Web-Loader.clp',
  'SudoRules-V20.1/SudoRules-Web-Loader.clp',
  'CSP-Rules-Generic',
  'SudoRules-V20.1',
  'XTERNS/xterns-generic.clp',
  'XTERNS/xterns-Sudoku.clp',
];

async function removeDir(dirPath) {
  await fs.rm(dirPath, { recursive: true, force: true });
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function collectFiles(sourcePath, files = new Map()) {
  const stat = await fs.stat(sourcePath);

  if (stat.isFile()) {
    if (path.extname(sourcePath).toLowerCase() !== '.clp') {
      return files;
    }

    const relativePath = path.relative(sourceDir, sourcePath).replace(/\\/g, '/');
    const content = await fs.readFile(sourcePath, 'utf8');
    files.set(relativePath, content);
    return files;
  }

  const entries = await fs.readdir(sourcePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      await collectFiles(path.join(sourcePath, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;
    if (path.extname(entry.name).toLowerCase() !== '.clp') continue;

    const absolutePath = path.join(sourcePath, entry.name);
    const relativePath = path.relative(sourceDir, absolutePath).replace(/\\/g, '/');
    const content = await fs.readFile(absolutePath, 'utf8');
    files.set(relativePath, content);
  }

  return files;
}

async function main() {
  await removeDir(targetDir);
  await ensureDir(targetDir);

  const files = new Map();
  for (const entry of includeEntries) {
    await collectFiles(path.join(sourceDir, entry), files);
  }

  const bundle = Object.fromEntries([...files.entries()].sort(([left], [right]) => left.localeCompare(right)));
  await fs.writeFile(bundlePath, JSON.stringify(bundle));
  console.log(`Packaged ${files.size} CLIPS assets to ${bundlePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
