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

  static get styles() {
    return css`
      :host {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        font-size: calc(10px + 2vmin);
        color: #1a2b42;
        max-width: 960px;
        margin: 0 auto;
        text-align: center;
      }

      main {
        flex-grow: 1;
      }

      .logo > svg {
        margin-top: 36px;
        animation: app-logo-spin infinite 20s linear;
      }

      @keyframes app-logo-spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .app-footer {
        font-size: calc(12px + 0.5vmin);
        align-items: center;
      }

      .app-footer a {
        margin-left: 5px;
      }
    `;
  }

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
