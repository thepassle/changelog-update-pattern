<p align="center">
  <img width="200" src="https://open-wc.org/hero.png"></img>
</p>

## Changelog-update-pattern boilerplate app

[![Built with open-wc recommendations](https://img.shields.io/badge/built%20with-open--wc-blue.svg)](https://github.com/open-wc)

## [Read the blog](https://dev.to/thepassle/on-pwa-update-patterns-4fgm), [visit demo](https://thirsty-leakey-0d6e69.netlify.app/)

## Quickstart

To get started:

```bash
npm install
npm start
```

## Testing your service worker update

- Run `npm run build`
- Visit your app in the browser, make sure the service worker has installed

- Go back to your code editor, make some changes in the code
- Add a changelog entry
- Update the package.json version number
- Run `npm run build`

- You should now see the update appear

## Scripts

- `start` runs your app for development, reloading on file changes
- `start:build` runs your app after it has been built using the build command
- `build` builds your app and outputs it in your `dist` directory
- `test` runs your test suite with Karma
- `lint` runs the linter for your project

## Tooling configs

For most of the tools, the configuration is in the `package.json` to reduce the amount of files in your project.

If you customize the configuration a lot, you can consider moving them to individual files.