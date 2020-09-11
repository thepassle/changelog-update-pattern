import { html, LitElement } from 'lit-element';
import { dialog } from '@thepassle/generic-components/generic-dialog/dialog.js';
import { satisfies } from 'es-semver';
import version from './version.js';

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
