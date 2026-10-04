chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'IMPORT_SELECTION') return;
  (async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url?.startsWith('https://app.eu.legora.com/')) {
      return { text: '', message: 'Open the Legora project, select text, and try again. Manual paste is always available.' };
    }
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection()?.toString() || ''
      });
      return { text: (result[0]?.result || '').slice(0, 24000) };
    } catch {
      return { text: '', message: 'Chrome could not read the selection. Copy it into the text box below.' };
    }
  })().then(sendResponse).catch(() => sendResponse({ text: '', message: 'Use manual paste for this import.' }));
  return true;
});
