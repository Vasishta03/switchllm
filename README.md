# SwitchLLM 🔄

**Seamlessly transfer conversation context from Claude to ChatGPT or Gemini — with one click.**

A free, open-source Firefox extension that lets you grab your Claude conversation and continue it in ChatGPT or Gemini without copy-pasting walls of text.

---

## Features

- **One-click grab** — Extract your full conversation from Claude
- **Instant transfer** — Send context to ChatGPT or Gemini
- **Smart formatting** — Conversations are formatted as a structured handoff prompt
- **Privacy-first** — Everything stays in your browser. No servers, no accounts, no tracking.
- **100% free** — No paid tiers, no subscriptions, no limits.

---

## Installation (Firefox)

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/Vasishta03/switchllm.git
   ```

2. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```

3. Click **"Load Temporary Add-on..."**

4. Select the `manifest.json` file from the cloned directory.

5. The SwitchLLM icon will appear in your toolbar. You're ready to go!

### From Firefox Add-ons (Coming Soon)

Will be published to [addons.mozilla.org](https://addons.mozilla.org) once stable.

---

## Usage

1. **Open a conversation on [claude.ai](https://claude.ai)**
2. **Click the SwitchLLM icon** in your browser toolbar
3. **Click "Grab from Claude"** — the extension extracts the conversation
4. **Click "Send to ChatGPT"** or **"Send to Gemini"** — it opens the target and pastes the context
5. **Review and send** — hit Enter to continue the conversation!

---

## How It Works

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Claude.ai  │ ──► │  SwitchLLM   │ ──► │ ChatGPT/Gemini  │
│ (source)    │     │  (browser    │     │ (target)        │
│             │     │   storage)   │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
```

1. **Content script on Claude** reads the DOM to extract messages
2. **Popup** stores the formatted context in `browser.storage.local`
3. **Background script** opens/finds the target tab
4. **Content script on target** injects the context into the input field

---

## Project Structure

```
switchllm/
├── manifest.json          # Extension manifest (MV2, Firefox)
├── background/
│   └── background.js      # Tab coordination & messaging
├── content/
│   ├── claude.js          # Extract conversation from Claude
│   ├── chatgpt.js         # Inject context into ChatGPT
│   └── gemini.js          # Inject context into Gemini
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles (dark theme)
│   └── popup.js           # Popup logic
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── README.md
```

---

## Known Limitations

- **DOM-dependent**: Claude, ChatGPT, and Gemini frequently update their UIs. Selectors may need updating when sites change.
- **Large conversations**: Very long conversations may exceed the target AI's input limit. A summarization feature is planned.
- **One direction**: Currently Claude → others. Support for other source AIs is planned.

---

## Roadmap

- [ ] Summarize/truncate long conversations to fit context windows
- [ ] Support more source AIs (ChatGPT → Claude, Gemini → Claude, etc.)
- [ ] Conversation history/log
- [ ] Firefox Add-ons store listing
- [ ] Optional Chrome Web Store port
- [ ] Keyboard shortcuts

---

## Contributing

Contributions welcome! Feel free to open issues or submit PRs.

---

## License

MIT License. Free forever.

---

**Made with ❤️ by [Vasishta03](https://github.com/Vasishta03)**
