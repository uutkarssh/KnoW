/* ============================================================
   KnoW — Shared script.js
   Contains: mobile menu toggle, formatText, addMessage,
   sendMessage, autoResize, clearChat, handleKeydown, initChat
   ============================================================ */

/* -----------------------------------------
   MOBILE MENU TOGGLE (shared, all pages)
   ----------------------------------------- */
function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', function () {
    mobileMenu.classList.add('open');
  });

  // Close button (inside mobile menu)
  const closeBtn = mobileMenu.querySelector('.mobile-menu-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
    });
  }

  // Close on link click
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      mobileMenu.classList.remove('open');
    });
  });
}

/* -----------------------------------------
   formatText — render markdown-ish syntax
   Handles: ```code blocks```, `inline code`,
            **bold**, *italic*, # headers,
            - bullet lists, \n → <br>
   ----------------------------------------- */
function formatText(text) {
  if (!text) return '';

  // 1. Extract fenced code blocks, replace with placeholder tokens
  const codeBlocks = [];
  let processed = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, function (match, lang, code) {
    const idx = codeBlocks.length;
    codeBlocks.push({ lang: lang || '', code: code.replace(/\n$/, '') });
    return '\u0000CODEBLOCK' + idx + '\u0000';
  });

  // 2. Escape HTML in remaining text
  processed = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 3. Headers (###, ##, #) → bold block
  processed = processed.replace(/^###\s+(.+)$/gm, '<strong class="md-h3">$1</strong>');
  processed = processed.replace(/^##\s+(.+)$/gm, '<strong class="md-h2">$1</strong>');
  processed = processed.replace(/^#\s+(.+)$/gm, '<strong class="md-h1">$1</strong>');

  // 4. Bold (**text**)
  processed = processed.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

  // 5. Italic (*text*) — must come after bold
  processed = processed.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');

  // 6. Inline code
  processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 7. Bullet lists (- or * at line start)
  processed = processed.replace(/^[-*]\s+(.+)$/gm, '<span class="md-bullet">•</span> $1');

  // 8. Newlines → <br>
  processed = processed.replace(/\n/g, '<br>');

  // 9. Restore code blocks (with HTML-escaped content)
  processed = processed.replace(/\u0000CODEBLOCK(\d+)\u0000/g, function (m, idx) {
    const entry = codeBlocks[parseInt(idx, 10)];
    const escaped = entry.code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langLabel = entry.lang
      ? '<span class="code-lang">' + entry.lang + '</span>' : '';
    return '<div class="code-block">' + langLabel + '<pre><code>' + escaped + '</code></pre></div>';
  });

  return processed;
}

/* -----------------------------------------
   autoResize — auto-grow textarea height
   ----------------------------------------- */
function autoResize(textarea) {
  textarea.style.height = 'auto';
  const newHeight = Math.min(textarea.scrollHeight, 160);
  textarea.style.height = newHeight + 'px';
}

/* -----------------------------------------
   Chat state (per page)
   ----------------------------------------- */
let chatState = {
  config: null,
  history: [],          // array of {role, content}
  systemPrompt: '',     // prepended to first user msg
  isSending: false
};

/* -----------------------------------------
   addMessage — render a message bubble
   role: 'user' | 'ai' | 'thinking'
   content: raw text (will be formatted for ai)
   returns the message element
   ----------------------------------------- */
function addMessage(role, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return null;

  const msg = document.createElement('div');
  msg.className = 'message ' + role;

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? 'You' : (role === 'ai' ? 'KnoW' : 'KnoW');

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';

  if (role === 'ai') {
    bubble.innerHTML = formatText(content);
  } else if (role === 'thinking') {
    bubble.textContent = 'Thinking...';
  } else {
    // user — escape HTML, preserve line breaks
    const escaped = String(content)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = escaped;
  }

  msg.appendChild(label);
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return msg;
}

/* -----------------------------------------
   showEmptyState / hideEmptyState
   ----------------------------------------- */
function showEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'flex';

  // Remove all message elements
  const chatMessages = document.getElementById('chatMessages');
  if (chatMessages) {
    chatMessages.querySelectorAll('.message').forEach(function (m) { m.remove(); });
  }
}

function hideEmptyState() {
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.style.display = 'none';
}

/* -----------------------------------------
   clearChat — reset history + show empty state
   ----------------------------------------- */
function clearChat() {
  chatState.history = [];
  showEmptyState();
}

/* -----------------------------------------
   sendMessage — main send handler
   ----------------------------------------- */
async function sendMessage() {
  if (chatState.isSending) return;

  const textarea = document.getElementById('messageInput');
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) return;

  // Hide empty state
  hideEmptyState();

  // Build user message — prepend system prompt to FIRST user message
  let userContent = text;
  if (chatState.history.length === 0 && chatState.systemPrompt) {
    userContent = chatState.systemPrompt + '\n\n' + text;
  }

  // Add user bubble (showing the raw text, not the system-prompt-prefixed version)
  addMessage('user', text);

  // Push to history (the actual content sent to AI includes system prompt on first msg)
  chatState.history.push({ role: 'user', content: userContent });

  // Clear input
  textarea.value = '';
  autoResize(textarea);

  // Disable send button
  chatState.isSending = true;
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // Show thinking indicator
  const thinkingMsg = addMessage('thinking', '');

  // Call Puter.js AI
  let aiText = '';
  try {
    if (typeof puter === 'undefined' || !puter.ai || !puter.ai.chat) {
      throw new Error('Puter.js not loaded');
    }
    const response = await puter.ai.chat(chatState.history);
    aiText =
      (response && response.message && response.message.content && response.message.content[0] && response.message.content[0].text) ||
      (typeof response === 'string' ? response : '') ||
      (response && response.message && response.message.content) ||
      'Something went wrong. Try again.';
  } catch (err) {
    aiText = 'Something went wrong. Try again.\n\nError: ' + (err && err.message ? err.message : String(err));
  }

  // Remove thinking indicator
  if (thinkingMsg && thinkingMsg.parentNode) {
    thinkingMsg.parentNode.removeChild(thinkingMsg);
  }

  // Add AI message
  addMessage('ai', aiText);
  chatState.history.push({ role: 'assistant', content: aiText });

  // Re-enable send button
  chatState.isSending = false;
  if (sendBtn) sendBtn.disabled = false;
}

/* -----------------------------------------
   handleKeydown — Enter to send, Shift+Enter newline
   ----------------------------------------- */
function handleKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

/* -----------------------------------------
   initChat — initialize a chat page
   config = {
     toolLabel, emptyTitle, emptySubtitle,
     systemPrompt, quickPrompts: [..]
   }
   ----------------------------------------- */
function initChat(config) {
  chatState.config = config;
  chatState.systemPrompt = config.systemPrompt;
  chatState.history = [];

  // Render quick prompt chips
  const quickPromptsContainer = document.getElementById('quickPrompts');
  if (quickPromptsContainer && config.quickPrompts) {
    config.quickPrompts.forEach(function (prompt) {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = prompt;
      chip.addEventListener('click', function () {
        const textarea = document.getElementById('messageInput');
        if (textarea) {
          textarea.value = prompt;
          autoResize(textarea);
          textarea.focus();
        }
        sendMessage();
      });
      quickPromptsContainer.appendChild(chip);
    });
  }

  // Wire up textarea
  const textarea = document.getElementById('messageInput');
  if (textarea) {
    textarea.addEventListener('input', function () { autoResize(textarea); });
    textarea.addEventListener('keydown', handleKeydown);
  }

  // Wire up send button
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // Wire up clear button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearChat);
  }
}

/* -----------------------------------------
   On DOM ready — initialize mobile menu
   (chat pages call initChat themselves)
   ----------------------------------------- */
document.addEventListener('DOMContentLoaded', function () {
  initMobileMenu();
});
