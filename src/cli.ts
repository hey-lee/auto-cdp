#!/usr/bin/env node

import fs from 'node:fs'
import { AutoCDP } from '.'
import { Command } from 'commander'

const program = new Command()
const cdp = new AutoCDP()

program
  .name('auto-cdp')
  .description('CLI tool for Agents to control Chrome via CDP')
  .version('1.0.0')
  .option('-p, --port <number>', 'Chrome debugging port', (v) =>
    parseInt(v, 10)
  )
  .option('-j, --json', 'Output raw JSON only', false)


const output = (data: any) => {
  console.log(JSON.stringify(data, null, 2))
}

/**
 * Command: List all open pages
 */
program
  .command('list')
  .description('List all available browser tabs')
  .action(async () => {
    try {
      const pages = await cdp.listPages()
      output(pages)
      process.exit(0)
    } catch (err: any) {
      output({ error: err.message })
      process.exit(1)
    }
  })

/**
 * Command: Create a new tab and navigate
 */
program
  .command('new')
  .description('Open a new tab and wait for load')
  .argument('<url>', 'URL to navigate to')
  .action(async (url) => {
    try {
      const page = await cdp.newPage(url)
      output({ targetId: page.targetID, status: 'loaded' })
      process.exit(0)
    } catch (err: any) {
      output({ error: err.message })
      process.exit(1)
    }
  })

/**
 * Command: Evaluate JavaScript
 */
program
  .command('eval')
  .description('Execute JavaScript in a specific tab')
  .requiredOption('-t, --target <id>', 'Target tab ID')
  .argument('<script>', 'JS code to run')
  .action(async (script, options) => {
    try {
      const page = await cdp.getPage(options.target)
      const result = await page.evaluate(script)
      output({ result })
      process.exit(0)
    } catch (err: any) {
      output({ error: err.message })
      process.exit(1)
    }
  })

/**
 * Command: Screenshot
 */
program
  .command('screenshot')
  .description('Take a screenshot of a tab')
  .requiredOption('-t, --target <id>', 'Target tab ID')
  .option('-o, --out <path>', 'Output file path', 'screenshot.png')
  .action(async (options) => {
    try {
      const page = await cdp.getPage(options.target)
      const buffer = await page.screenshot()
      fs.writeFileSync(options.out, buffer)
      output({ path: options.out, size: buffer.length })
      process.exit(0)
    } catch (err: any) {
      output({ error: err.message })
      process.exit(1)
    }
  })

program.parse()
