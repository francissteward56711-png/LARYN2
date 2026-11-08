import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { CheckCircle2, Download, RefreshCw, Share, Smartphone, WifiOff } from 'lucide-react'
import type { Language } from '../data'

export function usePwa() {
  const native = Capacitor.isNativePlatform()
  const [cached, setCached] = useState(false)
  const [registrationFailed, setRegistrationFailed] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [updating, setUpdating] = useState(false)
  const [updateFailed, setUpdateFailed] = useState(false)
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration?.active) setCached(true)
    },
    onRegisterError() {
      setRegistrationFailed(true)
    },
  })
  useEffect(() => {
    const mode = window.matchMedia('(display-mode: standalone)')
    const updateInstalled = () =>
      setInstalled(mode.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone)
    const updateOnline = () => setOnline(navigator.onLine)
    updateInstalled()
    mode.addEventListener('change', updateInstalled)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      mode.removeEventListener('change', updateInstalled)
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])
  async function reload() {
    setUpdating(true)
    setUpdateFailed(false)
    try {
      await updateServiceWorker(true)
    } catch {
      setUpdateFailed(true)
      setUpdating(false)
    }
  }
  return {
    native,
    cached: native || cached || offlineReady,
    registrationFailed,
    installed: native || installed,
    online,
    needRefresh,
    updating,
    updateFailed,
    reload,
    dismissUpdate: () => setNeedRefresh(false),
  }
}
export type PwaState = ReturnType<typeof usePwa>

export function InstallCard({ language, state }: { language: Language; state: PwaState }) {
  const tr = (en: string, th: string) => (language === 'en' ? en : th)
  return (
    <section className="panel install-card" aria-labelledby="install-title">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{tr('TAKE LARYN WITH YOU', 'พก LARYN ไปกับคุณ')}</div>
          <h2 id="install-title">{tr('LARYN on your iPhone', 'LARYN บน iPhone ของคุณ')}</h2>
        </div>
        <Smartphone size={24} />
      </div>
      {state.installed ? (
        <p className="install-status">
          <CheckCircle2 size={18} />
          {tr('Opened as an installed app.', 'เปิดใช้งานในรูปแบบแอปแล้ว')}
        </p>
      ) : (
        <>
          <p className="panel-intro">
            {tr(
              'Add LARYN to your Home Screen for its own icon and a full-screen window. No App Store download is needed.',
              'เพิ่ม LARYN บนหน้าจอโฮมเพื่อเปิดใช้งานเต็มหน้าจอผ่านไอคอนแอป โดยไม่ต้องดาวน์โหลดจาก App Store',
            )}
          </p>
          <ol className="install-steps">
            <li>
              <span>1</span>
              <p>
                {tr(
                  'Open your hosted LARYN link in Safari on iPhone or iPad.',
                  'เปิดลิงก์เว็บไซต์ LARYN ที่เผยแพร่แล้วใน Safari บน iPhone หรือ iPad',
                )}
              </p>
            </li>
            <li>
              <span>2</span>
              <p>
                <Share size={15} />
                {tr(
                  'Tap Share, then Add to Home Screen. If shown, turn on Open as Web App.',
                  'แตะแชร์ แล้วเลือกเพิ่มไปยังหน้าจอโฮม หากมีตัวเลือก เปิดเป็นเว็บแอป ให้เปิดใช้งาน',
                )}
              </p>
            </li>
            <li>
              <span>3</span>
              <p>
                {tr(
                  'Tap Add, then launch LARYN from its new icon.',
                  'แตะเพิ่ม แล้วเปิด LARYN จากไอคอนใหม่บนหน้าจอโฮม',
                )}
              </p>
            </li>
          </ol>
        </>
      )}
      <div className="offline-status">
        <span className="soft-icon">
          {state.cached ? <CheckCircle2 size={20} /> : <Download size={20} />}
        </span>
        <div>
          <strong>
            {state.native
              ? tr('Included in the app', 'พร้อมใช้งานในแอป')
              : state.cached
                ? tr('Saved for offline opening', 'บันทึกสำหรับเปิดออฟไลน์แล้ว')
                : tr('Offline access', 'การใช้งานออฟไลน์')}
          </strong>
          <p>
            {state.native
              ? tr(
                  'Your screens and demo open without a website. Speech uses your iPhone’s voices; additional voices may need an internet connection to download.',
                  'เปิดหน้าแอปและข้อมูลสาธิตได้โดยไม่ต้องโหลดเว็บไซต์ การอ่านออกเสียงใช้เสียงของ iPhone การดาวน์โหลดเสียงเพิ่มเติมอาจต้องใช้อินเทอร์เน็ต',
                )
              : state.registrationFailed
                ? tr(
                    'The offline copy could not be saved. Try reloading while connected to the internet.',
                    'บันทึกสำเนาออฟไลน์ไม่สำเร็จ ลองโหลดใหม่ขณะเชื่อมต่ออินเทอร์เน็ต',
                  )
                : state.cached
                  ? tr(
                      'This device has a copy of the app pages and demo. iPhone speech voices may still need internet access.',
                      'อุปกรณ์นี้มีสำเนาหน้าแอปและข้อมูลสาธิตแล้ว เสียงอ่านบน iPhone อาจยังต้องใช้อินเทอร์เน็ต',
                    )
                  : tr(
                      'Open the hosted app once while online and let it finish loading. Availability depends on your browser keeping the saved copy.',
                      'เปิดแอปที่เผยแพร่แล้วขณะออนไลน์และรอให้โหลดเสร็จ การเปิดออฟไลน์ขึ้นอยู่กับการเก็บสำเนาของเบราว์เซอร์',
                    )}
          </p>
        </div>
      </div>
      <p className="subtle-note">
        {tr(
          'Custom phrases belong to this browser or installed app; they do not sync between devices. Recordings and alert history clear when the app reloads.',
          'ข้อความที่เพิ่มเป็นของเบราว์เซอร์หรือแอปที่ติดตั้งนี้ ยังไม่ซิงก์ข้ามอุปกรณ์ ข้อมูลนำเข้าและประวัติแจ้งเตือนจะล้างเมื่อโหลดแอปใหม่',
        )}
      </p>
    </section>
  )
}

export function PwaNotice({ language, state }: { language: Language; state: PwaState }) {
  const tr = (en: string, th: string) => (language === 'en' ? en : th)
  return (
    <>
      {!state.online && (
        <div className="info-strip offline-banner" role="status">
          <WifiOff size={19} />
          <p>
            {state.cached
              ? tr(
                  'You’re offline. Saved app pages and demo data are available; no remote alerts are connected.',
                  'คุณออฟไลน์อยู่ ยังเปิดหน้าแอปและข้อมูลสาธิตที่บันทึกไว้ได้ แต่ยังไม่มีการเชื่อมต่อแจ้งเตือนภายนอก',
                )
              : tr(
                  'You’re offline. Keep this page open; an offline copy has not been confirmed.',
                  'คุณออฟไลน์อยู่ โปรดเปิดหน้านี้ไว้ ยังไม่ยืนยันว่ามีสำเนาสำหรับเปิดออฟไลน์',
                )}
          </p>
        </div>
      )}
      {state.needRefresh && (
        <section
          className="pwa-update"
          role="status"
          aria-label={tr('App update available', 'มีอัปเดตแอป')}
        >
          <RefreshCw size={20} />
          <div>
            <strong>{tr('A new version is ready', 'แอปเวอร์ชันใหม่พร้อมแล้ว')}</strong>
            <p>
              {tr(
                'Reloading clears the current recording and alert history. Saved phrases will stay.',
                'การโหลดใหม่จะล้างข้อมูลนำเข้าและประวัติแจ้งเตือน ข้อความที่บันทึกไว้ยังคงอยู่',
              )}
            </p>
            {state.updateFailed && (
              <p className="update-error">
                {tr(
                  'Update failed. Try again when online.',
                  'อัปเดตไม่สำเร็จ ลองอีกครั้งเมื่อออนไลน์',
                )}
              </p>
            )}
          </div>
          <div className="button-row">
            <button
              className="button button-white"
              disabled={state.updating}
              onClick={state.dismissUpdate}
            >
              {tr('Later', 'ภายหลัง')}
            </button>
            <button
              className="button button-primary"
              disabled={state.updating}
              onClick={() => void state.reload()}
            >
              {state.updating ? tr('Reloading…', 'กำลังโหลด…') : tr('Reload app', 'โหลดแอปใหม่')}
            </button>
          </div>
        </section>
      )}
    </>
  )
}
