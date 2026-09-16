/* global Zotero, Services */
var GrapePaperPlugin;

function install() {}
function uninstall() {}

async function startup({ id, rootURI }) {
  const scope = { URL };
  Services.scriptloader.loadSubScript(rootURI + 'bridge.js', scope);
  const bridge = scope.GrapePaperBridge;
  const nodes = new Set();
  let active = true;
  let paneID;

  function handleSelection({ reader, doc, params, append }) {
    if (!active || typeof params?.annotation?.text !== 'string' || !params.annotation.text.trim()) return;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'toolbar-button wide-button grapepaper-companion-button';
    button.setAttribute('data-tabstop', '1');
    button.textContent = '🍇 GrapePaper 伴读';
    button.title = 'Open this passage in GrapePaper. The selected text, title, DOI and page are passed to the web app; the PDF is not uploaded.';
    // A popup can re-render while selection changes. Capture this passage now.
    const annotation = {
      text: params.annotation.text,
      position: params.annotation.position
        ? JSON.parse(JSON.stringify(params.annotation.position))
        : undefined,
    };
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      if (!active) return;
      try {
        const attachment = Zotero.Items.get(reader.itemID);
        const parent = attachment?.parentItemID ? Zotero.Items.get(attachment.parentItemID) : null;
        const item = parent || attachment;
        const payload = bridge.createPayload(annotation, {
          title: item?.getField('title') || '',
          doi: parent?.getField('DOI') || '',
        });
        const appURL = Zotero.Prefs.get('extensions.grapepaper.appURL', true) || bridge.DEFAULT_APP_URL;
        Zotero.launchURL(bridge.createURL(appURL, payload));
      } catch (error) {
        Zotero.alert(Zotero.getMainWindow(), 'GrapePaper', error.message || 'Unable to open this passage.');
      }
    });
    // Zotero requires append() during this synchronous event dispatch.
    append(button);
    for (const node of nodes) {
      if (!node.isConnected) nodes.delete(node);
    }
    nodes.add(button);
  }

  Zotero.Reader.registerEventListener('renderTextSelectionPopup', handleSelection, id);
  GrapePaperPlugin = {
    stop() {
      active = false;
      Zotero.Reader.unregisterEventListener('renderTextSelectionPopup', handleSelection);
      for (const node of nodes) node.remove();
      nodes.clear();
      if (paneID) Zotero.PreferencePanes.unregister(paneID);
      paneID = undefined;
    },
  };
  try {
    paneID = await Zotero.PreferencePanes.register({
      pluginID: id,
      label: 'GrapePaper',
      src: rootURI + 'preferences.xhtml',
      scripts: [rootURI + 'bridge.js', rootURI + 'preferences.js'],
    });
    if (!active && paneID) Zotero.PreferencePanes.unregister(paneID);
  } catch (error) {
    GrapePaperPlugin?.stop();
    throw error;
  }
}

function shutdown() {
  GrapePaperPlugin?.stop();
  GrapePaperPlugin = undefined;
}
