import { CDP } from './cdp'

export class Page {
  constructor(
    private client: CDP,
    public readonly targetID: string,
    private sessionID: string
  ) {}

  async evaluate(expression: string): Promise<any> {
    const res = await this.client.send(
      'Runtime.evaluate',
      {
        expression,
        returnByValue: true,
        awaitPromise: true,
      },
      this.sessionID
    )
    return res.result.result.value
  }

  async screenshot(format: 'png' | 'jpeg' = 'png'): Promise<Buffer> {
    const res = await this.client.send(
      'Page.captureScreenshot',
      { format },
      this.sessionID
    )
    return Buffer.from(res.result.data, 'base64')
  }

  async waitLoad(timeout?: number): Promise<void> {
    await this.client.send('Page.enable', {}, this.sessionID)
    const start = Date.now()
    const limit = timeout || 15000
    while (Date.now() - start < limit) {
      const res = await this.evaluate('document.readyState')
      if (res === 'complete') return
      await new Promise((r) => setTimeout(r, 400))
    }
    throw new Error('Page load timeout')
  }
}
