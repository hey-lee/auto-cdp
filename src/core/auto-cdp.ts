
import { CDP } from './cdp'
import { Page } from './page'
import { CDPOptions } from '../types'

export class AutoCDP extends CDP {
  constructor(options?: CDPOptions) {
    super(options)
  }

  async getPage(targetID: string): Promise<Page> {
    const sessionID = await this.getSession(targetID)
    return new Page(this, targetID, sessionID)
  }

  async newPage(url: string = 'about:blank'): Promise<Page> {
    const res = await this.send('Target.createTarget', { url })
    const targetID = res.result.targetID
    const page = await this.getPage(targetID)
    if (url !== 'about:blank') await page.waitLoad()
    return page
  }

  async listPages(): Promise<any[]> {
    const res = await this.send('Target.getTargets')
    return res.result.targetInfos.filter((t: any) => t.type === 'page')
  }
}
