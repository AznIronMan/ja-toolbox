# JA-Toolbox

A Chrome extension providing a collection of handy text editing tools for [JustAnswer](https://www.justanswer.com/)-related productivity tasks. It is designed to be used in conjunction with [ChatGPT](https://chatgpt.com/). This extension was designed for personal use and is not affiliated with JustAnswer or ChatGPT. It is being shared as it might be useful for others.

## Features

The extension provides several text manipulation tools accessible from the browser toolbar:

- **JA-MarkdownStrip**: Removes Markdown formatting from text in editable areas
- **GPT-Prompt**: Inserts pre-configured GPT prompts into text fields
- **JA-IntroStrip**: Removes standard introduction text
- **JA-BonusStrip**: Removes bonus suggestion text
- **JA-GeneralText**: Inserts general solution text template
- **JA-Language**: Inserts language revision reminder

## Installation

### Load Unpacked Extension (Development)

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension icon should appear in your browser toolbar

### ~~Install from Chrome Web Store~~ (When Available)

1. ~~Visit the Chrome Web Store page for JA-Toolbox~~
2. ~~Click "Add to Chrome"~~
3. ~~Confirm the installation when prompted~~

## Usage

1. Click the JA-Toolbox icon in your browser toolbar to open the popup menu
2. Select the desired text manipulation tool:
   - Use JA-MarkdownStrip to remove Markdown formatting from selected text
     - Designed to strip markdown formatting when copying from a source into the JustAnswer chat window.
   - Use GPT-Prompt to insert pre-configured prompts
     - Designed to insert a pre-configured prompt into the ChatGPT chat window.
   - Use JA-IntroStrip to remove standard introduction text
     - Designed to remove the standard introduction text from the JustAnswer chat window.
   - Use JA-BonusStrip to remove bonus suggestion text
     - Designed to remove the bonus suggestion text from the JustAnswer chat window.
   - Use JA-GeneralText to insert general solution text
     - Designed to insert the general solution text template into the ChatGPT chat window.
   - Use JA-Language to insert language revision reminder
     - Designed to insert a language revision reminder into the ChatGPT chat window.

## Development

The extension consists of the following key files:

- `manifest.json`: Extension configuration
- `popup.html`: The popup UI
- `popup.js`: JavaScript for the popup functionality
- `content.js`: Content script that interacts with the webpage
- `content.json.template`: Contains templates and prompts used by the extension.
  - `content.json.template` is a template for `content.json`.
  - `content.json` is the file that is actually used by the extension.
  - `content.json` will need to have (insert your username here) replaced with your actual username.

## License

MIT License

Copyright (c) 2025 Clark & Burke, LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Support

Email: [streetkings@cnb.llc](mailto:streetkings@cnb.llc)
