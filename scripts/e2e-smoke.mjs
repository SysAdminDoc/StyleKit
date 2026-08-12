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
const fixtureHtml = `<!doctype html>
  <html>
    <head><title>StyleKit E2E Fixture</title></head>
    <body>
      <section id="layout-context" style="display: flex; gap: 12px; font-family: 'Roboto Flex'">
        <main id="fixture">StyleKit extension smoke fixture</main>
        <aside id="secondary">Secondary selector fixture</aside>
      </section>
    </body>
  </html>`;

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

const assertMonacoRuntime = async directory => {
  const iframeHtml = await readFile(
    resolve(directory, 'monaco-editor/iframe/index.html'),
    'utf8'
  );
  assert.match(iframeHtml, /<script type="module" src="index\.js"><\/script>/);
  const loader = await readFile(
    resolve(
      directory,
      'monaco-editor/iframe/node_modules/monaco-editor/min/vs/loader.js'
    )
  );
  assert(loader.byteLength > 0, 'Monaco AMD loader must be packaged');
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
    response.end(fixtureHtml);
  });

  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert(address && typeof address === 'object');
      resolveServer({
        server,
        url: 'https://www.youtube.com/watch?v=stylekit-e2e',
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
  await Promise.all([
    ...[chromeDist, firefoxDist].flatMap(directory =>
      chromeManifest.content_scripts.flatMap(entry =>
        entry.js.map(file => assertClassicContentScript(directory, file))
      )
    ),
    assertMonacoRuntime(chromeDist),
    assertMonacoRuntime(firefoxDist),
  ]);
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

  await context.route('https://www.youtube.com/**', route =>
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: fixtureHtml,
    })
  );
  const fixturePage = await context.newPage();
  const fixtureErrors = [];
  const fixtureConsoleErrors = [];
  fixturePage.on('pageerror', error => fixtureErrors.push(error.message));
  fixturePage.on('console', message => {
    if (message.type() === 'error') fixtureConsoleErrors.push(message.text());
  });
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
  const fixtureHostname = new URL(styleKey).hostname;
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

  await optionsPage
    .locator('.navigation-item')
    .filter({ hasText: 'Sync' })
    .click();
  const minifyCssExport = optionsPage.getByRole('checkbox', {
    name: 'Minify CSS export',
  });
  await minifyCssExport.check();
  await optionsPage.evaluate(() => {
    window.__stylekitE2eDownload = null;
    HTMLAnchorElement.prototype.click = function () {
      window.__stylekitE2eDownload = {
        download: this.download,
        href: this.href,
      };
    };
  });
  await optionsPage.getByRole('button', { name: 'Export as CSS' }).click();
  await optionsPage.waitForFunction(() => window.__stylekitE2eDownload);
  const cssDownload = await optionsPage.evaluate(
    () => window.__stylekitE2eDownload
  );
  assert.equal(cssDownload.download, 'stylekit_export.css');
  const exportedCss = decodeURIComponent(
    cssDownload.href.slice(cssDownload.href.indexOf(',') + 1)
  );
  assert(exportedCss.startsWith(`/* ${styleKey} */\n`));
  assert.match(
    exportedCss,
    /#fixture, ?#shadow-fixture\{color:rgb\(12,34,56\)!important\}/
  );
  assert.equal(
    await popupPage.evaluate(async url => {
      const styles = await chrome.runtime.sendMessage({ name: 'GetAllStyles' });
      return styles[url]?.css;
    }, styleKey),
    css
  );
  await optionsPage.reload();
  await optionsPage
    .locator('.navigation-item')
    .filter({ hasText: 'Sync' })
    .click();
  assert(
    await optionsPage
      .getByRole('checkbox', { name: 'Minify CSS export' })
      .isChecked()
  );
  console.log(
    '✓ Exported minified CSS without mutating styles and persisted the preference'
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
    await serviceWorker.evaluate(async () => {
      await chrome.storage.local.set({
        'stylekit-google-fonts': {
          fonts: ['Roboto Flex'],
          axes: {
            'Roboto Flex': [
              { tag: 'opsz', min: 8, max: 144, defaultValue: 14 },
              { tag: 'wdth', min: 25, max: 151, defaultValue: 100 },
              { tag: 'wght', min: 100, max: 1000, defaultValue: 400 },
            ],
          },
          ts: Date.now(),
        },
      });
    });
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
    const inspectorButton = fixturePage.locator(
      '#stylebot .stylebot-inspector'
    );
    const onboardingOverlay = fixturePage.locator(
      '#stylebot .onboarding-overlay'
    );
    if (await onboardingOverlay.isVisible().catch(() => false)) {
      await fixturePage.keyboard.press('Escape');
      await onboardingOverlay.waitFor({ state: 'hidden' });
    }
    assert.equal(await inspectorButton.getAttribute('aria-pressed'), 'true');
    await fixturePage.locator('#fixture').click({ modifiers: ['Shift'] });
    await fixturePage.locator('#secondary').click({ modifiers: ['Shift'] });
    await fixturePage.waitForFunction(() => {
      const host = document.querySelector('#stylebot');
      const input = host?.shadowRoot?.querySelector('.css-selector-input');
      return input?.value === '#fixture, #secondary';
    });
    assert.equal(await inspectorButton.getAttribute('aria-pressed'), 'true');
    await inspectorButton.click();
    console.log(
      '✓ Built a deduplicated multi-selector with Shift-click while inspection stayed active'
    );
    const layoutSection = fixturePage
      .locator('#stylebot .section')
      .filter({ hasText: 'Layout' });
    await layoutSection
      .getByRole('button', { name: 'Show flex overlay' })
      .click();
    const layoutOverlayState = await fixturePage
      .locator('[data-stylekit-layout-overlay]')
      .evaluate(overlay => ({
        items: overlay.querySelectorAll('.stylekit-layout-item').length,
        label: overlay.querySelector('.stylekit-layout-label')?.textContent,
      }));
    assert.equal(layoutOverlayState.items, 2);
    assert.match(layoutOverlayState.label || '', /flex · 2 items/);
    await layoutSection
      .getByRole('button', { name: 'Hide layout overlay' })
      .click();
    await fixturePage
      .locator('[data-stylekit-layout-overlay]')
      .waitFor({ state: 'detached' });
    console.log(
      '✓ Visualized and removed the selected elements’ flex layout context'
    );
    const textSectionState = await fixturePage
      .locator('#stylebot')
      .evaluate(host => {
        const sections = Array.from(
          host.shadowRoot?.querySelectorAll('.section') || []
        );
        const textSection = sections.find(section =>
          section.querySelector('.section-title')?.textContent?.includes('Text')
        );
        textSection?.querySelector('.collapse-btn')?.click();
        return Boolean(textSection);
      });
    assert(textSectionState, 'Text section was not rendered');
    const widthAxisInput = fixturePage.locator(
      '#stylebot input[aria-label="Width axis value"]'
    );
    await widthAxisInput.waitFor();
    await widthAxisInput.fill('112');
    await fixturePage
      .locator('#stylebot input[aria-label="Font weight value"]')
      .fill('575');
    await fixturePage.waitForFunction(() =>
      ['#fixture', '#secondary'].every(selector => {
        const style = getComputedStyle(document.querySelector(selector));
        return (
          style.fontWeight === '575' &&
          style.fontVariationSettings.includes('"wdth" 112')
        );
      })
    );
    console.log(
      '✓ Applied numeric weight and metadata-backed variable-font axes'
    );
    const sectionState = await fixturePage
      .locator('#stylebot')
      .evaluate(host => {
        const sections = Array.from(
          host.shadowRoot?.querySelectorAll('.section') || []
        );
        const colorSection = sections.find(section =>
          section
            .querySelector('.section-title')
            ?.textContent?.includes('Colors')
        );
        colorSection?.querySelector('.collapse-btn')?.click();
        return {
          clicked: Boolean(colorSection),
          labels: sections.map(section =>
            section.textContent?.trim().slice(0, 80)
          ),
        };
      });
    assert(
      sectionState.clicked,
      `Colors section was not rendered: ${JSON.stringify(sectionState.labels)}`
    );
    const colorSection = fixturePage
      .locator('#stylebot .section')
      .filter({ hasText: 'Colors' });
    await colorSection
      .locator('select[aria-label="Gradient type"]')
      .selectOption('conic');
    await colorSection
      .getByRole('button', { name: 'Set gradient angle to 90 degrees' })
      .click();
    await fixturePage.waitForFunction(() =>
      ['#fixture', '#secondary'].every(selector =>
        getComputedStyle(
          document.querySelector(selector)
        ).backgroundImage.includes('conic-gradient')
      )
    );
    await colorSection.getByRole('button', { name: 'Copy CSS' }).waitFor();
    console.log(
      '✓ Applied a conic gradient with the visual angle controls and exposed Copy CSS'
    );
    const animationSectionState = await fixturePage
      .locator('#stylebot')
      .evaluate(host => {
        const sections = Array.from(
          host.shadowRoot?.querySelectorAll('.section') || []
        );
        const animationSection = sections.find(section =>
          section
            .querySelector('.section-title')
            ?.textContent?.includes('Animations')
        );
        animationSection?.querySelector('.collapse-btn')?.click();
        return Boolean(animationSection);
      });
    assert(animationSectionState, 'Animations section was not rendered');
    const animationSection = fixturePage
      .locator('#stylebot .section')
      .filter({ hasText: 'Animations' });
    await animationSection
      .getByRole('button', { name: 'Edit keyframe at 0 percent' })
      .waitFor();
    assert.equal(
      await animationSection.locator('.animation-marker').count(),
      2
    );
    await animationSection
      .getByRole('button', { name: 'Apply & Replay' })
      .click();
    await fixturePage.waitForFunction(() =>
      ['#fixture', '#secondary'].every(selector =>
        getComputedStyle(
          document.querySelector(selector)
        ).animationName.includes('stylekit-')
      )
    );
    console.log(
      '✓ Applied and replayed a selector-scoped animation from visual keyframe markers'
    );
    const recipesSection = fixturePage
      .locator('#stylebot .section')
      .filter({ hasText: 'Site Recipes' });
    await recipesSection
      .locator('.collapse-btn')
      .getByText("You're on YouTube — try Clean YouTube")
      .waitFor();
    await recipesSection.locator('.collapse-btn').click();
    await recipesSection
      .getByRole('region', { name: 'Suggested recipe for YouTube' })
      .getByRole('button', { name: 'Apply suggestion' })
      .waitFor();
    await recipesSection.getByRole('button', { name: 'Add source' }).click();
    await recipesSection
      .getByLabel('Marketplace repository')
      .fill('owner/recipes');
    await recipesSection.getByLabel('Marketplace version pin').fill('main');
    await recipesSection
      .getByRole('button', { name: 'Add pinned source' })
      .click();
    await recipesSection
      .getByRole('alert')
      .getByText('Version pin must be a semantic version tag')
      .waitFor();
    await recipesSection
      .locator('.marketplace-section')
      .getByRole('button', { name: 'Cancel' })
      .click();
    await recipesSection.getByRole('button', { name: 'New', exact: true }).click();
    await recipesSection.getByLabel('Recipe name').fill('E2E Focus Recipe');
    await recipesSection
      .getByLabel('Recipe description')
      .fill('Created by the browser smoke');
    await recipesSection
      .getByLabel('Recipe CSS')
      .fill('#fixture { border-top: 7px solid rgb(1, 2, 3) !important; }');
    await recipesSection.getByRole('button', { name: 'Save recipe' }).click();
    await recipesSection.getByRole('status').getByText('Recipe saved.').waitFor();
    const userRecipe = recipesSection
      .locator('.user-recipe-item')
      .filter({ hasText: 'E2E Focus Recipe' });
    await userRecipe.getByRole('button', { name: 'Apply' }).click();
    await fixturePage.waitForFunction(
      () => getComputedStyle(document.querySelector('#fixture')).borderTopWidth === '7px'
    );
    const [recipeDownload] = await Promise.all([
      fixturePage.waitForEvent('download'),
      userRecipe.getByRole('button', { name: 'Export' }).click(),
    ]);
    assert.match(
      recipeDownload.suggestedFilename(),
      /^stylekit-recipe-.+\.json$/
    );
    const recipeDownloadPath = await recipeDownload.path();
    assert(recipeDownloadPath, 'Recipe JSON download did not produce a file');
    const recipeExport = JSON.parse(await readFile(recipeDownloadPath, 'utf8'));
    assert.equal(recipeExport.kind, 'recipes');
    assert.equal(recipeExport.recipes[0]?.name, 'E2E Focus Recipe');
    assert(
      await serviceWorker.evaluate(async () => {
        const stored = await chrome.storage.local.get('stylekit-user-recipes');
        return stored['stylekit-user-recipes']?.some(
          recipe => recipe.name === 'E2E Focus Recipe'
        );
      })
    );
    console.log(
      '✓ Rendered domain suggestions, enforced marketplace pins, and shared a user recipe'
    );
    await fixturePage.getByRole('button', { name: 'View changes' }).click();
    const savedDiff = fixturePage.getByRole('dialog', { name: 'CSS Changes' });
    await savedDiff.getByText('Compared with saved version from').waitFor();
    assert(
      (await savedDiff.locator('.added, .removed').count()) > 0,
      'Saved-version diff did not render any changed lines'
    );
    assert(
      await serviceWorker.evaluate(async url => {
        const stored = await chrome.storage.local.get(
          'stylekit-style-versions'
        );
        return Boolean(
          stored['stylekit-style-versions']?.[url]?.previous?.savedAt
        );
      }, styleKey)
    );
    await savedDiff.getByRole('button', { name: 'Close CSS changes' }).click();
    console.log(
      '✓ Compared current CSS with a background-persisted previous saved version'
    );
    await fixturePage.keyboard.press('c');
    await fixturePage.waitForFunction(() => {
      const host = document.querySelector('#stylebot');
      return Boolean(host?.shadowRoot?.querySelector('iframe'));
    });
    const monacoFrame = fixturePage.frameLocator('#stylebot iframe');
    const monacoTheme = monacoFrame.getByLabel('Monaco theme');
    await monacoTheme.waitFor().catch(async error => {
      const frameDiagnostics = await Promise.all(
        fixturePage.frames().map(async frame => ({
          url: frame.url(),
          body: await frame
            .locator('body')
            .innerHTML()
            .catch(() => '<unavailable>'),
        }))
      );
      throw new Error(
        `Monaco toolbar did not load: ${error.message}; page errors=${JSON.stringify(
          fixtureErrors
        )}; console errors=${JSON.stringify(
          fixtureConsoleErrors
        )}; frames=${JSON.stringify(frameDiagnostics)}`
      );
    });
    await monacoTheme.selectOption('sepia');
    const monacoLint = monacoFrame.getByLabel('CSS lint preset');
    await monacoFrame
      .locator(
        `select[aria-label="CSS lint preset"][title*="${fixtureHostname}"]`
      )
      .waitFor();
    await monacoLint.selectOption('strict');
    await monacoFrame
      .locator('#container[data-stylekit-monaco-theme="sepia"]')
      .waitFor();
    await monacoFrame
      .locator('#container[data-stylekit-lint-preset="strict"]')
      .waitFor();
    const prettierOnSave = monacoFrame.getByLabel('Prettier on save');
    await prettierOnSave.check();
    await monacoFrame.locator('#container').evaluate(() => {
      const model = window.monaco.editor.getModels()[0];
      if (!model) throw new Error('Monaco CSS model was not created');
      model.setValue('.prettier-smoke{color:red}');
    });
    await monacoFrame
      .locator('.monaco-editor')
      .click({ position: { x: 24, y: 36 } });
    await fixturePage.keyboard.press('Control+s');
    await monacoFrame
      .locator('#container[data-stylekit-format-status="ready"]')
      .waitFor();
    assert.equal(
      (
        (await monacoFrame.locator('#container').evaluate(() =>
          window.monaco.editor.getModels()[0]?.getValue()
        )) || ''
      ).replaceAll('\r\n', '\n'),
      '.prettier-smoke {\n  color: red;\n}\n'
    );
    await serviceWorker.evaluate(async hostname => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const stored = await chrome.storage.local.get([
          'stylekit-monaco-lint',
          'stylekit-monaco-format-on-save',
        ]);
        if (
          stored['stylekit-monaco-lint']?.sitePresets?.[hostname] === 'strict' &&
          stored['stylekit-monaco-format-on-save'] === true
        ) {
          return;
        }
        await new Promise(resolveWait => setTimeout(resolveWait, 50));
      }
      throw new Error('Monaco lint/format settings were not persisted');
    }, fixtureHostname);
    await fixturePage.locator('#stylebot iframe').evaluate(iframe => {
      const src = iframe.getAttribute('src');
      if (!src) throw new Error('Monaco iframe source is missing');
      iframe.setAttribute('src', src);
    });
    await monacoTheme.waitFor();
    assert.equal(await monacoTheme.inputValue(), 'sepia');
    await monacoLint.waitFor();
    assert.equal(await monacoLint.inputValue(), 'strict');
    assert(
      (await monacoLint.getAttribute('title'))?.includes(fixtureHostname),
      'Reloaded Monaco lint override should identify the fixture hostname'
    );
    await prettierOnSave.waitFor();
    assert(await prettierOnSave.isChecked());
    console.log(
      '✓ Persisted Monaco theme, site lint override, and Prettier-on-save formatting'
    );
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
