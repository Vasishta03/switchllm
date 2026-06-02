// SwitchLLM - Gemini Content Script
// Injects conversation context into gemini.google.com

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
    // Gemini uses a rich text editor - wait for it to be available
    waitForElement('.ql-editor, [contenteditable="true"], textarea, .text-input-field textarea, rich-textarea .ql-editor')
      .then(inputEl => {
        pasteIntoInput(inputEl, conversationText);
      })
      .catch(() => {
        // Fallback: copy to clipboard
        copyToClipboard(conversationText);
      });
  }

  function pasteIntoInput(element, text) {
    if (element.tagName === 'TEXTAREA') {
      element.focus();
      element.value = text;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (element.classList.contains('ql-editor') || element.contentEditable === 'true') {
      // Gemini uses Quill editor or contenteditable
      element.focus();

      // Clear and set content
      element.innerHTML = '';
      const p = document.createElement('p');
      p.textContent = text;
      element.appendChild(p);

      // Trigger input events for Gemini's framework to detect
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      }));

      // Also try dispatching on the parent (Gemini wraps editors)
      if (element.parentElement) {
        element.parentElement.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    showNotification('SwitchLLM: Context pasted! Review and hit Enter to send.');
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('SwitchLLM: Context copied to clipboard! Paste it into the input field (Ctrl+V).');
    }).catch(() => {
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

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

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
      // Try multiple selectors
      const selectors = selector.split(',').map(s => s.trim());

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el) {
          resolve(el);
          return;
        }
      }

      const observer = new MutationObserver((mutations, obs) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            obs.disconnect();
            resolve(el);
            return;
          }
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
