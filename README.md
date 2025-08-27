# ReplyMate

ReplyMate is a helpful friend that lives in your browser and helps you write better replies on LinkedIn.

## What does it do?

When you want to reply to someone's post on LinkedIn, ReplyMate adds a special button that asks a smart robot to help write a good answer for you.

## How to install it

1. Download the extension file 
2. Go to chrome://extensions in your browser
3. Turn on "Developer mode" and click "Load unpacked"

## How to use it

1. Go to LinkedIn
2. Find a post you want to reply to
3. Look for the "Generate Reply" button
4. Click it and wait for the smart robot to think
5. Copy the reply or click to add it automatically

## How it works

```
LinkedIn Post -> You click button -> Extension asks AI -> AI thinks -> Extension shows answer

[LinkedIn] --click--> [Extension] --ask--> [AI Brain]
                         ^                     |
                      display  <---answer-----
```

## For developers

To build from source:
```
npm install
npm run build
```

The extension will be ready in the `dist/` folder.

## Files in this project

- `src/background.ts` - The smart robot brain that generates replies
- `src/linkedin-content.ts` - The helper that works on LinkedIn pages  
- `src/popup.ts` - Simple chat window for testing
- `src/styles.css` - How everything looks
- `src/manifest.json` - Extension settings

## Privacy

Everything works on your computer. No information is sent anywhere else.
