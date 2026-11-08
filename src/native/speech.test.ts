import { beforeEach, expect, test, vi } from 'vitest'
import { TextToSpeech } from '@capacitor-community/text-to-speech'
import { createNativeSpeech } from './speech'

vi.mock('@capacitor-community/text-to-speech', () => ({
  QueueStrategy: { Flush: 0 },
  TextToSpeech: { stop: vi.fn(), speak: vi.fn(), isLanguageSupported: vi.fn() },
}))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(TextToSpeech.stop).mockResolvedValue()
  vi.mocked(TextToSpeech.speak).mockResolvedValue()
  vi.mocked(TextToSpeech.isLanguageSupported).mockResolvedValue({ supported: true })
})
function setup() {
  const callbacks = { onStart: vi.fn(), onEnd: vi.fn(), onError: vi.fn() }
  return { callbacks, speech: createNativeSpeech(callbacks) }
}
test('uses the requested Thai voice, rate and native playback, then releases the controls', async () => {
  const { speech, callbacks } = setup()
  await speech.speak('ขอน้ำหน่อย', 'th-TH', 0.9)
  expect(TextToSpeech.speak).toHaveBeenCalledWith(
    expect.objectContaining({
      text: 'ขอน้ำหน่อย',
      lang: 'th-TH',
      rate: 0.9,
      category: 'playback',
    }),
  )
  expect(callbacks.onStart).toHaveBeenCalledOnce()
  expect(callbacks.onEnd).toHaveBeenCalledOnce()
  expect(callbacks.onError).not.toHaveBeenCalled()
})
test('a stopped request cannot start speaking after language lookup finishes', async () => {
  let finish!: (value: { supported: boolean }) => void
  vi.mocked(TextToSpeech.isLanguageSupported).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  const { speech, callbacks } = setup()
  const pending = speech.speak('Water please', 'en-US', 1)
  await vi.waitFor(() => expect(TextToSpeech.isLanguageSupported).toHaveBeenCalled())
  speech.stop()
  finish({ supported: true })
  await pending
  expect(TextToSpeech.speak).not.toHaveBeenCalled()
  expect(callbacks.onStart).not.toHaveBeenCalled()
})
test('an old completion cannot stop the newer speech indicator', async () => {
  const finishes: (() => void)[] = []
  vi.mocked(TextToSpeech.speak).mockImplementation(
    () =>
      new Promise((resolve) => {
        finishes.push(resolve)
      }),
  )
  const { speech, callbacks } = setup()
  const first = speech.speak('First', 'en-US', 1)
  await vi.waitFor(() => expect(finishes).toHaveLength(1))
  const second = speech.speak('Second', 'en-US', 1)
  await vi.waitFor(() => expect(finishes).toHaveLength(2))
  finishes[0]()
  await first
  expect(callbacks.onEnd).not.toHaveBeenCalled()
  finishes[1]()
  await second
  expect(callbacks.onEnd).toHaveBeenCalledOnce()
})
test('reports an unavailable voice without attempting the wrong language', async () => {
  vi.mocked(TextToSpeech.isLanguageSupported).mockResolvedValue({ supported: false })
  const { speech, callbacks } = setup()
  await speech.speak('ขอน้ำหน่อย', 'th-TH', 1)
  expect(TextToSpeech.speak).not.toHaveBeenCalled()
  expect(callbacks.onError).toHaveBeenCalledOnce()
})
