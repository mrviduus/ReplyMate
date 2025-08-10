// Only the content script is able to access the DOM
chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (_msg) {
    port.postMessage({ contents: document.body.innerText });
  });
});
