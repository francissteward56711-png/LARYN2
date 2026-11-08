import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { localId } from './data'

export async function download(name: string, text: string, type = 'text/csv;charset=utf-8') {
  if (Capacitor.isNativePlatform()) {
    const path = `${localId()}-${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { uri } = await Filesystem.writeFile({
      path,
      directory: Directory.Cache,
      data: text,
      encoding: Encoding.UTF8,
    })
    try {
      await Share.share({ title: name, url: uri })
    } catch (error) {
      // The iOS share plugin rejects when the user closes the sheet normally.
      if (!(error instanceof Error && error.message === 'Share canceled')) throw error
    } finally {
      await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {})
    }
    return
  }
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
