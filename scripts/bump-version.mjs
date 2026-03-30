import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const input = process.argv[2];

const usage = 'Usage: npm run bump -- <major|minor|patch|x.y.z>';

const parseVersion = (value) => {
  const match = String(value).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  };
};

const formatVersion = ({ major, minor, patch }) => `${major}.${minor}.${patch}`;

if (!input) {
  console.error(usage);
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;
const currentParts = parseVersion(currentVersion);

if (!currentParts) {
  console.error(`Current package version is not supported: ${currentVersion}`);
  process.exit(1);
}

let nextVersion;
if (input === 'major') {
  nextVersion = formatVersion({ major: currentParts.major + 1, minor: 0, patch: 0 });
} else if (input === 'minor') {
  nextVersion = formatVersion({ major: currentParts.major, minor: currentParts.minor + 1, patch: 0 });
} else if (input === 'patch') {
  nextVersion = formatVersion({ major: currentParts.major, minor: currentParts.minor, patch: currentParts.patch + 1 });
} else {
  const explicitParts = parseVersion(input);
  if (!explicitParts) {
    console.error(`Invalid version target: ${input}`);
    console.error(usage);
    process.exit(1);
  }
  nextVersion = formatVersion(explicitParts);
}

packageJson.version = nextVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

if (fs.existsSync(packageLockPath)) {
  const packageLock = JSON.parse(fs.readFileSync(packageLockPath, 'utf8'));
  packageLock.version = nextVersion;
  if (packageLock.packages && packageLock.packages['']) {
    packageLock.packages[''].version = nextVersion;
  }
  fs.writeFileSync(packageLockPath, `${JSON.stringify(packageLock, null, 2)}\n`);
}

execFileSync(process.execPath, [path.join(projectRoot, 'scripts', 'prepare-assets.mjs')], {
  cwd: projectRoot,
  stdio: 'inherit',
});

console.log(`Version bumped: ${currentVersion} -> ${nextVersion}`);
