/* Shared by the Zotero bootstrap, preferences pane, and Node contract tests. */
var GrapePaperBridge = (() => {
  const DEFAULT_APP_URL = 'http://localhost:5173/';
  const MAX_SELECTION_LENGTH = 4000;
  const MAX_URL_LENGTH = 24000;

  function validateAppURL(value) {
    let url;
    try {
      url = new URL(String(value).trim());
    } catch {
      throw new Error('Enter a complete GrapePaper web address.');
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
      throw new Error('Use HTTPS for a hosted companion, or HTTP on localhost.');
    }
    if (url.username || url.password || url.search || url.hash) {
      throw new Error('Use an address without credentials, query parameters, or a fragment.');
    }
    return url.href;
  }

  function createPayload(annotation, metadata = {}) {
    const text = typeof annotation?.text === 'string' ? annotation.text.trim() : '';
    if (!text) throw new Error('Select a passage with selectable text first.');
    if (text.length > MAX_SELECTION_LENGTH) {
      throw new Error('Select a shorter passage (at most 4,000 characters).');
    }
    const selection = { text };
    let position = annotation.position;
    if (typeof position === 'string') {
      try { position = JSON.parse(position); } catch { position = null; }
    }
    if (Number.isSafeInteger(position?.pageIndex) && position.pageIndex >= 0) {
      selection.page = position.pageIndex + 1;
    }
    const document = {};
    if (typeof metadata.title === 'string' && metadata.title.trim()) {
      document.title = metadata.title.trim().slice(0, 1000);
    }
    if (typeof metadata.doi === 'string' && metadata.doi.trim()) {
      document.doi = metadata.doi.trim().slice(0, 300);
    }
    return { version: 1, source: 'zotero', selection, document };
  }

  function createURL(appURL, payload) {
    const url = new URL(validateAppURL(appURL));
    // Rebuild from an allowlist even when the caller supplies an object directly.
    const cleanPayload = createPayload({
      text: payload?.selection?.text,
      position: Number.isSafeInteger(payload?.selection?.page) && payload.selection.page > 0
        ? { pageIndex: payload.selection.page - 1 }
        : undefined,
    }, payload?.document);
    url.hash = 'grapepaper=' + encodeURIComponent(JSON.stringify(cleanPayload));
    if (url.href.length > MAX_URL_LENGTH) {
      throw new Error('This passage is too long to open safely. Select a shorter passage.');
    }
    return url.href;
  }

  return { DEFAULT_APP_URL, MAX_SELECTION_LENGTH, validateAppURL, createPayload, createURL };
})();
