// SwitchLLM - Background Script
// Coordinates context transfer between tabs

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'sendToTarget') {
    handleSendToTarget(message.target, message.url, message.conversation);
    sendResponse({ success: true });
  }
  return true;
});

async function handleSendToTarget(target, url, conversation) {
  try {
    // Store the conversation to inject after page loads
    await browser.storage.local.set({
      pendingInjection: {
        target: target,
        conversation: conversation,
        timestamp: Date.now()
      }
    });

    // Check if target is already open in a tab
    const targetPattern = target === 'chatgpt'
      ? '*://chatgpt.com/*'
      : '*://gemini.google.com/*';

    const existingTabs = await browser.tabs.query({ url: targetPattern });

    if (existingTabs.length > 0) {
      // Use existing tab
      const tab = existingTabs[0];
      await browser.tabs.update(tab.id, { active: true });
      await browser.windows.update(tab.windowId, { focused: true });

      // Inject context into existing tab
      setTimeout(async () => {
        try {
          await browser.tabs.sendMessage(tab.id, {
            action: 'injectContext',
            conversation: conversation
          });
          await clearPendingInjection();
        } catch (err) {
          // Tab might need a reload, keep pendingInjection for onUpdated listener
          console.log('Will inject after tab reload:', err.message);
        }
      }, 500);
    } else {
      // Open new tab
      const newTab = await browser.tabs.create({ url: url, active: true });

      // Wait for the tab to finish loading, then inject
      browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);

          // Give the page a moment to fully render
          setTimeout(async () => {
            try {
              await browser.tabs.sendMessage(tabId, {
                action: 'injectContext',
                conversation: conversation
              });
              await clearPendingInjection();
            } catch (err) {
              console.error('Failed to inject context:', err);
            }
          }, 2000);
        }
      });
    }
  } catch (err) {
    console.error('handleSendToTarget error:', err);
  }
}

async function clearPendingInjection() {
  await browser.storage.local.remove(['pendingInjection']);
}

// Handle case where content script loads after the background sends the message
// (race condition with new tabs)
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  const stored = await browser.storage.local.get(['pendingInjection']);
  if (!stored.pendingInjection) return;

  const pending = stored.pendingInjection;

  // Check if this tab matches the target
  const isMatch = (
    (pending.target === 'chatgpt' && (tab.url?.includes('chatgpt.com') || tab.url?.includes('chat.openai.com'))) ||
    (pending.target === 'gemini' && tab.url?.includes('gemini.google.com'))
  );

  if (isMatch && (Date.now() - pending.timestamp) < 30000) {
    // Only inject if pending was set within last 30 seconds
    setTimeout(async () => {
      try {
        await browser.tabs.sendMessage(tabId, {
          action: 'injectContext',
          conversation: pending.conversation
        });
        await clearPendingInjection();
      } catch (err) {
        // Content script might not be ready yet, will retry on next update
        console.log('Retry injection later:', err.message);
      }
    }, 1500);
  }
});
