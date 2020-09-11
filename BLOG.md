---
title: On PWA Update Patterns
published: false
description: The year is 2020. Service workers are still rocket science. Humanity still hasn't nailed service worker updates. The search continues.
tags: PWA, progressive web app, open-wc
//cover_image: https://direct_url_to_image.jpg
---

# On PWA Update Patterns

The year is 2020. Service workers are still rocket science. Humanity still hasn't nailed service worker updates. The search continues.

**TL;DR:** [Skip to the code.](https://github.com/thepassle/changelog-update-pattern)


## Nobody's got time for that, skip waiting!

Service worker updates is a subject that is still not well explored yet. Many websites will, much to many users chagrin, reload whenever a new service worker takes control of the page. This pattern is commonly known as the 'skipWaiting pattern', and is excellenty described in [this blog post](https://deanhume.com/displaying-a-new-version-available-progressive-web-app/
) by Dean Hume. It's also _very_ [often](https://stackoverflow.com/questions/61040426/service-worker-update-cache-on-new-version-using-skipwaiting
) [referred](https://stackoverflow.com/questions/58649020/service-worker-update-event-trigger
) [to](https://stackoverflow.com/questions/40446098/service-worker-how-to-build-fresh-version-of-website-for-each-new-deployment
) on your favourite developer forum.

The skipWaiting pattern is fine for most content sites like blogs, or documentation sites, but it can also be frustrating when done wrong; 

![skipwaiting](https://imgur.com/LglX41G.png)

Even if you have minimal state, like a menu that has expandable items, it could happen that a user visits your page, expands a menu item, and BOOM the new service worker takes over, skips waiting, refreshes the page and... The menu item is closed again. Not fun for the user.

![menu](https://imgur.com/IIhFnRX.gif)

Fortunately, we can work around this using the [sessionStorage API](https://developer.mozilla.org/nl/docs/Web/API/Window/sessionStorage). Here's how we approached this on [open-wc.org](https://www.open-wc.org):

```js
  if (sessionStorage.getItem('openItems')) {
    const openItems = JSON.parse(sessionStorage.getItem('openItems'));
    const menuItems = [...document.querySelectorAll('section > p.sidebar-heading')];
    if (openItems.length === menuItems.length) {
      menuItems.forEach((item, i) => {
        if (openItems[i]) {
          item.click();
        }
      });
      sessionStorage.removeItem('openItems');
    }
  }

  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange',
    function() {
      if (refreshing) return;
      refreshing = true;
      const openItems = [...document.querySelectorAll('section > p.sidebar-heading')]
        .map(item => item.classList.contains('open'));
      sessionStorage.setItem('openItems', JSON.stringify(openItems));
      window.location.reload();
    }
  );
```

Let's go through this step-by-step:
- When a new service worker is available, the `controllerchange` event is fired
- But _before_ we reload the page, we check to see if the user has interacted with the menu, and we save it to session storage
- We _then_ reload the page
- On pageload, we check to see if there are any entries in sessionStorage, and if there is; we restore the state.

Now, when a user has had already interacted with the menu _before_ the service worker update, the page reload will still happen, but it will restore the users state, making the reload hardly noticable, and making the user's experience fun instead of frustrating.

### But there's more...

We recently ran into an additional quirk with this pattern. When doing some updates to our website, we noticed that our lighthouse score bugged out on the 'Best Practices' section:

![lighthouse](https://imgur.com/ZyGvFN9.png)

To understand why this happens, we have to take a close look at the client side code for the skipWaiting pattern:

```js
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
```

What happens here is that _any_ time the `controllerchange` event fires, the page will do a reload. This is great when you already have a service worker, and want the new service worker to take over; but it also means that the page will reload when the user has visited for the first time, and consequently cause lighthouse to bug out.

Consider the following scenario:
- A user visits your page for the first time, there is no active and controlling service worker yet
- The service worker will start installing and precaching all your assets
- Since there is no current service worker, the service worker activates, and fires the `controllerchange` event
- The page now does a full reload, that's barely noticeable because all the assets are cached

Granted, the fact that lighthouse errors out on this seems to be a [bug](https://github.com/GoogleChrome/lighthouse/issues/10876#issuecomment-684009675) on the part of Lighthouse, but it also seems a bit odd to do a reload right after the user first visits your page.

Here's how we fixed this problem:

```js
  async function handleUpdate() {
    if ("serviceWorker"in navigator) {
      let refreshing;

      // check to see if there is a current active service worker
      const oldSw = (await navigator.serviceWorker.getRegistration())?.active?.state;

      navigator.serviceWorker.addEventListener('controllerchange', async () => {
        if (refreshing) return;

        // when the controllerchange event has fired, we get the new service worker
        const newSw = (await navigator.serviceWorker.getRegistration())?.active?.state;

        // if there was already an old activated service worker, and a new activating service worker, do the reload
        if(oldSw === 'activated' && newSw === 'activating') {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }

  handleUpdate();
```

Now our lighthouse scores are as we expect them:

![lighthouse2](https://imgur.com/WiyZVpO.png)

And we got rid of the unnecessary reload whenever a user first visits our page.

## An update is available!

Another popular pattern is to show a toast whenever an update is available, as seen down below.


[![update](https://imgur.com/X8wsX7x.png)](https://github.com/pwa-builder/pwa-update)

This pattern is less than desired for several reasons, the first one being... [Nobody seems to really like toasts](https://www.webdesignerdepot.com/2019/07/is-google-toast/), developers _and_ users alike. I mean, who really likes popups jumping up when browsing the web? Can't we do better? Additionally, toasts are hard to get _right_ in terms of accessibility as well.

Perhaps a more subtle implementation of the "update available pattern", as explained by [Jad Joubran](https://twitter.com/JoubranJad) and his talk [Secrets of Native-like PWA's](https://vimeo.com/364366017) (timestamp: 25:49), is to show a **very subtle** indicator that an update is available. This is less likely to catch a user off-guard, and requires no flashy pop-ups yelling at a user's face.

[`pwa-helper-components`](https://www.npmjs.com/package/pwa-helper-components) ships a `addPwaUpdateListener` helper function that executes a callback when an update is available, so you can then easily display a subtle indicator to the user.

![update3](https://i.giphy.com/media/RNJN4am7FiMPywB5nN/giphy.gif)

I went into more detail on this pattern in [my previous blog post](https://dev.to/thepassle/lessons-learned-building-a-covid-19-pwa-57fi), if you're interested in reading more about this.

But the second problem of the "update available" pattern might be even more important; The update is a black box. The user has _no_ idea what they're signing up for when the click on the update button. For all they know, the entire web app could be _completely_ different once they've clicked the update button. Do you like huge, unexpected changes? I know I don't!

Don't you think this is kind of backwards, too? Shouldn't we give the user a good experience, and let them know up front what they're signing up for?



## Changelog update pattern

![changelog](https://imgur.com/247QftR.png)

Instead, why dont we offer full transparancy to our users, and simply show them the changelog? That way, the user will know exactly what kind of updates they're opting into. This pattern is slightly more involved than including a 6 LoC snippet on your page, but we'll walk through it step by step.

Want to jump straight to the code? I dont blame you. You can find the repo on [github](https://github.com/thepassle/changelog-update-pattern).

### Step 1:

Lets start by generating a new project with open-wc:

```bash
npm init @open-wc
```

### Step 2:

In order for this pattern to work, we'll somehow need to maintain the current version number of our PWA on the client side, so the first thing we'll do is create a `version.js` module in our `src/` folder:

`./src/version.js`:
```js
export default 'dev';
```

At build time, we're going to extract the `version` property from our `package.json`, and rewrite `'dev'` to that version number. We'll also want to precache this module, but we'll get to that in a minute.

### Step 3:

Let's implement the logic to rewrite `'dev'` in our `version.js` to the current version number from our `package.json`:

Import the `package.json` in your `rollup.config.js`, and get the path to our `version.js` module:

`rollup.config.js`:
```js
import packageJson from './package.json';
const versionModulePath = require.resolve('./src/version.js');
```

Now, in the `plugins` array of our `rollup.config.js`, we'll add a little bit of logic to rewrite the version number:
```js
{
  name: 'rewrite-version-number',
  load(id) {
    // replace the version module with a live version from the package.json
    if (id === versionModulePath) {
      return `export default '${packageJson.version}'`;
    }
  },
},
```

Whenever rollup will load our `version.js` file, we simply rewrite the contents of the file to `export default '${packageJson.version}'`.

### Step 4:

Next up, we're going to take our `CHANGELOG.md`, and turn it into a JSON file, so we can easily consume it and compare changes on the frontend.

To do this, we'll need to install a dev dependency:
```bash
npm i -D md-2-json
```

And import it in our `rollup.config.js`:
```js
import md2json from 'md-2-json';
```

Again, in your `rollup.config.js`'s `plugins` array, add the following code:

```js
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
```

This will turn out `CHANGELOG.md` into a `CHANGELOG.json`, and looks a little bit like:

```json
{"Changelog":{"1.0.2":{"raw":"- Added the thing\n\n"},"1.0.1":{"raw":"- Fixed bug in keyboard control for dark mode toggle\n- Responsive styling fix\n\n"},"1.0.0":{"raw":"- Initial release\n\n\n"}}}
```

### Step 5:

Great, so far we've found a way to maintain the current version number of our PWA, and turn our `CHANGELOG.md` into something that we can easily consume on the frontend.

Now, we'll need to make some changes to our `workbox` configuration in our `rollup.config.js`.

What we want to do is: set `skipWaiting` and `clientsClaim` to `false`, and add `CHANGELOG.json` to our `globIgnores`. The reason we add the `CHANGELOG.json` to `globIgnores` is because we want to always be able to get the latest changes fresh from the network. We'll also set the `injectServiceWorker` option to `true`. This will automagically add the service worker registration code to your `index.html`.

```js
const baseConfig = createSpaConfig({
  // ...
  workbox: {
    globIgnores: ['./CHANGELOG.json'],
    skipWaiting: false,
    clientsClaim: false,
  },
  injectServiceWorker: true,
  // ...
});
```

### Step 6:

Great! We're done with our build-time changes, so lets implemented the frontend. We're going to install three (very tiny) dependencies for this:

```bash
npm i -S pwa-helper-components @thepassle/generic-components es-semver
```

- **pwa-helper-components**: will give us a `addPwaUpdateListener` function, that fires a callback whenever a new service worker is available
- **generic-components**: will give us an accessible dialog component to show our updates in
- **es-semver**: will give us an ES module version to compare the current apps version number to the entries in the changelog

Let's start by adding the `addPwaUpdateListener`, in your `src/` folder, find your app component and add the following code:

```js
import { LitElement, html, css } from 'lit-element';
import { openWcLogo } from './open-wc-logo.js';
import { addPwaUpdateListener } from 'pwa-helper-components';

export class ChangelogUpdatePattern extends LitElement {
  static get properties() {
    return {
      updateAvailable: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.updateAvailable = false;
  }

  connectedCallback() {
    super.connectedCallback();
    addPwaUpdateListener((updateAvailable) => {
      this.updateAvailable = updateAvailable;
    });
  }

  static get styles() {/** omitted to brevity */}

  render() {
    return html`
      <main>
        <div class="logo">${openWcLogo}</div>
        <h1>My app</h1>

        <p>Welcome to my app!</p>
      </main>

      <p class="app-footer">
        🚽 Made with love by
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/open-wc"
          >open-wc</a
        >.
      </p>
    `;
  }
}
```

As you can see we imported the `addPwaUpdateListener`, and registered it in the `connectedCallback`.

### Step 7:

Great, we'll now be notified whenever a new service worker is available, but we're not really reacting to it yet; time to implement the dialog!

We'll import the dialog from `@thepassle/generic-components`, add some conditional rendering in our `render` method, and add a `openDialog` method to our class. Here's what our code looks like at this point in time:

```js
import { LitElement, html, css } from 'lit-element';
import { render } from 'lit-html';
import { addPwaUpdateListener } from 'pwa-helper-components';
import { dialog } from '@thepassle/generic-components/generic-dialog/dialog.js';
import { openWcLogo } from './open-wc-logo.js';
import './update-dialog.js';

export class ChangelogUpdatePattern extends LitElement {
  static get properties() {
    return {
      updateAvailable: { type: Boolean },
    };
  }

  constructor() {
    super();
    this.updateAvailable = false;
  }

  connectedCallback() {
    super.connectedCallback();
    addPwaUpdateListener((updateAvailable) => {
      this.updateAvailable = updateAvailable;
    });
  }

  static get styles() {/** */}

  openDialog(e) {
    dialog.open({
      invokerNode: e.target,
      content: dialogNode => {
        dialogNode.id = 'dialog';
        render(html`<update-dialog></update-dialog>`, dialogNode);
      },
    });
  }

  render() {
    return html`
      <main>
        ${this.updateAvailable
          ? html`
            <button @click=${this.openDialog} class="update button">
              Hey!
            </button>`
          : ''

        }
        <div class="logo">${openWcLogo}</div>
        <h1>My app</h1>

        <p>Welcome to my app!</p>
      </main>

      <p class="app-footer">
        🚽 Made with love by
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/open-wc"
          >open-wc</a
        >.
      </p>
    `;
  }
}
```

### Step 8:

Still with us? Excellent, you're doing great. Slightly more involved than adding a 6 LoC snippet in your `index.html`, huh? Welp, it's 2020, and service workers are still rocket science.

Now it's time to create a new `update-dialog.js` file in your `src/` folder. This `update-dialog` component will contain the logic and UI to do the diffing between version numbers.

We'll first create 2 utility functions: `getChanged` and `skipWaiting`

- `getChanged`: will fetch the `CHANGELOG.json` fresh from the network, and compile any new updates for us in an array
- `skipWaiting`: will get a reference to the new waiting service worker, and tell it to skip waiting.


```js
async function getChanged(version) {
  const { Changelog } = await (await fetch('./CHANGELOG.json')).json();
  return Object.keys(Changelog)
    .filter(item => satisfies(item, `>${version}`))
    .map(
      item => html`
        <li>
          <h2>${item}</h2>
          <div class="changelog">${Changelog[item].raw}</div>
        </li>
      `
    );
}

async function skipWaiting() {
  const reg = await navigator.serviceWorker.getRegistration();
  reg.waiting.postMessage({ type: 'SKIP_WAITING' });
}
```

And finally, here's what our `update-dialog` component looks like:

```js
import { html, LitElement } from 'lit-element';
import { dialog } from '@thepassle/generic-components/generic-dialog/dialog.js';
import version from './version.js';

class UpdateDialog extends LitElement {
  static get properties() {
    return {
      changed: { type: Array },
    };
  }

  constructor() {
    super();
    this.changed = [];
  }

  createRenderRoot() {
    return this;
  }

  async connectedCallback() {
    super.connectedCallback();
    this.changed = await getChanged(version);
  }

  render() {
    return html`
      <button @click=${() => dialog.close()} class="close button">
        x
      </button>
      <h1>There's an update available!</h1>
      <p>Here's what's changed:</p>
      <ul>
        ${this.changed}
      </ul>
      <div class="dialog-buttons">
        <button class="button" @click=${skipWaiting}>Install update</button>
        <button class="button" @click=${() => dialog.close()}>Close</button>
      </div>
    `;
  }
}

customElements.define('update-dialog', UpdateDialog);
```

### Step 9 (optional):

The downside of this pattern is that, well, it's not very straightforward to implement, and for every change you make, you'll need to adjust your `CHANGELOG.md` and `package.json` accordingly.

In hopes to make this a bit easier for you, I created a Github Action that for each pull request will check if you've changed your `CHANGELOG.md` and `package.json`. You can use it by creating a `.github/workflows/` directory, and adding the following workflow:

`package-json-changelog-enforcer.yml`:
```yml
name: package-json-changelog-enforcer

on: [pull_request]

jobs:
  package-json-changelog-enforcer:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
        with:
          fetch-depth: '0'
      - uses: thepassle/package-json-enforcer@0.0.10
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}

```

## Conclusion

And that's it. If you followed along step-by-step, you're a champ. If you didn't, and skipped through to the Github repo; again, I don't blame you.

I'd like to conclude this blogpost the same way I started it: The year is 2020. Service workers are still rocket science. Humanity still hasn't nailed service worker updates. The search continues.
