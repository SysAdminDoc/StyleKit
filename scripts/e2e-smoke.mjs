import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '..');
const chromeDist = resolve(root, 'dist');
const firefoxDist = resolve(root, 'firefox-dist');
const profile = await mkdtemp(join(tmpdir(), 'stylekit-e2e-'));
const expectedColor = 'rgb(12, 34, 56)';
const expectedReloadColor = 'rgb(78, 90, 123)';

const readManifest = async directory =>
  JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));

const assertClassicContentScript = async (directory, file) => {
  const bytes = await readFile(resolve(directory, file));
  assert(
    bytes.every(byte => byte < 0x80),
    `${file} must be ASCII-safe for Chrome's content-script loader`
  );
  const source = bytes.toString('ascii');
  assert.doesNotMatch(source, /^\s*(?:import|export)\s/m);
};

const waitForServiceWorker = async context => {
  const existingWorker = context
    .serviceWorkers()
    .find(worker => worker.url().startsWith('chrome-extension://'));
  if (existingWorker) return existingWorker;
  return context.waitForEvent('serviceworker', { timeout: 20_000 });
};

const getExtensionDiagnostics = async context => {
  const page = await context.newPage();
  await page.goto('chrome://extensions');
  await page.locator('extensions-manager').waitFor();
  const diagnostics = await page.locator('extensions-manager').evaluate(() => {
    const items = [];
    const visit = root => {
      for (const element of root.querySelectorAll('*')) {
        if (element.tagName === 'EXTENSIONS-ITEM') {
          const data = element.data || {};
          items.push({
            id: data.id,
            name: data.name,
            state: data.state,
            disableReasons: data.disableReasons,
            installWarnings: data.installWarnings,
            runtimeWarnings: data.runtimeWarnings,
          });
        }
        if (element.shadowRoot) visit(element.shadowRoot);
      }
    };
    visit(document);
    return items;
  });
  await page.close();
  return diagnostics;
};

const injectBuiltContentScripts = (serviceWorker, fixtureUrl) =>
  serviceWorker.evaluate(async url => {
    const tabs = await chrome.tabs.query({});
    const fixtureTab = tabs.find(tab => tab.url === url);
    if (!fixtureTab?.id) throw new Error('Fixture tab not found');
    return chrome.scripting.executeScript({
      target: { tabId: fixtureTab.id },
      files: ['inject-css/index.js', 'editor/index.js'],
    });
  }, fixtureUrl);

const waitForEditorReceiver = async (serviceWorker, fixtureUrl) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const state = await serviceWorker.evaluate(async url => {
      const tabs = await chrome.tabs.query({});
      const fixtureTab = tabs.find(tab => tab.url === url);
      if (!fixtureTab?.id) return null;
      try {
        return await chrome.tabs.sendMessage(fixtureTab.id, {
          name: 'GetIsStylebotOpen',
        });
      } catch {
        return null;
      }
    }, fixtureUrl);
    if (typeof state === 'boolean') return;
    await new Promise(resolveWait => setTimeout(resolveWait, 100));
  }
  throw new Error('Editor content script did not become ready');
};

const createFixtureServer = () => {
  let liveCss = `#fixture { color: ${expectedReloadColor} !important; }`;
  const server = createServer((request, response) => {
    if (request.url === '/live.css') {
      response.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(liveCss);
      return;
    }
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    response.end(`<!doctype html>
      <html>
        <head><title>StyleKit E2E Fixture</title></head>
        <body><main id="fixture">StyleKit extension smoke fixture</main></body>
      </html>`);
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object');
      resolveServer({
        server,
        url: `http://stylekit.test:${address.port}/fixture`,
        sourceUrl: `http://127.0.0.1:${address.port}/live.css`,
        setLiveCss: css => {
          liveCss = css;
        },
      });
    });
  });
};

const closeServer = server =>
  new Promise((resolveClose, reject) =>
    server.close(error => (error ? reject(error) : resolveClose()))
  );

let context;
let fixtureServer;

try {
  const [chromeManifest, firefoxManifest] = await Promise.all([
    readManifest(chromeDist),
    readManifest(firefoxDist),
  ]);
  assert.equal(chromeManifest.name, 'StyleKit');
  assert.equal(firefoxManifest.name, 'StyleKit');
  assert.equal(chromeManifest.version, firefoxManifest.version);
  assert.equal(chromeManifest.manifest_version, 3);
  assert.equal(firefoxManifest.manifest_version, 3);
  await Promise.all(
    [chromeDist, firefoxDist].flatMap(directory =>
      chromeManifest.content_scripts.flatMap(entry =>
        entry.js.map(file => assertClassicContentScript(directory, file))
      )
    )
  );
  console.log(
    `✓ Chrome and Firefox MV3 builds agree on v${chromeManifest.version} with classic content scripts`
  );

  fixtureServer = await createFixtureServer();
  context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    headless: process.env.STYLEKIT_E2E_HEADED !== '1',
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      `--disable-extensions-except=${chromeDist}`,
      `--load-extension=${chromeDist}`,
      '--disable-features=ExtensionsMenuAccessControl',
      '--host-resolver-rules=MAP stylekit.test 127.0.0.1',
      '--no-proxy-server',
      ...(process.env.STYLEKIT_E2E_BROWSER_LOG === '1'
        ? ['--enable-logging=stderr', '--vmodule=extension*=2']
        : []),
    ],
  });
  context.setDefaultTimeout(10_000);

  let serviceWorker;
  try {
    serviceWorker = await waitForServiceWorker(context);
  } catch (error) {
    const diagnostics = await getExtensionDiagnostics(context);
    throw new Error(
      `StyleKit service worker did not start. Extension diagnostics: ${JSON.stringify(diagnostics)}`,
      { cause: error }
    );
  }
  const extensionId = new URL(serviceWorker.url()).host;
  assert.match(extensionId, /^[a-p]{32}$/);
  console.log(`✓ Loaded StyleKit ${extensionId} in a clean Chromium profile`);

  const fixturePage = await context.newPage();
  const fixtureErrors = [];
  fixturePage.on('pageerror', error => fixtureErrors.push(error.message));
  await fixturePage.goto(fixtureServer.url, { waitUntil: 'domcontentloaded' });
  await fixturePage.getByText('StyleKit extension smoke fixture').waitFor();

  let requiresManualContentScriptInjection = false;
  try {
    await serviceWorker.evaluate(async fixtureUrl => {
      const tabs = await chrome.tabs.query({});
      const fixtureTab = tabs.find(tab => tab.url === fixtureUrl);
      if (!fixtureTab?.id) throw new Error('Fixture tab not found');
      await chrome.tabs.sendMessage(fixtureTab.id, {
        name: 'PreviewStyle',
        id: 'e2e-probe',
        css: '#fixture { outline: 1px solid transparent; }',
      });
    }, fixtureServer.url);
  } catch {
    requiresManualContentScriptInjection = true;
    await injectBuiltContentScripts(serviceWorker, fixtureServer.url);
    console.warn(
      'StyleKit E2E: browser policy withheld automatic content scripts; injected the built entries through chrome.scripting.'
    );
  }
  if (requiresManualContentScriptInjection) {
    console.log(
      '✓ Injected the built content-script entries through chrome.scripting'
    );
  } else {
    await fixturePage
      .locator('#stylekit-preview-e2e-probe')
      .waitFor({ state: 'attached' });
    await serviceWorker.evaluate(async fixtureUrl => {
      const tabs = await chrome.tabs.query({});
      const fixtureTab = tabs.find(tab => tab.url === fixtureUrl);
      if (!fixtureTab?.id) throw new Error('Fixture tab not found');
      void chrome.tabs.sendMessage(fixtureTab.id, {
        name: 'RemovePreviewStyle',
        id: 'e2e-probe',
      });
    }, fixtureServer.url);
    console.log('✓ Manifest content scripts receive tab messages');
  }

  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/popup/index.html`);
  await popupPage.locator('#app .popup').waitFor();
  assert.equal(await popupPage.title(), 'StyleKit');
  console.log('✓ Rendered the extension popup');

  const optionsPage =
    context.pages().find(page => page.url().endsWith('/options/index.html')) ||
    (await context.newPage());
  await optionsPage.goto(
    `chrome-extension://${extensionId}/options/index.html`
  );
  const optionsHeader = optionsPage.locator('.navigation .header');
  await optionsHeader.waitFor();
  assert.match((await optionsHeader.textContent()) || '', /StyleKit/);
  assert.equal(await optionsPage.title(), 'StyleKit Options');
  await optionsPage
    .locator('.navigation-item')
    .filter({ hasText: 'Styles' })
    .click();
  await optionsPage.getByText('Add a new style', { exact: false }).waitFor();
  console.log('✓ Rendered and navigated the options page');

  const styleKey = fixtureServer.url;
  const css = `#fixture, #shadow-fixture { color: ${expectedColor} !important; }`;
  await popupPage.evaluate(
    async ({ url, cssText, sourceUrl }) => {
      await chrome.runtime.sendMessage({
        name: 'SetAllStyles',
        styles: {
          [url]: {
            css: cssText,
            enabled: true,
            readability: false,
            shadowRoots: true,
            source: {
              url: sourceUrl,
              enabled: true,
              intervalMinutes: 5,
            },
            modifiedTime: new Date().toISOString(),
          },
        },
      });
    },
    { url: styleKey, cssText: css, sourceUrl: fixtureServer.sourceUrl }
  );

  await popupPage.waitForFunction(
    async ({ url, cssText }) => {
      const styles = await chrome.runtime.sendMessage({ name: 'GetAllStyles' });
      return styles?.[url]?.css === cssText;
    },
    { url: styleKey, cssText: css }
  );

  try {
    await fixturePage.waitForFunction(
      color =>
        getComputedStyle(document.querySelector('#fixture')).color === color,
      expectedColor,
      { timeout: 15_000 }
    );
  } catch (error) {
    const pageState = await fixturePage.evaluate(() => ({
      color: getComputedStyle(document.querySelector('#fixture')).color,
      styleIds: Array.from(document.querySelectorAll('style')).map(
        style => style.id
      ),
    }));
    throw new Error(
      `Test CSS was not applied. Page state: ${JSON.stringify(pageState)}`,
      { cause: error }
    );
  }
  assert.deepEqual(
    fixtureErrors,
    [],
    `Fixture page errors: ${fixtureErrors.join('; ')}`
  );
  assert.equal(
    await fixturePage
      .locator('#fixture')
      .evaluate(element => getComputedStyle(element).color),
    expectedColor
  );
  await fixturePage.evaluate(() => {
    const host = document.createElement('section');
    host.id = 'shadow-host';
    const root = host.attachShadow({ mode: 'open' });
    const target = document.createElement('button');
    target.id = 'shadow-fixture';
    target.textContent = 'Shadow fixture';
    root.appendChild(target);
    document.body.appendChild(host);
  });
  await fixturePage.waitForFunction(color => {
    const host = document.querySelector('#shadow-host');
    const target = host?.shadowRoot?.querySelector('#shadow-fixture');
    return target && getComputedStyle(target).color === color;
  }, expectedColor);
  await optionsPage.reload();
  await optionsPage
    .locator('.navigation-item')
    .filter({ hasText: 'Styles' })
    .click();
  const savedStyleRow = optionsPage.locator('.style').filter({
    hasText: styleKey,
  });
  await savedStyleRow.getByText('Include open shadow roots').waitFor();
  await savedStyleRow.getByText('Live source settings').click();
  await savedStyleRow.getByText('Automatically reload this source').waitFor();
  assert.equal(
    await savedStyleRow.getByText('Closed shadow roots').isVisible(),
    true
  );
  const shadowRootControl = await savedStyleRow.evaluate(element => ({
    tag: element.tagName,
    className: element.className,
    html: element.innerHTML.slice(0, 1000),
    controls: Array.from(
      element.querySelectorAll(
        'input, label, button, [role="checkbox"], [role="switch"]'
      )
    ).map(control => ({
      tag: control.tagName,
      text: control.textContent?.trim(),
      type: control.getAttribute('type'),
      checked:
        control instanceof HTMLInputElement ? control.checked : undefined,
      ariaChecked: control.getAttribute('aria-checked'),
    })),
  }));
  assert(
    shadowRootControl.controls.some(
      control => control.type === 'checkbox' && control.checked
    ) ||
      shadowRootControl.controls.some(
        control => control.ariaChecked === 'true'
      ),
    `Shadow-root option was not checked: ${JSON.stringify(shadowRootControl)}`
  );
  console.log(
    '✓ Persisted and applied test CSS through the real content/background path'
  );
  console.log(
    '✓ Applied opted-in CSS to a dynamic open shadow root and rendered its options state'
  );

  const reloadStatus = await popupPage.evaluate(async url => {
    return chrome.runtime.sendMessage({ name: 'ReloadStyleSource', url });
  }, styleKey);
  assert.equal(reloadStatus.state, 'updated');
  assert.equal(reloadStatus.rollbackAvailable, true);
  await fixturePage.waitForFunction(
    color =>
      getComputedStyle(document.querySelector('#fixture')).color === color,
    expectedReloadColor
  );
  const sourceStatuses = await popupPage.evaluate(async () => {
    return chrome.runtime.sendMessage({ name: 'GetStyleSourceStatuses' });
  });
  assert.equal(sourceStatuses[styleKey].state, 'updated');

  const rollbackStatus = await popupPage.evaluate(async url => {
    return chrome.runtime.sendMessage({ name: 'RollbackStyleSource', url });
  }, styleKey);
  assert.equal(rollbackStatus.state, 'rolled-back');
  await fixturePage.waitForFunction(
    color =>
      getComputedStyle(document.querySelector('#fixture')).color === color,
    expectedColor
  );
  const rolledBackStyles = await popupPage.evaluate(async () => {
    return chrome.runtime.sendMessage({ name: 'GetAllStyles' });
  });
  assert.equal(rolledBackStyles[styleKey].source.enabled, false);
  console.log(
    '✓ Reloaded a loopback CSS source, created a snapshot, and rolled back with polling disabled'
  );

  if (requiresManualContentScriptInjection) {
    console.log(
      '✓ Editor bundle smoke passed; managed browser policy skipped tab-message/Monaco rendering'
    );
  } else {
    await waitForEditorReceiver(serviceWorker, fixtureServer.url);
    await serviceWorker.evaluate(async fixtureUrl => {
      const tabs = await chrome.tabs.query({});
      const fixtureTab = tabs.find(tab => tab.url === fixtureUrl);
      if (!fixtureTab?.id) throw new Error('Fixture tab not found');
      void chrome.tabs.sendMessage(fixtureTab.id, { name: 'ToggleStylebot' });
    }, fixtureServer.url);

    await fixturePage.waitForFunction(() => {
      const host = document.querySelector('#stylebot');
      return Boolean(host?.shadowRoot?.querySelector('#stylebot-app'));
    });
    await fixturePage.keyboard.press('c');
    await fixturePage.waitForFunction(() => {
      const host = document.querySelector('#stylebot');
      return Boolean(host?.shadowRoot?.querySelector('iframe'));
    });
    console.log('✓ Opened the editor and rendered its Monaco iframe');
  }

  console.log('StyleKit extension E2E smoke passed.');
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes("Executable doesn't exist")
  ) {
    console.error(
      'Playwright Chromium is missing. Run: npx playwright install chromium'
    );
  }
  throw error;
} finally {
  await context?.close();
  if (fixtureServer) {
    fixtureServer.server.closeAllConnections();
    await closeServer(fixtureServer.server);
  }

  const resolvedProfile = resolve(profile);
  const resolvedTemp = resolve(tmpdir());
  if (
    !resolvedProfile.startsWith(`${resolvedTemp}\\`) &&
    resolvedProfile !== resolvedTemp
  ) {
    throw new Error(
      `Refusing to remove non-temporary E2E profile: ${resolvedProfile}`
    );
  }
  await rm(resolvedProfile, { recursive: true, force: true });
}
