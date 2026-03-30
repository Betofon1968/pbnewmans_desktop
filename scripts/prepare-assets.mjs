import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const appVersion = String(packageJson.version || '').replace(/\.0$/, '');
const buildDate = process.env.APP_BUILD_DATE || new Date().toISOString().slice(0, 10);

const replaceVersionToken = (value) => value.replace(/__APP_VERSION__/g, appVersion);

const writeGeneratedFile = (relativePath, contents) => {
  const filePath = path.join(projectRoot, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
};

writeGeneratedFile(
  'index.html',
  replaceVersionToken(fs.readFileSync(path.join(projectRoot, 'index.template.html'), 'utf8'))
);

writeGeneratedFile(
  'service-worker.js',
  replaceVersionToken(fs.readFileSync(path.join(projectRoot, 'service-worker.template.js'), 'utf8'))
);

writeGeneratedFile(
  'js/generated/buildInfo.js',
  [
    `export const APP_VERSION = ${JSON.stringify(appVersion)};`,
    `export const APP_BUILD_DATE = ${JSON.stringify(buildDate)};`,
    '',
  ].join('\n')
);
