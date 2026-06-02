// SwitchLLM - ChatGPT Content Script
// Injects conversation context into chatgpt.com

(function() {
  'use strict';

  // Listen for messages from background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectContext') {
      injectContext(message.conversation);
      sendResponse({ success: true });
    }
    return true;
  });

  function injectContext(conversationText) {
    // Wait for the page to be fully ready
    waitForElement('textarea, [contenteditable="true"], #prompt-textarea, div[id="prompt-textarea"]')
      .then(inputEl => {
        pasteIntoInput(inputEl, conversationText);
      })
      .catch(() => {
        // Fallback: copy to clipboard and notify
        copyToClipboard(conversationText);
      });
  }

  function pasteIntoInput(element, text) {
    if (element.tagName === 'TEXTAREA') {
      // Standard textarea
      element.focus();
      element.value = text;

      // Trigger input events so React picks up the change
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true') {
      // ContentEditable div (ChatGPT uses this)
      element.focus();

      // Clear existing content
      element.innerHTML = '';

      // Insert text as a paragraph
      const p = document.createElement('p');
      p.textContent = text;
      element.appendChild(p);

      // Trigger input events
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));
    }

    // Show a brief notification
    showNotification('SwitchLLM: Context pasted! Review and hit Enter to send.');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('SwitchLLM: Context copied to clipboard! Paste it into the input field (Ctrl+V).');
    }).catch(() => {
      // Last resort: create a temporary textarea
      const temp = document.createElement('textarea');
      temp.value = text;
      document.body.appendChild(temp);
      temp.select();
      document.execCommand('copy');
      document.body.removeChild(temp);
      showNotification('SwitchLLM: Context copied to clipboard! Paste it into the input field (Ctrl+V).');
    });
  }

  function showNotification(message) {
    // Create a toast notification
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #7c3aed;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-family: -apple-system, sans-serif;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      max-width: 350px;
    `;

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    // Remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 300);
    }, 5000);
  }

  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) {
        resolve(el);
        return;
      }

      const observer = new MutationObserver((mutations, obs) => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      setTimeout(() => {
        observer.disconnect();
        reject(new Error('Element not found: ' + selector));
      }, timeout);
    });
  }

})();
