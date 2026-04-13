import { discoverChrome } from './discovery'
import { CDPOptions, CDPResponse, PendingRequest } from '../types'

export class CDP {
  protected options: Required<CDPOptions>
  private ws: WebSocket | null = null
  private cmdID = 0
  private connectingPromise: Promise<void> | null = null
  protected sessions = new Map<string, string>()
  private pendingRequests = new Map<number, PendingRequest>()

  private activeWsPath: string | null = null

  constructor(options: CDPOptions = {}) {
    this.options = {
      port: options.port || 0,
      host: options.host || '127.0.0.1',
      timeout: options.timeout || 30000,
    }
  }

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.connectingPromise) return this.connectingPromise

    this.connectingPromise = (async () => {
      const isLocal =
        this.options.host === '127.0.0.1' || this.options.host === 'localhost'

      if (this.options.port === 0 && isLocal) {
        const info = await discoverChrome()
        if (!info)
          throw new Error(
            'Chrome not found locally. Ensure it runs with --remote-debugging-port'
          )
        this.options.port = info.port
        this.activeWsPath = info.wsPath
      } else if (this.options.port === 0) {
        this.options.port = 9222
      }

      const url = this.activeWsPath
        ? `ws://${this.options.host}:${this.options.port}${this.activeWsPath}`
        : `ws://${this.options.host}:${this.options.port}/devtools/browser`

      return new Promise<void>((resolve, reject) => {
        const connTimer = setTimeout(() => {
          reject(
            new Error(
              `Connection to ${url} timed out after ${this.options.timeout}ms`
            )
          )
        }, this.options.timeout)

        const socket = new globalThis.WebSocket(url)

        socket.addEventListener(
          'open',
          () => {
            clearTimeout(connTimer)
            this.ws = socket
            this.connectingPromise = null
            resolve()
          },
          { once: true }
        )

        socket.addEventListener(
          'error',
          (e: any) => {
            clearTimeout(connTimer)
            this.connectingPromise = null
            reject(new Error(e.message || 'WebSocket handshake failed'))
          },
          { once: true }
        )

        socket.onmessage = (event) => this.handleMessage(event)
        socket.onclose = () => this.handleClose()
      })
    })()

    return this.connectingPromise
  }

  private handleMessage(event: MessageEvent) {
    const data: CDPResponse = JSON.parse(event.data.toString())

    if (data.method === 'Target.attachedToTarget') {
      this.sessions.set(data.params.targetInfo.targetID, data.params.sessionID)
    } else if (data.method === 'Target.detachedFromTarget') {
      for (const [tid, sid] of this.sessions.entries()) {
        if (sid === data.params.sessionID) {
          this.sessions.delete(tid)
          break
        }
      }
    }

    if (data.id && this.pendingRequests.has(data.id)) {
      const req = this.pendingRequests.get(data.id)!
      clearTimeout(req.timer)
      this.pendingRequests.delete(data.id)
      data.error ? req.reject(new Error(data.error.message)) : req.resolve(data)
    }
  }

  private handleClose() {
    this.pendingRequests.forEach((req) =>
      req.reject(new Error(`Connection closed during ${req.method}`))
    )
    this.pendingRequests.clear()
    this.sessions.clear()
    this.ws = null
  }

  async send<T = any>(
    method: string,
    params: object = {},
    sessionID?: string
  ): Promise<CDPResponse<T>> {
    await this.connect()
    return new Promise((resolve, reject) => {
      const id = ++this.cmdID
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(
          new Error(
            `CDP Command [${method}] timed out after ${this.options.timeout}ms`
          )
        )
      }, this.options.timeout)

      this.pendingRequests.set(id, { resolve, reject, timer, method })
      this.ws!.send(
        JSON.stringify({ id, method, params, ...(sessionID && { sessionID }) })
      )
    })
  }

  async getSession(targetID: string): Promise<string> {
    const existing = this.sessions.get(targetID)
    if (existing) return existing
    const res = await this.send('Target.attachToTarget', {
      targetID,
      flatten: true,
    })
    const sid = res.result.sessionID
    this.sessions.set(targetID, sid)
    return sid
  }
}
