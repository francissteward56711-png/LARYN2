import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech'

// A previous utterance can finish after the user has started another one.
// Only the current request may update the playback controls.
export function createNativeSpeech(callbacks: {
  onStart: () => void
  onEnd: () => void
  onError: () => void
}) {
  let generation = 0
  return {
    async speak(text: string, lang: string, rate: number) {
      const current = ++generation
      try {
        await TextToSpeech.stop()
        if (current !== generation) return
        const { supported } = await TextToSpeech.isLanguageSupported({ lang })
        if (current !== generation) return
        if (!supported) throw new Error('Voice unavailable')
        callbacks.onStart()
        await TextToSpeech.speak({
          text,
          lang,
          rate,
          category: 'playback',
          queueStrategy: QueueStrategy.Flush,
        })
        if (current === generation) callbacks.onEnd()
      } catch {
        if (current === generation) {
          callbacks.onEnd()
          callbacks.onError()
        }
      }
    },
    stop() {
      generation++
      callbacks.onEnd()
      void TextToSpeech.stop().catch(callbacks.onError)
    },
    dispose() {
      generation++
      void TextToSpeech.stop().catch(() => {})
    },
  }
}

export async function nativeVoices() {
  return (await TextToSpeech.getSupportedVoices()).voices
}
