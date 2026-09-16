/* global Zotero, GrapePaperBridge */
window.GrapePaperPreferences = {
  init(element) {
    element.querySelector('#grapepaper-app-url').value =
      Zotero.Prefs.get('extensions.grapepaper.appURL', true) || GrapePaperBridge.DEFAULT_APP_URL;
  },
  save(button) {
    const pane = button.closest('groupbox');
    const status = pane.querySelector('#grapepaper-preference-status');
    try {
      const input = pane.querySelector('#grapepaper-app-url');
      const value = GrapePaperBridge.validateAppURL(input.value);
      Zotero.Prefs.set('extensions.grapepaper.appURL', value, true);
      input.value = value;
      status.textContent = '已保存 / Address saved.';
    } catch (error) {
      status.textContent = error.message;
    }
  },
};
