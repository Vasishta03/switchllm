// SwitchLLM Popup Script

document.addEventListener('DOMContentLoaded', () => {
  const btnGrab = document.getElementById('btn-grab');
  const btnChatGPT = document.getElementById('btn-chatgpt');
  const btnGemini = document.getElementById('btn-gemini');
  const btnClear = document.getElementById('btn-clear');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const infoSection = document.getElementById('info-section');
  const infoText = document.getElementById('info-text');
  const statsPanel = document.getElementById('stats-panel');
  const tokenCount = document.getElementById('token-count');
  const charCount = document.getElementById('char-count');
  const handoffsToday = document.getElementById('handoffs-today');
  const handoffsTotal = document.getElementById('handoffs-total');

  // Check if we already have stored context
  loadStoredContext();
  loadUsageStats();

  // Grab conversation from Claude
  btnGrab.addEventListener('click', async () => {
    try {
      btnGrab.textContent = 'Grabbing...';
      btnGrab.disabled = true;

      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];

      if (!tab.url || !tab.url.includes('claude.ai')) {
        showError('Please navigate to a Claude conversation first.');
        btnGrab.textContent = 'Grab from Claude';
        btnGrab.disabled = false;
        return;
      }

      const response = await browser.tabs.sendMessage(tab.id, { action: 'extractConversation' });

      if (response && response.success) {
        await browser.storage.local.set({
          conversation: response.data,
          capturedAt: Date.now(),
          messageCount: response.messageCount
        });

        updateStatus(true, `Captured ${response.messageCount} messages`);
        enableSendButtons();
        showInfo(`Context ready! ${response.data.length} characters captured.`);
        updateTokenStats(response.data);
        btnGrab.classList.add('success');
        setTimeout(() => btnGrab.classList.remove('success'), 300);
      } else {
        showError(response?.error || 'Could not extract conversation. Make sure you have an active Claude chat open.');
      }
    } catch (err) {
      showError('Failed to connect to Claude tab. Refresh the Claude page and try again.');
      console.error('Grab error:', err);
    } finally {
      btnGrab.innerHTML = '<span class="btn-icon">&#8595;</span> Grab from Claude';
      btnGrab.disabled = false;
    }
  });

  // Send to ChatGPT
  btnChatGPT.addEventListener('click', async () => {
    await sendToTarget('chatgpt');
  });

  // Send to Gemini
  btnGemini.addEventListener('click', async () => {
    await sendToTarget('gemini');
  });

  // Clear stored context
  btnClear.addEventListener('click', async () => {
    await browser.storage.local.remove(['conversation', 'capturedAt', 'messageCount']);
    updateStatus(false, 'No conversation captured');
    disableSendButtons();
    hideInfo();
    statsPanel.style.display = 'none';
  });

  // --- Helper functions ---

  function estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  function updateTokenStats(conversationText) {
    const tokens = estimateTokens(conversationText);
    const chars = conversationText.length;
    tokenCount.textContent = tokens.toLocaleString();
    charCount.textContent = chars.toLocaleString();
    statsPanel.style.display = 'block';
  }

  async function recordHandoff() {
    const stored = await browser.storage.local.get(['handoffStats']);
    const stats = stored.handoffStats || { total: 0, daily: {} };

    const today = new Date().toISOString().split('T')[0];
    stats.total += 1;
    stats.daily[today] = (stats.daily[today] || 0) + 1;

    // Clean up old daily entries (keep last 7 days)
    const keys = Object.keys(stats.daily).sort();
    if (keys.length > 7) {
      keys.slice(0, keys.length - 7).forEach(k => delete stats.daily[k]);
    }

    await browser.storage.local.set({ handoffStats: stats });
    loadUsageStats();
  }

  async function loadUsageStats() {
    const stored = await browser.storage.local.get(['handoffStats']);
    const stats = stored.handoffStats || { total: 0, daily: {} };
    const today = new Date().toISOString().split('T')[0];

    handoffsToday.textContent = (stats.daily[today] || 0).toString();
    handoffsTotal.textContent = stats.total.toString();
  }

  async function loadStoredContext() {
    const stored = await browser.storage.local.get(['conversation', 'capturedAt', 'messageCount']);
    if (stored.conversation) {
      const timeAgo = getTimeAgo(stored.capturedAt);
      updateStatus(true, `${stored.messageCount} messages (${timeAgo})`);
      enableSendButtons();
      updateTokenStats(stored.conversation);
    }
  }

  async function sendToTarget(target) {
    const stored = await browser.storage.local.get(['conversation']);
    if (!stored.conversation) {
      showError('No conversation captured. Grab from Claude first.');
      return;
    }

    const url = target === 'chatgpt'
      ? 'https://chatgpt.com/'
      : 'https://gemini.google.com/app';

    // Send message to background to handle the transfer
    await browser.runtime.sendMessage({
      action: 'sendToTarget',
      target: target,
      url: url,
      conversation: stored.conversation
    });

    // Record this handoff for usage tracking
    await recordHandoff();

    showInfo(`Opening ${target === 'chatgpt' ? 'ChatGPT' : 'Gemini'}... Context will be pasted automatically.`);
  }

  function updateStatus(active, text) {
    statusDot.className = active ? 'dot active' : 'dot';
    statusText.textContent = text;
  }

  function enableSendButtons() {
    btnChatGPT.disabled = false;
    btnGemini.disabled = false;
  }

  function disableSendButtons() {
    btnChatGPT.disabled = true;
    btnGemini.disabled = true;
  }

  function showError(msg) {
    infoSection.style.display = 'block';
    infoText.textContent = msg;
    infoSection.className = 'info info-error';
  }

  function showInfo(msg) {
    infoSection.style.display = 'block';
    infoText.textContent = msg;
    infoSection.className = 'info';
  }

  function hideInfo() {
    infoSection.style.display = 'none';
  }

  function getTimeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
});
