# auto-cdp

Automate your daily Chrome instance via a simple API. Zero external dependencies, native WebSocket support, and automatic port discovery.

## How It Works

`auto-cdp` connects to Chrome's DevTools Protocol (CDP) through the debugging port. It can automatically discover a locally running Chrome instance by reading `DevToolsActivePort` or probing common ports (9222, 9229, 9333), so you don't need to know the port ahead of time.

## Prerequisites

Launch Chrome with remote debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222
```

Or simply launch Chrome normally — `auto-cdp` will auto-discover the port if Chrome was started with `--remote-debugging-port`.

## Install

```bash
npm install auto-cdp
```

## CLI

```bash
npx auto-cdp <command> [options]
```

### Global Options

| Option | Description |
|--------|-------------|
| `-p, --port <number>` | Chrome debugging port |
| `-j, --json` | Output raw JSON only |

### Commands

#### List all open tabs

```bash
npx auto-cdp list
```

```json
[
  {
    "targetID": "ABC123",
    "type": "page",
    "title": "Google",
    "url": "https://google.com",
    "attached": false
  }
]
```

#### Open a new tab

```bash
npx auto-cdp new https://github.com
```

```json
{
  "targetId": "DEF456",
  "status": "loaded"
}
```

#### Evaluate JavaScript in a tab

```bash
npx auto-cdp eval -t ABC123 "document.title"
```

```json
{
  "result": "Google"
}
```

```bash
# Extract data from the page
npx auto-cdp eval -t ABC123 "JSON.stringify(Array.from(document.querySelectorAll('h1')).map(el => el.textContent))"
```

#### Take a screenshot

```bash
# Save to default path (screenshot.png)
npx auto-cdp screenshot -t ABC123

# Custom output path
npx auto-cdp screenshot -t ABC123 -o page.png
```

```json
{
  "path": "page.png",
  "size": 245891
}
```

## Programmatic API

### Basic Usage

```ts
import { AutoCDP } from 'auto-cdp'

const cdp = new AutoCDP()

// List all open tabs
const pages = await cdp.listPages()

// Open a new tab and wait for it to load
const page = await cdp.newPage('https://example.com')

// Run JS in the page
const title = await page.evaluate('document.title')
console.log(title) // "Example Domain"

// Take a screenshot
const buffer = await page.screenshot()
// buffer is a Node.js Buffer containing PNG data
```

### Connect to a Specific Host / Port

```ts
const cdp = new AutoCDP({
  port: 9222,
  host: '192.168.1.100',
  timeout: 10000, // ms
})
```

When `port` is omitted, auto-discovery runs locally. When `host` is non-local, port defaults to `9222`.

### Page Operations

```ts
// Get a reference to an existing tab by targetID
const page = await cdp.getPage('ABC123')

// Evaluate expressions
const url = await page.evaluate('location.href')
const links = await page.evaluate(`
  JSON.stringify(
    Array.from(document.querySelectorAll('a')).map(a => ({
      text: a.textContent,
      href: a.href
    }))
  )
`)

// Wait for page to finish loading
await page.waitLoad()

// Screenshot (PNG or JPEG)
const png = await page.screenshot('png')
const jpeg = await page.screenshot('jpeg')
```

### Send Raw CDP Commands

```ts
const cdp = new AutoCDP()

// Any CDP method works via send()
const { result } = await cdp.send('Target.getTargets')
const version = await cdp.send('Browser.getVersion')
```

See the [Chrome DevTools Protocol docs](https://chromedevtools.github.io/devtools-protocol/) for all available commands.

### Session-Scoped Commands

```ts
// Attach to a target and get a session ID
const sessionID = await cdp.getSession('ABC123')

// Send commands within that session
await cdp.send('Runtime.evaluate', {
  expression: 'document.title',
  returnByValue: true,
}, sessionID)
```

### Auto-Discovery

```ts
import { discoverChrome } from 'auto-cdp'

const info = await discoverChrome()
if (info) {
  console.log(info.port)   // e.g. 9222
  console.log(info.wsPath) // e.g. "/devtools/browser/..." or null
} else {
  console.log('No Chrome instance found')
}
```

Discovery checks in order:
1. `DevToolsActivePort` file (macOS, Linux, Windows)
2. Probing common ports (9222, 9229, 9333)

## API Reference

### `AutoCDP`

Extends `CDP`. High-level browser controller.

| Method | Returns | Description |
|--------|---------|-------------|
| `new AutoCDP(options?)` | `AutoCDP` | Create instance. `options`: `{ port?, host?, timeout? }` |
| `listPages()` | `Promise<TargetInfo[]>` | List all tabs |
| `newPage(url?)` | `Promise<Page>` | Open a new tab (defaults to `about:blank`) |
| `getPage(targetID)` | `Promise<Page>` | Attach to an existing tab |
| `send(method, params?, sessionID?)` | `Promise<CDPResponse>` | Send any CDP command |
| `getSession(targetID)` | `Promise<string>` | Get or create a session for a target |

### `Page`

Represents a browser tab.

| Method | Returns | Description |
|--------|---------|-------------|
| `evaluate(expression)` | `Promise<any>` | Run JS and return the result |
| `screenshot(format?)` | `Promise<Buffer>` | Capture screenshot (`'png'` or `'jpeg'`) |
| `waitLoad(timeout?)` | `Promise<void>` | Wait until `document.readyState === 'complete'` |

### `CDP`

Low-level CDP WebSocket client.

| Method | Returns | Description |
|--------|---------|-------------|
| `connect()` | `Promise<void>` | Establish WebSocket connection |
| `send(method, params?, sessionID?)` | `Promise<CDPResponse>` | Send a CDP command |

## License

MIT
