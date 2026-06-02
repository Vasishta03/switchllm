// SwitchLLM - Claude Content Script
// Extracts conversation from claude.ai

(function() {
  'use strict';

  // Listen for messages from popup
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractConversation') {
      try {
        const result = extractConversation();
        sendResponse(result);
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    }
    return true; // Keep message channel open for async response
  });

  function extractConversation() {
    // Claude's conversation is rendered in message blocks
    // We look for the conversation container and extract user/assistant turns
    const messages = [];

    // Strategy 1: Look for message pairs with data attributes or role indicators
    const messageElements = document.querySelectorAll('[data-testid*="message"], .font-claude-message, .font-user-message');

    if (messageElements.length > 0) {
      messageElements.forEach(el => {
        const role = detectRole(el);
        const content = extractContent(el);
        if (content.trim()) {
          messages.push({ role, content: content.trim() });
        }
      });
    }

    // Strategy 2: Fallback - look for the conversation thread structure
    if (messages.length === 0) {
      const conversationContainer = document.querySelector('[class*="conversation"], [class*="thread"], main');
      if (conversationContainer) {
        // Claude typically alternates human/assistant in distinct blocks
        const blocks = conversationContainer.querySelectorAll('[class*="message"], [class*="Message"], article, [data-message-author-role]');

        blocks.forEach(block => {
          const role = detectRole(block);
          const content = extractContent(block);
          if (content.trim()) {
            messages.push({ role, content: content.trim() });
          }
        });
      }
    }

    // Strategy 3: Deep fallback - grab visible text blocks that look like conversation
    if (messages.length === 0) {
      const allBlocks = document.querySelectorAll('.prose, .whitespace-pre-wrap, [class*="content"]');
      let isHuman = true;

      allBlocks.forEach(block => {
        const content = block.textContent.trim();
        if (content.length > 5) {
          messages.push({
            role: isHuman ? 'human' : 'assistant',
            content: content
          });
          isHuman = !isHuman;
        }
      });
    }

    if (messages.length === 0) {
      return {
        success: false,
        error: 'No conversation found. Make sure you have an active Claude chat open with messages visible.'
      };
    }

    // Format the conversation as a handoff prompt
    const formatted = formatForHandoff(messages);

    return {
      success: true,
      data: formatted,
      messageCount: messages.length
    };
  }

  function detectRole(element) {
    const el = element;

    // Check data attributes
    const authorRole = el.getAttribute('data-message-author-role');
    if (authorRole) return authorRole === 'user' ? 'human' : 'assistant';

    // Check for human indicators in class/attributes
    const classStr = (el.className || '').toLowerCase();
    const parentClassStr = (el.parentElement?.className || '').toLowerCase();

    if (classStr.includes('human') || classStr.includes('user') || parentClassStr.includes('human') || parentClassStr.includes('user')) {
      return 'human';
    }
    if (classStr.includes('assistant') || classStr.includes('claude') || classStr.includes('ai') || parentClassStr.includes('assistant')) {
      return 'assistant';
    }

    // Check for avatar/icon indicators
    const hasHumanIcon = el.querySelector('[class*="human"], [class*="user"], [class*="Human"], [class*="User"]');
    if (hasHumanIcon) return 'human';

    // Default to checking position or alternating
    return 'assistant';
  }

  function extractContent(element) {
    // Get text content, preserving code blocks
    const codeBlocks = element.querySelectorAll('pre, code');
    let content = '';

    if (codeBlocks.length > 0) {
      // Walk through child nodes to preserve code block formatting
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node) => {
            if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT;
            if (node.tagName === 'PRE' || node.tagName === 'CODE') return NodeFilter.FILTER_ACCEPT;
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      // Simpler approach: just get textContent but mark code blocks
      content = element.textContent;
    } else {
      content = element.textContent;
    }

    // Clean up excessive whitespace while preserving paragraph breaks
    content = content.replace(/\n{3,}/g, '\n\n').trim();

    return content;
  }

  function formatForHandoff(messages) {
    let output = `[CONVERSATION CONTEXT - Transferred via SwitchLLM]\n`;
    output += `[Source: Claude | Messages: ${messages.length} | Captured: ${new Date().toISOString()}]\n\n`;
    output += `Please continue this conversation. Here is the context from my previous session:\n\n`;
    output += `---\n\n`;

    messages.forEach((msg, index) => {
      const roleLabel = msg.role === 'human' ? 'USER' : 'ASSISTANT';
      output += `[${roleLabel}]: ${msg.content}\n\n`;
    });

    output += `---\n\n`;
    output += `Please acknowledge this context and continue helping me from where we left off.`;

    return output;
  }

})();
