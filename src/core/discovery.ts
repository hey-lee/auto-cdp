import fs from 'node:fs'
import os from 'node:os'
import net from 'node:net'
import path from 'node:path'
import { ChromeDiscovery } from '../types'

const MAYBE_PORTS = [9222, 9229, 9333]

export const isPortOpen = (
  port: number,
  host: string = '127.0.0.1'
): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = net.createConnection(port, host)
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, 1500)
    socket.once('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.once('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

export async function discoverChrome(): Promise<ChromeDiscovery | null> {
  const home = os.homedir()
  const paths: string[] = []
  const platform = os.platform()

  if (platform === 'darwin') {
    paths.push(
      path.join(
        home,
        'Library/Application Support/Google/Chrome/DevToolsActivePort'
      )
    )
  } else if (platform === 'win32') {
    paths.push(
      path.join(
        process.env.LOCALAPPDATA || '',
        'Google/Chrome/User Data/DevToolsActivePort'
      )
    )
  } else {
    paths.push(path.join(home, '.config/google-chrome/DevToolsActivePort'))
  }

  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const lines = fs.readFileSync(p, 'utf-8').trim().split('\n')
        const port = parseInt(lines[0] || '0', 10)
        if (port > 0 && (await isPortOpen(port))) {
          return { port, wsPath: lines[1] || null }
        }
      }
    } catch {
      continue
    }
  }

  for (const port of MAYBE_PORTS) {
    if (await isPortOpen(port)) return { port, wsPath: null }
  }
  return null
}
