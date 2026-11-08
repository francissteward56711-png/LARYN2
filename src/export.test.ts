import { beforeEach, expect, test, vi } from 'vitest'
import { Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { download } from './export'

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }))
vi.mock('@capacitor/filesystem', () => ({
  Directory: { Cache: 'CACHE' },
  Encoding: { UTF8: 'utf8' },
  Filesystem: { writeFile: vi.fn(), deleteFile: vi.fn() },
}))
vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///cache/recording.csv' })
  vi.mocked(Filesystem.deleteFile).mockResolvedValue()
  vi.mocked(Share.share).mockResolvedValue({ activityType: 'save' })
})
test('shares a UTF-8 CSV file then removes the temporary copy', async () => {
  await download('laryn-recording.csv', 'timestamp_ms,ax\n0,1\n')
  expect(Filesystem.writeFile).toHaveBeenCalledWith(
    expect.objectContaining({
      directory: 'CACHE',
      data: 'timestamp_ms,ax\n0,1\n',
      encoding: 'utf8',
    }),
  )
  expect(Share.share).toHaveBeenCalledWith({
    title: 'laryn-recording.csv',
    url: 'file:///cache/recording.csv',
  })
  expect(Filesystem.deleteFile).toHaveBeenCalledWith({
    path: vi.mocked(Filesystem.writeFile).mock.calls[0][0].path,
    directory: 'CACHE',
  })
})
test('closing the share sheet is not an export failure and still cleans up', async () => {
  vi.mocked(Share.share).mockRejectedValue(new Error('Share canceled'))
  await expect(download('recording.csv', 'data')).resolves.toBeUndefined()
  expect(Filesystem.deleteFile).toHaveBeenCalledOnce()
})
test('real share failures reach the UI and still clean up the file', async () => {
  vi.mocked(Share.share).mockRejectedValue(new Error('Error sharing item'))
  await expect(download('recording.csv', 'data')).rejects.toThrow('Error sharing item')
  expect(Filesystem.deleteFile).toHaveBeenCalledOnce()
})
