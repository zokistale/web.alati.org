const ICON_FILE_MAP = {
  home: 'home.svg',
  email: 'email.svg',
  name: 'name.svg',
  string: 'string.svg',
  text: 'text.svg',
  transform: 'transform.svg',
  font: 'font.svg',
  html: 'html.svg',
  copy: 'copy.svg',
  check: 'check.svg',
  convert: 'convert.svg',
  clear: 'clear.svg'
};

const iconCache = new Map();

function getScriptBase() {
  const currentScript = document.currentScript;
  const scriptUrl = currentScript?.src || Array.from(document.scripts).find((script) => script.src && script.src.includes('/app'))?.src || location.href;
  const baseUrl = new URL(scriptUrl, location.href);
  baseUrl.pathname = baseUrl.pathname.replace(/\/[^/]*$/, '/');
  return new URL('../icons/', baseUrl).href;
}

const ICONS_BASE_URL = getScriptBase();

function fetchIconFile(fileName) {
  if (iconCache.has(fileName)) {
    return iconCache.get(fileName);
  }

  const promise = fetch(new URL(fileName, ICONS_BASE_URL).href)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load icon ${fileName}: ${response.status}`);
      }
      return response.text();
    })
    .then((text) => text.trim());

  iconCache.set(fileName, promise);
  return promise;
}

function mergeClasses(svg, host) {
  const hostClasses = Array.from(host.classList).filter(Boolean);
  const svgClasses = Array.from(svg.classList).filter(Boolean);
  const merged = Array.from(new Set([...svgClasses, ...hostClasses]));

  if (merged.length) {
    svg.setAttribute('class', merged.join(' '));
  }
}

function copyAttributes(host, svg) {
  for (const attr of Array.from(host.attributes)) {
    if (attr.name === 'class') {
      continue;
    }
    if (attr.name === 'src') {
      continue;
    }
    svg.setAttribute(attr.name, attr.value);
  }
}

class SvgIconElement extends HTMLElement {
  connectedCallback() {
    if (this.__iconInjected) {
      return;
    }

    const tagName = this.localName;
    const iconName = tagName.startsWith('x-icon-') ? tagName.slice(7) : null;
    const iconFile = iconName ? ICON_FILE_MAP[iconName] : null;

    if (!iconFile) {
      return;
    }

    this.__iconInjected = true;
    fetchIconFile(iconFile)
      .then((svgText) => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = svgText;
        const svg = wrapper.querySelector('svg');

        if (!svg) {
          return;
        }

        mergeClasses(svg, this);
        copyAttributes(this, svg);

        if (!svg.hasAttribute('aria-hidden') && !this.hasAttribute('aria-label')) {
          svg.setAttribute('aria-hidden', 'true');
        }

        this.replaceWith(svg);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }
}

for (const iconName of Object.keys(ICON_FILE_MAP)) {
  const tagName = `x-icon-${iconName}`;

  if (!customElements.get(tagName)) {
    class IconElement extends SvgIconElement {
      connectedCallback() {
        if (this.__iconInjected) {
          return;
        }

        const iconFile = ICON_FILE_MAP[iconName];

        if (!iconFile) {
          return;
        }

        this.__iconInjected = true;
        fetchIconFile(iconFile)
          .then((svgText) => {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = svgText;
            const svg = wrapper.querySelector('svg');

            if (!svg) {
              return;
            }

            mergeClasses(svg, this);
            copyAttributes(this, svg);

            if (!svg.hasAttribute('aria-hidden') && !this.hasAttribute('aria-label')) {
              svg.setAttribute('aria-hidden', 'true');
            }

            this.replaceWith(svg);
          })
          .catch((error) => {
            // eslint-disable-next-line no-console
            console.error(error);
          });
      }
    }

    customElements.define(tagName, IconElement);
  }
}
