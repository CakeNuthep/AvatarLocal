import { expect, test } from 'vitest'
import viteConfig from '../vite.config'

test('Vite config should contain proxy configuration for Ollama and TTS', () => {
  expect(viteConfig).toHaveProperty('server')
  expect(viteConfig.server).toHaveProperty('proxy')
  expect(viteConfig.server?.proxy).toHaveProperty('/api/ollama')
  expect(viteConfig.server?.proxy).toHaveProperty('/api/tts')

  const proxyConfig = viteConfig.server?.proxy as Record<string, { target: string }>
  const ollamaProxy = proxyConfig['/api/ollama']
  const ttsProxy = proxyConfig['/api/tts']

  expect(ollamaProxy.target).toBe('http://127.0.0.1:11434')
  expect(ttsProxy.target).toBe('http://127.0.0.1:5002')
})
