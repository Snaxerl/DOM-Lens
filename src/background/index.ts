chrome.runtime.onInstalled.addListener(() => {
  void chrome.storage.local.get("theme").then((result) => {
    if (!result.theme) return chrome.storage.local.set({theme:"dark"});
  });
});
