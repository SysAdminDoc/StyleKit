import Vue from 'vue';
import VueDraggableResizable from 'vue-draggable-resizable';
import { Store } from 'vuex';
import { t } from '@stylebot/i18n';

import { State } from '../store';
import TheStylebotApp from '../components/TheStylebotApp.vue';

import '../index.scss';

import {
  IconsPlugin,
  TooltipPlugin,
  LayoutPlugin,
  DropdownPlugin,
  FormRadioPlugin,
  FormInputPlugin,
  InputGroupPlugin,
  ButtonPlugin,
  ButtonGroupPlugin,
  FormGroupPlugin,
  FormCheckboxPlugin,
  ListGroupPlugin,
  TableSimplePlugin,
  CollapsePlugin,
} from 'bootstrap-vue';

Vue.use(IconsPlugin);
Vue.use(TooltipPlugin);
Vue.use(LayoutPlugin);
Vue.use(DropdownPlugin);
Vue.use(FormRadioPlugin);
Vue.use(FormInputPlugin);
Vue.use(InputGroupPlugin);
Vue.use(ButtonPlugin);
Vue.use(ButtonGroupPlugin);
Vue.use(FormGroupPlugin);
Vue.use(FormCheckboxPlugin);
Vue.use(ListGroupPlugin);
Vue.use(TableSimplePlugin);
Vue.use(CollapsePlugin);
Vue.component('vue-draggable-resizable', VueDraggableResizable);

Vue.mixin({
  methods: {
    t,
  },
});

const injectCss = (shadowRoot: ShadowRoot): void => {
  // Reset all inherited CSS properties at the shadow host boundary so that
  // styles installed on the page cannot bleed into the editor UI.
  const resetEl = document.createElement('style');
  resetEl.setAttribute('id', 'stylebot-host-reset');
  resetEl.innerHTML = ':host { all: initial !important; display: block !important; }';
  shadowRoot.appendChild(resetEl);

  const url = chrome.runtime.getURL('editor/index.css');

  fetch(url, { method: 'GET' })
    .then(response => response.text())
    .then(css => {
      const styleEl = document.createElement('style');
      styleEl.setAttribute('id', 'stylebot-editor-css');
      styleEl.innerHTML = css;
      shadowRoot.appendChild(styleEl);
    });
};

// Detect CSS filter effects applied to html/body (e.g. invert-based dark modes)
// and apply the same filter to the shadow host to cancel it out via double-application.
const syncCounterFilter = (host: HTMLElement): void => {
  const htmlFilter = getComputedStyle(document.documentElement).filter;
  const bodyFilter = getComputedStyle(document.body).filter;
  const pageFilter =
    htmlFilter !== 'none' ? htmlFilter : bodyFilter !== 'none' ? bodyFilter : null;

  if (pageFilter) {
    host.style.setProperty('filter', pageFilter, 'important');
  } else {
    host.style.removeProperty('filter');
  }
};

const initEditor = (store: Store<State>): void => {
  if (document.getElementById('stylebot')) {
    return;
  }

  const stylebotAppHost = document.createElement('div');
  stylebotAppHost.id = 'stylebot';
  stylebotAppHost.style.setProperty('display', 'block', 'important');
  stylebotAppHost.style.setProperty('visibility', 'visible', 'important');
  stylebotAppHost.style.setProperty('opacity', '1', 'important');
  // Prevent :empty selectors from hiding this element
  stylebotAppHost.appendChild(document.createComment('stylebot'));
  document.body.appendChild(stylebotAppHost);

  // Apply counter-filter immediately and re-sync whenever stylesheets change
  syncCounterFilter(stylebotAppHost);
  const filterObserver = new MutationObserver(() =>
    syncCounterFilter(stylebotAppHost)
  );
  filterObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributeFilter: ['style', 'class'],
    attributes: true,
  });

  const shadowRoot = stylebotAppHost.attachShadow({ mode: 'open' });
  const stylebotApp = document.createElement('div');

  stylebotApp.id = 'stylebot-app';
  shadowRoot.appendChild(stylebotApp);

  // Prevent page keyboard shortcuts from firing when typing in Stylebot inputs
  const stopKeyboardPropagation = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable)
    ) {
      e.stopPropagation();
    }
  };

  stylebotAppHost.addEventListener('keydown', stopKeyboardPropagation);
  stylebotAppHost.addEventListener('keyup', stopKeyboardPropagation);
  stylebotAppHost.addEventListener('keypress', stopKeyboardPropagation);

  injectCss(shadowRoot);

  new Vue({
    store,
    el: stylebotApp,
    render: h => h(TheStylebotApp),
  });
};

export { initEditor };
