import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const stripVersionQueryPlugin = {
  name: 'strip-version-query',
  setup(build) {
    build.onResolve({ filter: /\?v=[^?]+$/ }, (args) => {
      const cleanedPath = args.path.replace(/\?v=[^?]+$/, '');
      return {
        path: path.resolve(args.resolveDir, cleanedPath),
      };
    });
  },
};

const buildConfig = {
  absWorkingDir: projectRoot,
  bundle: true,
  target: ['es2020'],
  minify: true,
  logLevel: 'info',
};

await esbuild.build({
  ...buildConfig,
  entryPoints: ['js/vendor.entry.js'],
  outfile: 'js/dist/vendor.bundle.js',
  format: 'iife',
});

await esbuild.build({
  ...buildConfig,
  entryPoints: ['js/bundle.entry.js'],
  outfile: 'js/dist/app.bundle.js',
  format: 'iife',
  plugins: [stripVersionQueryPlugin],
});
