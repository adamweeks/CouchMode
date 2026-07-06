import '@testing-library/jest-dom'

// jsdom doesn't implement matchMedia; ThemeProvider (and anything else that
// queries prefers-color-scheme) needs a stub. Individual tests can override
// window.matchMedia to simulate specific device settings.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
