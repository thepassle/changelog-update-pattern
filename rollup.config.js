import merge from 'deepmerge';
import { createSpaConfig } from '@open-wc/building-rollup';
import md2json from 'md-2-json';
import fs from 'fs';
import packageJson from './package.json';

const versionModulePath = require.resolve('./src/version.js');

const baseConfig = createSpaConfig({
  workbox: {
    globIgnores: ['./CHANGELOG.json'],
    skipWaiting: false,
    clientsClaim: false,
  },
  developmentMode: process.env.ROLLUP_WATCH === 'true',
  injectServiceWorker: true,
});

export default merge(baseConfig, {
  input: './index.html',
  plugins: [
    {
      name: 'rewrite-version',
      load(id) {
        // eslint-disable-line
        // replace the version module with a live version from the package.json
        if (id === versionModulePath) {
          return `export default '${packageJson.version}'`;
        }
      },
    },
    {
      name: 'generate-changelog-json',
      writeBundle() {
        const changelog = fs.readFileSync('./CHANGELOG.md', 'utf8');
        fs.writeFileSync(
          './dist/CHANGELOG.json',
          JSON.stringify(md2json.parse(changelog))
        );
      },
    },
  ]
});