export interface CDPOptions {
  port?: number
  host?: string
  timeout?: number
}

export interface CDPResponse<T = any> {
  id?: number
  result?: T
  error?: { message: string; code: number }
  method?: string
  params?: any
}

export interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  timer: NodeJS.Timeout
  method: string
}

export interface ChromeDiscovery {
  port: number
  wsPath: string | null
}
