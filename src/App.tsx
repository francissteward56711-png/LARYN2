import { useEffect, useMemo, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { createNativeSpeech, nativeVoices } from './native/speech'
import { download } from './export'
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  CircleStop,
  Clock3,
  Cpu,
  Droplet,
  FileUp,
  Hand,
  Heart,
  LayoutDashboard,
  Leaf,
  MessageCircle,
  Mic2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Trash2,
  Volume2,
  Waves,
  WifiOff,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { AlertEvent, Language, Page, Phrase, Sample } from './data'
import {
  DEFAULT_PHRASES,
  DEMO_EVENTS,
  demoSamples,
  isPhraseList,
  localId,
  loadPreference,
  parseSensorCsv,
  summarize,
  toCsv,
} from './data'
import SignalChart from './components/SignalChart'
import Modal from './components/Modal'
import { InstallCard, PwaNotice, usePwa } from './components/Pwa'
const DEMO = demoSamples()
const ICONS: Record<string, LucideIcon> = {
  water: Droplet,
  hand: Hand,
  rest: Leaf,
  smile: Smile,
  heart: Heart,
  chat: MessageCircle,
}
const NAV: { id: Page; icon: LucideIcon; en: string; th: string }[] = [
  { id: 'overview', icon: LayoutDashboard, en: 'Overview', th: 'ภาพรวม' },
  { id: 'communication', icon: MessageCircle, en: 'Communication', th: 'การสื่อสาร' },
  { id: 'monitoring', icon: Activity, en: 'Swallowing', th: 'การกลืน' },
  { id: 'alerts', icon: Bell, en: 'Alerts', th: 'แจ้งเตือน' },
  { id: 'device', icon: Cpu, en: 'Device & data', th: 'อุปกรณ์' },
]
function Brand({ small = false }: { small?: boolean }) {
  return (
    <div className={`brand ${small ? 'brand-small' : ''}`}>
      <span className="brand-symbol">
        <AudioLines size={25} strokeWidth={2} />
      </span>
      <span>
        LARYN<span className="brand-ai">AI</span>
      </span>
    </div>
  )
}
function DeviceArt() {
  return (
    <div className="device-art" aria-hidden="true">
      <div className="device-orbit orbit-one" />
      <div className="device-orbit orbit-two" />
      <div className="sensor-patch">
        <i />
        <i />
        <i />
        <i />
        <div className="sensor-body">
          <AudioLines size={31} strokeWidth={1.6} />
          <span>LARYN</span>
          <b />
        </div>
      </div>
      <span className="device-art-dot dot-one" />
      <span className="device-art-dot dot-two" />
    </div>
  )
}
function PhraseButton({
  phrase,
  compact = false,
  language,
  onSpeak,
}: {
  phrase: Phrase
  compact?: boolean
  language: Language
  onSpeak: (text: string, spokenLanguage: Language) => void
}) {
  const Icon = ICONS[phrase.icon] ?? MessageCircle
  const spokenLanguage = phrase[language] ? language : language === 'en' ? 'th' : 'en'
  return (
    <button
      className={`phrase-card ${compact ? 'compact' : ''}`}
      onClick={() => onSpeak(phrase[language] || phrase.en || phrase.th, spokenLanguage)}
    >
      <span className={`phrase-icon ${phrase.icon}`}>
        <Icon size={compact ? 19 : 25} />
      </span>
      <span className="phrase-copy">
        <strong>{phrase[language] || phrase.en || phrase.th}</strong>
        <small>{phrase[language] ? (language === 'en' ? phrase.th : phrase.en) : ''}</small>
      </span>
      <Volume2 className="phrase-volume" size={17} />
    </button>
  )
}

function App() {
  const pwa = usePwa()
  const [language, setLanguage] = useState<Language>(() =>
    loadPreference('laryn-language', 'en', (v): v is Language => v === 'en' || v === 'th'),
  )
  const [page, setPage] = useState<Page>('overview')
  const [customPhrases, setCustomPhrases] = useState<Phrase[]>(() =>
    loadPreference('laryn-phrases', [], isPhraseList),
  )
  const [recording, setRecording] = useState<{ name: string; samples: Sample[] } | null>(null)
  const [running, setRunning] = useState(true)
  const [cursor, setCursor] = useState(0)
  const [windowSeconds, setWindowSeconds] = useState(60)
  const [alerts, setAlerts] = useState<AlertEvent[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all')
  const [modal, setModal] = useState<'phrase' | 'help' | 'guide' | null>(null)
  const [phraseEn, setPhraseEn] = useState('')
  const [phraseTh, setPhraseTh] = useState('')
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<{ text: string; at: number }[]>([])
  const [speed, setSpeed] = useState(0.9)
  const [speaking, setSpeaking] = useState(false)
  const [toast, setToast] = useState('')
  const [importError, setImportError] = useState('')
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const utterance = useRef<SpeechSynthesisUtterance | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const tr = (en: string, th: string) => (language === 'en' ? en : th)
  const isDemo = !recording
  const samples = recording?.samples ?? DEMO
  const stats = useMemo(() => summarize(samples), [samples])
  const phrases = [...DEFAULT_PHRASES, ...customPhrases]
  const openAlerts = alerts.filter((a) => a.status !== 'resolved')
  const visibleAlerts = alerts.filter(
    (a) =>
      filter === 'all' || (filter === 'open' ? a.status !== 'resolved' : a.status === 'resolved'),
  )
  const native = Capacitor.isNativePlatform()
  const speechAvailable =
    native || ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window)
  const nativeSpeech = useMemo(
    () =>
      createNativeSpeech({
        onStart: () => setSpeaking(true),
        onEnd: () => setSpeaking(false),
        onError: () =>
          setToast(
            language === 'th'
              ? 'เล่นเสียงไม่สำเร็จ กรุณาตรวจสอบเสียงและภาษาบนอุปกรณ์'
              : 'Voice playback failed. Check your device voices and sound settings.',
          ),
      }),
    [language],
  )
  const time = (at: number) =>
    new Intl.DateTimeFormat(language === 'th' ? 'th-TH' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(at)
  useEffect(() => {
    document.documentElement.classList.toggle('native-app', native)
    return () => document.documentElement.classList.remove('native-app')
  }, [native])
  useEffect(() => {
    document.documentElement.lang = language
    try {
      localStorage.setItem('laryn-language', JSON.stringify(language))
    } catch {
      /* Private browsing may block storage. */
    }
  }, [language])
  useEffect(() => {
    try {
      localStorage.setItem('laryn-phrases', JSON.stringify(customPhrases))
    } catch {
      /* Session still works without storage. */
    }
  }, [customPhrases])
  useEffect(() => {
    if (!running || recording) return
    const timer = window.setInterval(() => setCursor((c) => (c + 0.25) % 60), 250)
    return () => window.clearInterval(timer)
  }, [running, recording])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 5000)
    return () => window.clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if (!speechAvailable) return
    if (native) {
      let active = true
      setSpeaking(false)
      void nativeVoices()
        .then((available) => {
          if (active) setVoices(available)
        })
        .catch(() => {})
      return () => {
        active = false
        nativeSpeech.dispose()
      }
    }
    const update = () => setVoices(window.speechSynthesis.getVoices())
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update)
      window.speechSynthesis.cancel()
    }
  }, [speechAvailable, native, nativeSpeech])
  function navigate(next: Page) {
    setPage(next)
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => titleRef.current?.focus())
  }
  function speak(text: string, spokenLanguage: Language = language) {
    if (!text.trim()) return
    setMessage(text)
    if (!speechAvailable) {
      setToast(
        tr(
          'Speech playback is unavailable in this browser. Your message is still displayed.',
          'เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง แต่ยังแสดงข้อความได้',
        ),
      )
      return
    }
    if (native) {
      setHistory((h) => [{ text, at: Date.now() }, ...h].slice(0, 8))
      void nativeSpeech.speak(text, spokenLanguage === 'th' ? 'th-TH' : 'en-US', speed)
      return
    }
    window.speechSynthesis.cancel()
    const current = new SpeechSynthesisUtterance(text)
    utterance.current = current
    current.lang = spokenLanguage === 'th' ? 'th-TH' : 'en-US'
    current.rate = speed
    const voice = voices.find((v) => v.lang.startsWith(spokenLanguage))
    if (voice) current.voice = voice
    current.onstart = () => {
      if (utterance.current === current) setSpeaking(true)
    }
    current.onend = () => {
      if (utterance.current === current) {
        setSpeaking(false)
        utterance.current = null
      }
    }
    current.onerror = (event) => {
      if (utterance.current === current) {
        setSpeaking(false)
        utterance.current = null
        if (event.error !== 'canceled' && event.error !== 'interrupted')
          setToast(
            tr(
              'Voice playback failed. Check your device voices and sound settings.',
              'เล่นเสียงไม่สำเร็จ กรุณาตรวจสอบเสียงและภาษาบนอุปกรณ์',
            ),
          )
      }
    }
    setHistory((h) => [{ text, at: Date.now() }, ...h].slice(0, 8))
    window.speechSynthesis.speak(current)
  }
  function stopSpeech() {
    utterance.current = null
    if (native) nativeSpeech.stop()
    else if (speechAvailable) window.speechSynthesis.cancel()
    setSpeaking(false)
  }
  function exportRecording(name: string, csv: string) {
    void download(name, csv).catch(() =>
      setToast(
        tr(
          'Export failed. Try again or check your device storage.',
          'ส่งออกไม่สำเร็จ ลองอีกครั้งหรือตรวจสอบพื้นที่จัดเก็บบนอุปกรณ์',
        ),
      ),
    )
  }
  function addAlert(kind: AlertEvent['kind']) {
    setAlerts((a) =>
      [{ id: localId(), kind, createdAt: Date.now(), status: 'open' as const }, ...a].slice(0, 100),
    )
    setModal(null)
    setFilter('all')
    navigate('alerts')
    setToast(
      kind === 'demo'
        ? tr(
            'Demo alert created. No notification was sent.',
            'สร้างแจ้งเตือนสาธิตแล้ว ไม่มีการส่งข้อความออกไป',
          )
        : tr(
            'Help request displayed on this device. No caregiver was contacted.',
            'แสดงคำขอความช่วยเหลือบนอุปกรณ์นี้แล้ว ยังไม่ได้ติดต่อผู้ดูแล',
          ),
    )
  }
  function updateAlert(id: string, status: AlertEvent['status']) {
    setAlerts((a) =>
      a.map((item) =>
        item.id === id
          ? { ...item, status, ...(status === 'resolved' ? { resolvedAt: Date.now() } : {}) }
          : item,
      ),
    )
  }
  async function importFile(file?: File) {
    if (!file) return
    setImportError('')
    if (file.size > 2_000_000) {
      setImportError(tr('Choose a CSV smaller than 2 MB.', 'เลือกไฟล์ CSV ขนาดไม่เกิน 2 MB'))
      return
    }
    try {
      const next = parseSensorCsv(await file.text())
      setRecording({ name: file.name, samples: next })
      setRunning(false)
      setToast(
        tr(
          'Recording loaded. No swallowing or AI classification has been applied.',
          'โหลดข้อมูลแล้ว ยังไม่มีการจำแนกการกลืนหรือวิเคราะห์ด้วย AI',
        ),
      )
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      const errors: Record<string, [string, string]> = {
        header: [
          'CSV header must be: timestamp_ms,ax,ay,az,gx,gy,gz',
          'หัวตาราง CSV ต้องเป็น: timestamp_ms,ax,ay,az,gx,gy,gz',
        ],
        short: ['Include at least two sensor samples.', 'ต้องมีข้อมูลเซนเซอร์อย่างน้อย 2 แถว'],
        large: [
          'Limit each recording to 20,000 samples.',
          'ข้อมูลแต่ละครั้งต้องไม่เกิน 20,000 แถว',
        ],
        numeric: [
          'Each row must contain seven finite numbers, with no empty cells.',
          'แต่ละแถวต้องมีตัวเลขที่ถูกต้อง 7 ค่า ห้ามมีช่องว่าง',
        ],
        range: [
          'Use acceleration in g (±16) and rotation in degrees/s (±2,000).',
          'ใช้ความเร่งหน่วย g (±16) และการหมุนหน่วยองศา/วินาที (±2,000)',
        ],
        order: [
          'Timestamps must be nonnegative and strictly increasing.',
          'เวลาต้องไม่ติดลบและเพิ่มขึ้นตามลำดับโดยไม่ซ้ำกัน',
        ],
      }
      const detail = errors[code] ?? [
        'Unable to read that file. Please try another CSV.',
        'อ่านไฟล์ไม่ได้ กรุณาลองไฟล์ CSV อื่น',
      ]
      setImportError(tr(...detail))
    }
  }
  function resetDemo() {
    setRecording(null)
    setRunning(true)
    setCursor(0)
    setImportError('')
    setToast(tr('Demo recording restored.', 'กลับสู่ข้อมูลสาธิตแล้ว'))
  }
  const signalPanel = (
    <section className="panel signal-panel">
      <div className="panel-heading">
        <div>
          <div className="eyebrow">{tr('A CLOSER LOOK', 'ดูข้อมูลอย่างละเอียด')}</div>
          <h2>{tr('Throat motion', 'การเคลื่อนไหวบริเวณลำคอ')}</h2>
        </div>
        <div className="segmented" aria-label={tr('Chart time window', 'ช่วงเวลาของกราฟ')}>
          {[30, 60].map((s) => (
            <button
              key={s}
              aria-pressed={windowSeconds === s}
              className={windowSeconds === s ? 'selected' : ''}
              onClick={() => setWindowSeconds(s)}
            >
              {s}s
            </button>
          ))}
        </div>
      </div>
      <div className="chart-meta">
        <span>
          <i className="legend-dot" />
          {tr('Motion amplitude', 'ขนาดสัญญาณ')}
        </span>
        <span className={`badge ${isDemo ? 'green' : 'blue'}`}>
          <span className={`status-dot ${running && isDemo ? 'pulsing' : ''}`} />
          {isDemo
            ? running
              ? tr('Demo replay', 'เล่นข้อมูลสาธิต')
              : tr('Replay paused', 'หยุดสาธิตชั่วคราว')
            : tr('Imported recording', 'ข้อมูลจากไฟล์')}
        </span>
      </div>
      <SignalChart
        samples={samples}
        events={isDemo ? DEMO_EVENTS : []}
        seconds={windowSeconds}
        cursor={cursor}
        language={language}
      />
      <div className="chart-footer">
        <span>
          {isDemo ? (
            <>
              <i className="event-square" />
              {tr('Shaded areas are simulated swallows', 'พื้นที่แรเงาคือการกลืนจำลอง')}
            </>
          ) : (
            tr(
              'Acceleration magnitude relative to 1 g; not a swallowing diagnosis.',
              'ขนาดความเร่งเทียบกับ 1 g ไม่ใช่การวินิจฉัยการกลืน',
            )
          )}
        </span>
        {isDemo && (
          <button className="text-button" onClick={() => setRunning(!running)}>
            {running ? <Pause size={14} /> : <Play size={14} />}{' '}
            {running ? tr('Pause', 'หยุดชั่วคราว') : tr('Resume', 'เล่นต่อ')}
          </button>
        )}
      </div>
    </section>
  )
  const statsRow = (
    <div className="stats-grid">
      {[
        {
          icon: Waves,
          color: 'mint',
          title: isDemo
            ? tr('Swallow events', 'จำนวนครั้งที่กลืน')
            : tr('Recorded samples', 'จำนวนข้อมูล'),
          value: isDemo ? '06' : stats.count.toLocaleString(),
          unit: isDemo ? tr('events', 'ครั้ง') : tr('samples', 'แถว'),
          note: isDemo
            ? tr('In the 60-second demo', 'ในข้อมูลสาธิต 60 วินาที')
            : tr('From your CSV recording', 'จากไฟล์ CSV ของคุณ'),
        },
        {
          icon: Clock3,
          color: 'peach',
          title: isDemo
            ? tr('Average duration', 'ระยะเวลาเฉลี่ย')
            : tr('Recording duration', 'ระยะเวลาบันทึก'),
          value: isDemo ? '1.2' : stats.duration.toFixed(1),
          unit: tr('sec', 'วินาที'),
          note: isDemo
            ? tr('Simulated swallow duration', 'ระยะเวลาการกลืนจำลอง')
            : tr('First to last sample', 'จากข้อมูลแรกถึงข้อมูลสุดท้าย'),
        },
        {
          icon: Activity,
          color: 'lavender',
          title: tr('Peak amplitude', 'ขนาดสัญญาณสูงสุด'),
          value: stats.peak.toFixed(2),
          unit: 'g',
          note: tr('Motion relative to gravity', 'การเคลื่อนไหวเทียบแรงโน้มถ่วง'),
        },
        {
          icon: Bell,
          color: 'sand',
          title: tr('Open alerts', 'แจ้งเตือนที่ยังไม่ปิด'),
          value: String(openAlerts.length).padStart(2, '0'),
          unit: tr('alerts', 'รายการ'),
          note: tr('Local to this browser session', 'เฉพาะการใช้งานเบราว์เซอร์ครั้งนี้'),
        },
      ].map(({ icon: Icon, color, title, value, unit, note }) => (
        <section className="stat-card" key={title}>
          <div className="stat-top">
            <span>{title}</span>
            <span className={`stat-icon ${color}`}>
              <Icon size={18} />
            </span>
          </div>
          <div className="stat-value">
            {value}
            <span>{unit}</span>
          </div>
          <p>{note}</p>
        </section>
      ))}
    </div>
  )
  const eventTable = (
    <section className="panel event-panel">
      <div className="panel-heading">
        <div>
          <h2>{tr('Swallowing activity', 'กิจกรรมการกลืน')}</h2>
          <p>
            {isDemo
              ? tr('A short snapshot of the demo session.', 'ภาพรวมสั้น ๆ ของการสาธิต')
              : tr(
                  'No event labels are available for this recording.',
                  'ข้อมูลนี้ยังไม่มีการระบุเหตุการณ์การกลืน',
                )}
          </p>
        </div>
        <span className="badge neutral">
          {isDemo ? tr('SIMULATED', 'ข้อมูลจำลอง') : tr('UNCLASSIFIED', 'ยังไม่จำแนก')}
        </span>
      </div>
      {isDemo ? (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={tr('Swallowing event table', 'ตารางเหตุการณ์การกลืน')}
        >
          <table>
            <thead>
              <tr>
                <th>{tr('Event', 'เหตุการณ์')}</th>
                <th>{tr('Time in recording', 'เวลาในข้อมูล')}</th>
                <th>{tr('Duration', 'ระยะเวลา')}</th>
                <th>{tr('Amplitude', 'ขนาดสัญญาณ')}</th>
                <th>{tr('Source', 'ที่มา')}</th>
              </tr>
            </thead>
            <tbody>
              {[...DEMO_EVENTS]
                .reverse()
                .slice(0, page === 'overview' ? 3 : 6)
                .map((e, i) => (
                  <tr key={e.time}>
                    <td>
                      <span className="event-icon">
                        <Waves size={15} />
                      </span>
                      {tr('Swallow', 'การกลืน')} {String(6 - i).padStart(2, '0')}
                    </td>
                    <td>00:{String(e.time).padStart(2, '0')}</td>
                    <td>{e.duration.toFixed(1)} s</td>
                    <td>{e.amplitude.toFixed(2)} g</td>
                    <td>
                      <span className="table-badge">{tr('Demo', 'สาธิต')}</span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="inline-empty">
          <Waves size={25} />
          <p>
            {tr(
              'Raw motion is available above. Identifying swallows requires labeled recordings and a validated model.',
              'ดูสัญญาณการเคลื่อนไหวได้จากกราฟ การระบุการกลืนต้องใช้ข้อมูลที่ติดป้ายกำกับและโมเดลที่ผ่านการตรวจสอบ',
            )}
          </p>
        </div>
      )}
      {page === 'overview' && isDemo && (
        <button className="table-link" onClick={() => navigate('monitoring')}>
          {tr('View session details', 'ดูรายละเอียดการบันทึก')}
          <ArrowRight size={15} />
        </button>
      )}
    </section>
  )
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        {tr('Skip to content', 'ข้ามไปเนื้อหา')}
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">{tr('YOUR CARE SPACE', 'พื้นที่ดูแลของคุณ')}</div>
        <nav aria-label={tr('Main navigation', 'เมนูหลัก')}>
          {NAV.map(({ id, icon: Icon, en, th }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-label={tr(en, th)}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={20} />
              <span className="nav-full-label">{tr(en, th)}</span>
              <span className="nav-short-label">
                {id === 'communication'
                  ? tr('Speak', 'สื่อสาร')
                  : id === 'device'
                    ? tr('Device', 'อุปกรณ์')
                    : tr(en, th)}
              </span>
              {id === 'alerts' && openAlerts.length > 0 && (
                <span className="nav-count">{openAlerts.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="care-note-icon">
              <Heart size={20} />
            </span>
            <h3>{tr('A little closer to care.', 'ใกล้ชิดกับการดูแล')}</h3>
            <p>
              {tr(
                'Your voice. Your rhythm.\nSupport that stays with you.',
                'เสียงของคุณ จังหวะของคุณ\nพร้อมการดูแลเคียงข้าง',
              )}
            </p>
            <button onClick={() => setModal('guide')}>
              {tr('Meet LARYN', 'รู้จัก LARYN')}
              <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="sidebar-version">
            <span className="status-dot" />
            {tr('Research prototype', 'ต้นแบบเพื่อการวิจัย')}
            <span>v0.1</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>LARYN AI</span>
            <ChevronRight size={13} />
            <span>
              {tr(NAV.find((n) => n.id === page)!.en, NAV.find((n) => n.id === page)!.th)}
            </span>
          </div>
          <div className="mobile-brand">
            <Brand small />
          </div>
          <div className="topbar-actions">
            <span className="source-label">
              <span className="status-dot" />
              {isDemo ? tr('Demo workspace', 'พื้นที่สาธิต') : tr('Imported data', 'ข้อมูลจากไฟล์')}
            </span>
            <div className="language-switch" aria-label="Language / ภาษา">
              <button
                aria-pressed={language === 'en'}
                className={language === 'en' ? 'selected' : ''}
                onClick={() => setLanguage('en')}
              >
                EN
              </button>
              <button
                aria-pressed={language === 'th'}
                className={language === 'th' ? 'selected' : ''}
                onClick={() => setLanguage('th')}
              >
                ไทย
              </button>
            </div>
            <button
              className="icon-button notification-button"
              onClick={() => navigate('alerts')}
              aria-label={tr(
                `Alerts, ${openAlerts.length} open`,
                `แจ้งเตือน ${openAlerts.length} รายการ`,
              )}
            >
              <Bell size={20} />
              {openAlerts.length > 0 && <i />}
            </button>
            <span className="avatar" title={tr('Demo workspace', 'พื้นที่สาธิต')}>
              L
            </span>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">{tr('CARE, CONNECTED.', 'เชื่อมต่อทุกการดูแล')}</div>
              <h1 ref={titleRef} tabIndex={-1}>
                {page === 'overview'
                  ? tr('Your care, at a glance.', 'ทุกการดูแล ในมุมเดียว')
                  : page === 'communication'
                    ? tr('Every voice matters.', 'ทุกเสียงมีความหมาย')
                    : page === 'monitoring'
                      ? tr('Understand your rhythm.', 'เข้าใจจังหวะของคุณ')
                      : page === 'alerts'
                        ? tr('Here when it matters.', 'พร้อมในช่วงเวลาสำคัญ')
                        : tr(
                            'Small device. More possibility.',
                            'อุปกรณ์เล็ก ความเป็นไปได้ที่มากขึ้น',
                          )}
              </h1>
              <p>
                {page === 'overview'
                  ? tr(
                      'A little insight. A little reassurance. A more connected day.',
                      'เข้าใจมากขึ้น อุ่นใจมากขึ้น เชื่อมต่อการดูแลในทุกวัน',
                    )
                  : page === 'communication'
                    ? tr(
                        'Choose a phrase, or make the words your own.',
                        'เลือกข้อความ หรือพิมพ์สิ่งที่คุณอยากบอก',
                      )
                    : page === 'monitoring'
                      ? tr(
                          'Explore throat motion and recorded swallowing activity.',
                          'สำรวจสัญญาณการเคลื่อนไหวและข้อมูลการกลืน',
                        )
                      : page === 'alerts'
                        ? tr(
                            'Review and respond to requests in this browser session.',
                            'ตรวจสอบและตอบรับคำขอในการใช้งานเบราว์เซอร์ครั้งนี้',
                          )
                        : tr(
                            'Your connection to the LARYN sensor and recorded data.',
                            'เชื่อมต่อกับแนวคิดเซนเซอร์ LARYN และข้อมูลที่บันทึกไว้',
                          )}
              </p>
            </div>
            <button className="button button-white help-button" onClick={() => setModal('help')}>
              <Hand size={17} />
              {tr('Request help', 'ขอความช่วยเหลือ')}
            </button>
          </div>
          <PwaNotice language={language} state={pwa} />
          {openAlerts.length > 0 && page !== 'alerts' && (
            <div className="alert-banner" role="status">
              <Bell size={18} />
              <span>
                {tr(
                  `${openAlerts.length} local request${openAlerts.length === 1 ? '' : 's'} to review. No external notifications have been sent.`,
                  `มี ${openAlerts.length} คำขอบนอุปกรณ์นี้ที่รอตรวจสอบ ยังไม่ได้ส่งการแจ้งเตือนภายนอก`,
                )}
              </span>
              <button onClick={() => navigate('alerts')}>
                {tr('Review', 'ตรวจสอบ')}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
          {page === 'overview' && (
            <>
              <div className="hero-grid">
                <section className="welcome-card">
                  <div className="welcome-copy">
                    <span className="hero-tag">
                      <Sparkles size={13} />
                      {tr('DESIGNED AROUND YOU', 'ออกแบบเพื่อคุณ')}
                    </span>
                    <h2>
                      {tr('Your voice,', 'เสียงของคุณ')}
                      <br />
                      <span>{tr('supported.', 'มีเราเคียงข้าง')}</span>
                    </h2>
                    <p>
                      {tr(
                        'More ways to express yourself.\nMore moments of independence.',
                        'เพิ่มวิธีสื่อสารในแบบของคุณ\nเพิ่มอิสระให้ทุกช่วงเวลา',
                      )}
                    </p>
                    <button
                      className="button button-primary"
                      onClick={() => navigate('communication')}
                    >
                      {tr('Let’s communicate', 'เริ่มสื่อสาร')}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="voice-illustration" aria-hidden="true">
                    <div className="voice-ring ring-outer" />
                    <div className="voice-ring ring-middle" />
                    <div className="voice-center">
                      <AudioLines size={65} strokeWidth={1.7} />
                    </div>
                    <span className="floating-bubble bubble-hello">
                      {tr('Hello!', 'สวัสดี!')}
                      <span>✦</span>
                    </span>
                    <span className="floating-bubble bubble-heart">
                      <Heart size={22} fill="currentColor" />
                    </span>
                    <span className="sparkle-one">✧</span>
                    <span className="sparkle-two">✦</span>
                    <div className="wave-decoration">
                      {Array.from({ length: 18 }, (_, i) => (
                        <i key={i} style={{ height: 5 + Math.sin(i * 0.8) ** 2 * 26 }} />
                      ))}
                    </div>
                  </div>
                </section>
                <section className="device-card">
                  <div className="device-card-top">
                    <span className="eyebrow">
                      {tr('YOUR LITTLE COMPANION', 'เพื่อนตัวเล็กของคุณ')}
                    </span>
                    <button
                      className="icon-button"
                      onClick={() => navigate('device')}
                      aria-label={tr('Device details', 'รายละเอียดอุปกรณ์')}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <DeviceArt />
                  <div className="device-card-bottom">
                    <div>
                      <h3>
                        LARYN One <span>{tr('CONCEPT', 'แนวคิด')}</span>
                      </h3>
                      <p>ESP32-C3 · MPU6050</p>
                    </div>
                    <span className="badge neutral">
                      <WifiOff size={12} />
                      {tr('Not connected', 'ยังไม่เชื่อมต่อ')}
                    </span>
                  </div>
                </section>
              </div>
              <div className="section-label">
                <h2>{tr('A moment of insight', 'มุมมองจากข้อมูล')}</h2>
                <span>
                  <span className="status-dot" />
                  {isDemo
                    ? tr('60-second demo recording', 'ข้อมูลสาธิต 60 วินาที')
                    : recording.name}
                </span>
              </div>
              {statsRow}
              <div className="dashboard-grid">
                {signalPanel}
                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">
                        {tr('WORDS WITHIN REACH', 'คำพูดที่อยู่ใกล้มือ')}
                      </div>
                      <h2>{tr('Quick phrases', 'ข้อความด่วน')}</h2>
                    </div>
                    <span className="soft-icon">
                      <Volume2 size={19} />
                    </span>
                  </div>
                  <p className="panel-intro">
                    {tr('Tap a phrase to speak it aloud.', 'แตะข้อความเพื่ออ่านออกเสียง')}
                  </p>
                  <div className="quick-phrases">
                    {DEFAULT_PHRASES.slice(0, 4).map((phrase) => (
                      <PhraseButton
                        key={phrase.id}
                        phrase={phrase}
                        compact
                        language={language}
                        onSpeak={speak}
                      />
                    ))}
                  </div>
                  <button className="table-link" onClick={() => navigate('communication')}>
                    {tr('All phrases', 'ข้อความทั้งหมด')}
                    <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="dashboard-grid lower-grid">
                {eventTable}
                <section className="insight-card">
                  <span className="insight-icon">
                    <ShieldCheck size={23} />
                  </span>
                  <div className="eyebrow">
                    {tr('THOUGHTFUL BY DESIGN', 'ใส่ใจในทุกรายละเอียด')}
                  </div>
                  <h2>{tr('Care begins with understanding.', 'การดูแลเริ่มจากความเข้าใจ')}</h2>
                  <p>
                    {tr(
                      'LARYN brings communication and motion insights into one calm space. This prototype uses demo data, with no clinical predictions.',
                      'LARYN รวมการสื่อสารและข้อมูลการเคลื่อนไหวไว้ในที่เดียว ต้นแบบนี้ใช้ข้อมูลสาธิต ยังไม่มีการทำนายทางคลินิก',
                    )}
                  </p>
                  <button className="text-button" onClick={() => setModal('guide')}>
                    {tr('About this prototype', 'เกี่ยวกับต้นแบบนี้')}
                    <ArrowUpRight size={15} />
                  </button>
                </section>
              </div>
            </>
          )}
          {page === 'communication' && (
            <>
              <section className="panel message-composer">
                <div className="panel-heading">
                  <div>
                    <div className="eyebrow">{tr('SAY IT YOUR WAY', 'สื่อสารในแบบของคุณ')}</div>
                    <h2>{tr('What would you like to say?', 'คุณอยากพูดอะไร?')}</h2>
                  </div>
                  <span className="soft-icon">
                    <Mic2 size={22} />
                  </span>
                </div>
                <label className="sr-only" htmlFor="message">
                  {tr('Your message', 'ข้อความของคุณ')}
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                  placeholder={tr('Type a message here…', 'พิมพ์ข้อความที่นี่…')}
                  rows={3}
                />
                <div className="composer-footer">
                  <span>{message.length}/500</span>
                  <div className="button-row">
                    {message && (
                      <button
                        className="text-button"
                        onClick={() => {
                          setMessage('')
                          stopSpeech()
                        }}
                      >
                        {tr('Clear', 'ล้างข้อความ')}
                      </button>
                    )}
                    {speaking ? (
                      <button className="button button-primary" onClick={stopSpeech}>
                        <CircleStop size={18} />
                        {tr('Stop speaking', 'หยุดอ่าน')}
                      </button>
                    ) : (
                      <button
                        className="button button-primary"
                        disabled={!message.trim()}
                        onClick={() => speak(message)}
                      >
                        <Volume2 size={18} />
                        {tr('Speak message', 'อ่านข้อความ')}
                      </button>
                    )}
                  </div>
                </div>
              </section>
              <div className="section-label">
                <div>
                  <h2>{tr('Your everyday words', 'คำที่ใช้ในทุกวัน')}</h2>
                  <p>
                    {tr('Familiar phrases, one tap away.', 'ข้อความคุ้นเคย เพียงแตะครั้งเดียว')}
                  </p>
                </div>
                <button
                  className="button button-white"
                  disabled={customPhrases.length >= 50}
                  onClick={() => {
                    setPhraseEn('')
                    setPhraseTh('')
                    setModal('phrase')
                  }}
                >
                  <Plus size={17} />
                  {tr('Add phrase', 'เพิ่มข้อความ')}
                </button>
              </div>
              <div className="phrase-grid">
                {phrases.map((phrase) => (
                  <div className="phrase-wrapper" key={phrase.id}>
                    <PhraseButton phrase={phrase} language={language} onSpeak={speak} />
                    {phrase.custom && (
                      <button
                        className="delete-phrase"
                        onClick={() =>
                          setCustomPhrases((p) => p.filter((item) => item.id !== phrase.id))
                        }
                        aria-label={tr(
                          `Delete ${phrase.en || phrase.th}`,
                          `ลบ ${phrase.th || phrase.en}`,
                        )}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="two-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{tr('Voice preferences', 'การตั้งค่าเสียง')}</h2>
                    <SlidersHorizontal size={19} />
                  </div>
                  <div className="voice-setting">
                    <span>{tr('Language', 'ภาษา')}</span>
                    <strong>{language === 'en' ? 'English' : 'ภาษาไทย'}</strong>
                  </div>
                  <div className="voice-setting">
                    <label htmlFor="speed">{tr('Speaking speed', 'ความเร็วการอ่าน')}</label>
                    <strong>{speed.toFixed(1)}×</strong>
                  </div>
                  <input
                    id="speed"
                    className="speed-slider"
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                  />
                  <p className="subtle-note">
                    {!speechAvailable
                      ? tr(
                          'Speech playback is not supported in this browser.',
                          'เบราว์เซอร์นี้ไม่รองรับการอ่านออกเสียง',
                        )
                      : voices.some((v) => v.lang.startsWith(language))
                        ? tr(
                            'Uses an installed device voice. Availability varies by device.',
                            'ใช้เสียงที่ติดตั้งในอุปกรณ์ การรองรับขึ้นอยู่กับแต่ละอุปกรณ์',
                          )
                        : tr(
                            'No matching voice is listed yet. You may need to install a voice in your device settings.',
                            'ยังไม่พบเสียงภาษาที่เลือก อาจต้องติดตั้งเสียงจากการตั้งค่าอุปกรณ์',
                          )}
                  </p>
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{tr('Recent messages', 'ข้อความล่าสุด')}</h2>
                    {history.length > 0 && (
                      <button className="text-button" onClick={() => setHistory([])}>
                        {tr('Clear', 'ล้าง')}
                      </button>
                    )}
                  </div>
                  {history.length ? (
                    <ul className="message-history">
                      {history.slice(0, 4).map((h, i) => (
                        <li key={`${h.at}-${i}`}>
                          <MessageCircle size={16} />
                          <span>{h.text}</span>
                          <small>{time(h.at)}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="inline-empty">
                      <MessageCircle size={25} />
                      <p>
                        {tr(
                          'Your spoken messages will appear here for this session.',
                          'ข้อความที่เลือกอ่านจะแสดงที่นี่ในการใช้งานครั้งนี้',
                        )}
                      </p>
                    </div>
                  )}
                </section>
              </div>
              <div className="info-strip">
                <Sparkles size={20} />
                <p>
                  <strong>
                    {tr('Personalized signal recognition', 'การจดจำสัญญาณเฉพาะบุคคล')}
                  </strong>
                  {tr(
                    ' is a future step. Phrases currently play when you tap them; no speech is inferred from the sensor.',
                    ' เป็นขั้นตอนถัดไป ขณะนี้ข้อความจะอ่านเมื่อคุณแตะเท่านั้น ยังไม่มีการแปลสัญญาณเซนเซอร์เป็นคำพูด',
                  )}
                </p>
              </div>
            </>
          )}
          {page === 'monitoring' && (
            <>
              <div className="recording-toolbar">
                <div>
                  <span className={`badge ${isDemo ? 'green' : 'blue'}`}>
                    {isDemo ? tr('DEMO RECORDING', 'ข้อมูลสาธิต') : tr('IMPORTED CSV', 'ไฟล์ CSV')}
                  </span>
                  <span>
                    {isDemo
                      ? tr('60 seconds · 20 Hz · synthetic data', '60 วินาที · 20 Hz · ข้อมูลจำลอง')
                      : `${recording.name} · ${stats.rate.toFixed(1)} Hz`}
                  </span>
                </div>
                <button
                  className="button button-white"
                  onClick={() =>
                    exportRecording(
                      isDemo ? 'laryn-demo-sensor.csv' : 'laryn-recording.csv',
                      toCsv(samples),
                    )
                  }
                >
                  <ArrowDownToLine size={17} />
                  {tr('Export CSV', 'ส่งออก CSV')}
                </button>
              </div>
              {statsRow}
              {signalPanel}
              <div className="two-columns monitoring-bottom">
                {eventTable}
                <section className="panel">
                  <div className="panel-heading">
                    <h2>{tr('Reading the signals', 'ทำความเข้าใจสัญญาณ')}</h2>
                    <BookOpen size={19} />
                  </div>
                  <dl className="definitions">
                    <div>
                      <dt>{tr('Amplitude', 'ขนาดสัญญาณ')}</dt>
                      <dd>
                        {tr(
                          'Movement magnitude relative to gravity, measured in g. Posture and non-swallow movements also affect it.',
                          'ขนาดการเคลื่อนไหวเทียบกับแรงโน้มถ่วง หน่วย g ซึ่งอาจเปลี่ยนตามท่าทางและการเคลื่อนไหวอื่น',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{tr('Duration & frequency', 'ระยะเวลาและความถี่')}</dt>
                      <dd>
                        {tr(
                          'Demo event labels are predefined. An imported trace is not automatically classified as swallowing.',
                          'เหตุการณ์สาธิตกำหนดไว้ล่วงหน้า ข้อมูลที่นำเข้าจะไม่ถูกจำแนกว่าเป็นการกลืนโดยอัตโนมัติ',
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{tr('Clinical interpretation', 'การแปลผลทางคลินิก')}</dt>
                      <dd>
                        {tr(
                          'An MPU6050 signal alone cannot establish safe swallowing or diagnose dysphagia. Interpretation requires clinical validation.',
                          'สัญญาณ MPU6050 เพียงอย่างเดียวไม่สามารถยืนยันความปลอดภัยในการกลืนหรือวินิจฉัยภาวะกลืนลำบากได้ ต้องผ่านการตรวจสอบทางคลินิก',
                        )}
                      </dd>
                    </div>
                  </dl>
                </section>
              </div>
            </>
          )}
          {page === 'alerts' && (
            <>
              <div className="info-strip amber">
                <Bell size={20} />
                <p>
                  <strong>{tr('On-screen alerts only.', 'แจ้งเตือนบนหน้าจอเท่านั้น')}</strong>{' '}
                  {tr(
                    'No caregiver, phone, or emergency service is connected. This app cannot detect choking or confirm safety.',
                    'ยังไม่เชื่อมต่อผู้ดูแล โทรศัพท์ หรือบริการฉุกเฉิน แอปนี้ไม่สามารถตรวจจับการสำลักหรือยืนยันความปลอดภัยได้',
                  )}
                </p>
              </div>
              <div className="alert-summary">
                <div className="alert-summary-icon">
                  <ShieldCheck size={29} />
                </div>
                <div>
                  <h2>
                    {openAlerts.length
                      ? tr(
                          `${openAlerts.length} request${openAlerts.length === 1 ? '' : 's'} awaiting resolution`,
                          `${openAlerts.length} คำขอที่รอดำเนินการ`,
                        )
                      : tr('No open requests', 'ไม่มีคำขอที่ค้างอยู่')}
                  </h2>
                  <p>
                    {tr(
                      'This is the status of your local alert list, not a health assessment.',
                      'นี่คือสถานะรายการแจ้งเตือนบนอุปกรณ์ ไม่ใช่การประเมินสุขภาพ',
                    )}
                  </p>
                </div>
                <button className="button button-white" onClick={() => addAlert('demo')}>
                  <Play size={16} />
                  {tr('Run alert demo', 'ทดลองแจ้งเตือน')}
                </button>
              </div>
              <section className="panel alerts-panel">
                <div className="panel-heading">
                  <h2>{tr('Alert history', 'ประวัติการแจ้งเตือน')}</h2>
                  <div className="segmented">
                    {(['all', 'open', 'resolved'] as const).map((f) => (
                      <button
                        key={f}
                        aria-pressed={filter === f}
                        className={filter === f ? 'selected' : ''}
                        onClick={() => setFilter(f)}
                      >
                        {f === 'all'
                          ? tr('All', 'ทั้งหมด')
                          : f === 'open'
                            ? tr('Open', 'รอตรวจสอบ')
                            : tr('Resolved', 'ปิดแล้ว')}
                      </button>
                    ))}
                  </div>
                </div>
                {visibleAlerts.length ? (
                  <div className="alert-list">
                    {visibleAlerts.map((alert) => (
                      <article className={`alert-item ${alert.status}`} key={alert.id}>
                        <span className="alert-item-icon">
                          {alert.status === 'resolved' ? (
                            <CheckCheck size={21} />
                          ) : (
                            <Bell size={21} />
                          )}
                        </span>
                        <div className="alert-content">
                          <div className="alert-item-title">
                            <h3>
                              {alert.kind === 'demo'
                                ? tr('Simulated motion change', 'สัญญาณเปลี่ยนแปลงจำลอง')
                                : tr('Help requested', 'คำขอความช่วยเหลือ')}
                            </h3>
                            <span
                              className={`badge ${alert.status === 'resolved' ? 'green' : 'neutral'}`}
                            >
                              {alert.kind === 'demo'
                                ? tr('Demo', 'สาธิต')
                                : tr('Manual', 'กดด้วยตนเอง')}
                            </span>
                          </div>
                          <p>
                            {alert.kind === 'demo'
                              ? tr(
                                  'A demonstration of the review flow. No abnormality was detected from sensor data.',
                                  'สาธิตขั้นตอนการตรวจสอบ ไม่ใช่ความผิดปกติที่ตรวจพบจากเซนเซอร์',
                                )
                              : tr(
                                  'A help request was created on this device. Contact your caregiver directly.',
                                  'สร้างคำขอบนอุปกรณ์นี้แล้ว กรุณาติดต่อผู้ดูแลโดยตรง',
                                )}
                          </p>
                          <small>
                            {time(alert.createdAt)} ·{' '}
                            {alert.status === 'open'
                              ? tr('Awaiting review', 'รอตรวจสอบ')
                              : alert.status === 'acknowledged'
                                ? tr('Acknowledged on this device', 'ตอบรับบนอุปกรณ์นี้แล้ว')
                                : tr(
                                    `Resolved at ${time(alert.resolvedAt!)}`,
                                    `ปิดรายการเวลา ${time(alert.resolvedAt!)}`,
                                  )}
                          </small>
                        </div>
                        <div className="alert-actions">
                          {alert.status === 'open' && (
                            <button
                              className="button button-white"
                              onClick={() => updateAlert(alert.id, 'acknowledged')}
                            >
                              <Check size={16} />
                              {tr('Acknowledge', 'ตอบรับ')}
                            </button>
                          )}
                          {alert.status !== 'resolved' && (
                            <button
                              className="button button-primary"
                              onClick={() => updateAlert(alert.id, 'resolved')}
                            >
                              <CheckCheck size={16} />
                              {tr('Resolve', 'ปิดรายการ')}
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div>
                      <CheckCircle2 size={35} strokeWidth={1.3} />
                    </div>
                    <h3>{tr('A quiet space, for now.', 'ยังไม่มีรายการในขณะนี้')}</h3>
                    <p>
                      {filter === 'resolved'
                        ? tr('Resolved requests will appear here.', 'คำขอที่ปิดแล้วจะแสดงที่นี่')
                        : tr(
                            'Try the alert demo to explore how reviewing and resolving a request works.',
                            'ทดลองแจ้งเตือนเพื่อสำรวจขั้นตอนการตรวจสอบและปิดคำขอ',
                          )}
                    </p>
                  </div>
                )}
              </section>
            </>
          )}
          {page === 'device' && (
            <>
              <div className="two-columns device-layout">
                <section className="panel hardware-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">{tr('WEARABLE CONCEPT', 'แนวคิดอุปกรณ์สวมใส่')}</div>
                      <h2>LARYN One</h2>
                    </div>
                    <span className="badge neutral">
                      <WifiOff size={13} />
                      {tr('Not connected', 'ยังไม่เชื่อมต่อ')}
                    </span>
                  </div>
                  <DeviceArt />
                  <p className="hardware-caption">
                    {tr(
                      'One small sensor. Three ways to support care.',
                      'เซนเซอร์เล็กหนึ่งตัว เพื่อสนับสนุนการดูแลสามด้าน',
                    )}
                  </p>
                  <dl className="hardware-specs">
                    <div>
                      <dt>{tr('Motion sensor', 'เซนเซอร์การเคลื่อนไหว')}</dt>
                      <dd>MPU6050 · 6-axis IMU</dd>
                    </div>
                    <div>
                      <dt>{tr('Controller', 'ไมโครคอนโทรลเลอร์')}</dt>
                      <dd>ESP32-C3 Super Mini</dd>
                    </div>
                    <div>
                      <dt>{tr('Attachment', 'การติดตั้ง')}</dt>
                      <dd>{tr('4-point magnetic patch', 'ฐานแม่เหล็ก 4 จุด')}</dd>
                    </div>
                    <div>
                      <dt>{tr('Live connection', 'การเชื่อมต่อสด')}</dt>
                      <dd>{tr('Not implemented yet', 'ยังไม่ได้พัฒนา')}</dd>
                    </div>
                  </dl>
                </section>
                <section className="panel import-panel">
                  <div className="panel-heading">
                    <div>
                      <div className="eyebrow">
                        {tr('BRING YOUR OWN DATA', 'นำเข้าข้อมูลของคุณ')}
                      </div>
                      <h2>{tr('Explore a recording', 'สำรวจข้อมูลที่บันทึก')}</h2>
                    </div>
                    <FileUp size={23} />
                  </div>
                  <p className="panel-intro">
                    {tr(
                      'Import raw MPU6050 samples to view the motion trace. Files are processed in this browser and are not uploaded.',
                      'นำเข้าข้อมูลดิบจาก MPU6050 เพื่อดูกราฟ ไฟล์จะประมวลผลในเบราว์เซอร์นี้โดยไม่มีการอัปโหลด',
                    )}
                  </p>
                  <input
                    ref={fileInput}
                    className="sr-only"
                    tabIndex={-1}
                    type="file"
                    accept=".csv,text/csv"
                    aria-label={tr('Import sensor CSV', 'นำเข้า CSV เซนเซอร์')}
                    onChange={(e) => {
                      void importFile(e.target.files?.[0])
                      e.currentTarget.value = ''
                    }}
                  />
                  <button className="upload-zone" onClick={() => fileInput.current?.click()}>
                    <span>
                      <FileUp size={27} />
                    </span>
                    <strong>{tr('Choose a sensor CSV', 'เลือกไฟล์ CSV เซนเซอร์')}</strong>
                    <small>{tr('Up to 2 MB · 20,000 samples', 'สูงสุด 2 MB · 20,000 แถว')}</small>
                  </button>
                  {importError && (
                    <p className="error-message" role="alert">
                      {importError}
                    </p>
                  )}
                  {recording && (
                    <div className="import-success">
                      <CheckCircle2 size={20} />
                      <div>
                        <strong>{recording.name}</strong>
                        <small>
                          {stats.count.toLocaleString()} {tr('samples loaded', 'แถวที่โหลด')}
                        </small>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={tr('Remove recording', 'ลบข้อมูลที่นำเข้า')}
                        onClick={resetDemo}
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}
                  <div className="csv-format">
                    <strong>{tr('Expected columns', 'คอลัมน์ที่ต้องมี')}</strong>
                    <code>timestamp_ms,ax,ay,az,gx,gy,gz</code>
                    <p>
                      {tr(
                        'Time in milliseconds, acceleration in g, rotation in degrees/second. Timestamps must increase.',
                        'เวลาเป็นมิลลิวินาที ความเร่งหน่วย g การหมุนหน่วยองศา/วินาที เวลาต้องเพิ่มขึ้นตามลำดับ',
                      )}
                    </p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => exportRecording('laryn-example.csv', toCsv(DEMO))}
                  >
                    <ArrowDownToLine size={15} />
                    {tr('Download example CSV', 'ดาวน์โหลด CSV ตัวอย่าง')}
                  </button>
                </section>
              </div>
              <InstallCard language={language} state={pwa} />
              <section className="panel data-source-panel">
                <div>
                  <h2>{tr('Current data source', 'แหล่งข้อมูลปัจจุบัน')}</h2>
                  <p>
                    {recording
                      ? recording.name
                      : tr(
                          'Built-in, synthetic 60-second recording',
                          'ข้อมูลจำลองในแอป ความยาว 60 วินาที',
                        )}
                  </p>
                </div>
                <div className="button-row">
                  {recording ? (
                    <>
                      <button className="button button-white" onClick={resetDemo}>
                        <RotateCcw size={16} />
                        {tr('Return to demo', 'กลับสู่การสาธิต')}
                      </button>
                      <button
                        className="button button-primary"
                        onClick={() => navigate('monitoring')}
                      >
                        {tr('View recording', 'ดูข้อมูล')}
                        <ArrowRight size={16} />
                      </button>
                    </>
                  ) : (
                    <span className="badge green">
                      <Radio size={13} />
                      {tr('Demo selected', 'เลือกข้อมูลสาธิต')}
                    </span>
                  )}
                </div>
              </section>
              <div className="info-strip">
                <CircleHelp size={21} />
                <p>
                  {tr(
                    'Hardware streaming, personalized AI training, and remote caregiver notifications are the next integration steps. The prototype does not connect to an ESP32 over Wi-Fi yet.',
                    'การรับข้อมูลสด การฝึก AI เฉพาะบุคคล และการส่งแจ้งเตือนให้ผู้ดูแลเป็นขั้นตอนพัฒนาถัดไป ต้นแบบนี้ยังไม่เชื่อมต่อ ESP32 ผ่าน Wi-Fi',
                  )}
                </p>
              </div>
            </>
          )}
          <footer className="footer">
            <span>
              <AudioLines size={15} />
              {tr('A little more independence, every day.', 'เพิ่มอิสระให้ทุกวัน')}
            </span>
            <span>
              {tr(
                'Prototype · Not for clinical or emergency use',
                'ต้นแบบ · ไม่ใช้สำหรับการรักษาหรือเหตุฉุกเฉิน',
              )}
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            onClick={() => setToast('')}
            aria-label={tr('Dismiss notification', 'ปิดข้อความ')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {speaking && (
        <div className="speaking-indicator" role="status">
          <AudioLines size={19} />
          {tr('Speaking…', 'กำลังอ่าน…')}
          <button onClick={stopSpeech}>
            {tr('Stop', 'หยุด')}
            <CircleStop size={16} />
          </button>
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === 'phrase'
              ? tr('Make it your own.', 'เพิ่มคำพูดของคุณ')
              : modal === 'help'
                ? tr('Request help', 'ขอความช่วยเหลือ')
                : tr('Meet LARYN AI', 'รู้จัก LARYN AI')
          }
          close={() => setModal(null)}
          closeLabel={tr('Close dialog', 'ปิดหน้าต่าง')}
        >
          {modal === 'phrase' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!phraseEn.trim() && !phraseTh.trim()) return
                setCustomPhrases((p) => [
                  ...p,
                  {
                    id: localId(),
                    en: phraseEn.trim(),
                    th: phraseTh.trim(),
                    icon: 'chat',
                    custom: true,
                  },
                ])
                setModal(null)
                setToast(tr('Your phrase is ready to use.', 'ข้อความของคุณพร้อมใช้แล้ว'))
              }}
            >
              <p className="modal-description">
                {tr(
                  'Add a phrase in either language, or both. It stays in this browser.',
                  'เพิ่มข้อความภาษาใดภาษาหนึ่งหรือทั้งสองภาษา ข้อมูลจะเก็บในเบราว์เซอร์นี้',
                )}
              </p>
              <label className="field-label" htmlFor="phrase-en">
                English
              </label>
              <input
                id="phrase-en"
                autoFocus
                maxLength={120}
                value={phraseEn}
                onChange={(e) => setPhraseEn(e.target.value)}
                placeholder="I would like to sit outside"
              />
              <label className="field-label" htmlFor="phrase-th">
                ภาษาไทย
              </label>
              <input
                id="phrase-th"
                maxLength={120}
                value={phraseTh}
                onChange={(e) => setPhraseTh(e.target.value)}
                placeholder="อยากออกไปนั่งข้างนอก"
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-white"
                  onClick={() => setModal(null)}
                >
                  {tr('Cancel', 'ยกเลิก')}
                </button>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!phraseEn.trim() && !phraseTh.trim()}
                >
                  <Plus size={16} />
                  {tr('Save phrase', 'บันทึกข้อความ')}
                </button>
              </div>
            </form>
          )}
          {modal === 'help' && (
            <>
              <div className="help-dialog-icon">
                <Hand size={30} />
              </div>
              <p className="modal-description">
                {tr(
                  'This creates a visible request on this device only. It does not notify a caregiver or call emergency services.',
                  'คำขอจะแสดงบนอุปกรณ์นี้เท่านั้น ไม่มีการส่งข้อความถึงผู้ดูแลหรือโทรหาบริการฉุกเฉิน',
                )}
              </p>
              <div className="info-strip amber">
                <p>
                  {tr(
                    'If someone needs urgent help, contact a nearby caregiver or your local emergency service directly.',
                    'หากต้องการความช่วยเหลือเร่งด่วน โปรดติดต่อผู้ดูแลที่อยู่ใกล้หรือบริการฉุกเฉินในพื้นที่โดยตรง',
                  )}
                </p>
              </div>
              <div className="modal-actions">
                <button className="button button-white" onClick={() => setModal(null)}>
                  {tr('Cancel', 'ยกเลิก')}
                </button>
                <button className="button button-primary" onClick={() => addAlert('help')}>
                  <Hand size={17} />
                  {tr('Show local help request', 'แสดงคำขอบนอุปกรณ์นี้')}
                </button>
              </div>
            </>
          )}
          {modal === 'guide' && (
            <>
              <p className="modal-description">
                {tr(
                  'A calmer space for communication and throat-motion insights, inspired by a single-sensor wearable.',
                  'พื้นที่สำหรับการสื่อสารและข้อมูลการเคลื่อนไหวบริเวณลำคอ จากแนวคิดอุปกรณ์สวมใส่ที่ใช้เซนเซอร์เพียงตัวเดียว',
                )}
              </p>
              <div className="guide-list">
                {[
                  {
                    icon: MessageCircle,
                    title: tr('Express yourself', 'สื่อสารในแบบของคุณ'),
                    text: tr(
                      'Tap a phrase or type a message to use your device’s text-to-speech.',
                      'แตะข้อความหรือพิมพ์เพื่อให้อุปกรณ์อ่านข้อความ',
                    ),
                  },
                  {
                    icon: Activity,
                    title: tr('Explore motion', 'สำรวจการเคลื่อนไหว'),
                    text: tr(
                      'Replay synthetic samples or import a recorded sensor CSV.',
                      'เล่นข้อมูลจำลองหรือนำเข้าไฟล์ CSV จากเซนเซอร์',
                    ),
                  },
                  {
                    icon: Bell,
                    title: tr('Try the care flow', 'ทดลองขั้นตอนการดูแล'),
                    text: tr(
                      'Create, acknowledge, and resolve on-screen demo alerts.',
                      'สร้าง ตอบรับ และปิดการแจ้งเตือนสาธิตบนหน้าจอ',
                    ),
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title}>
                    <span className="soft-icon">
                      <Icon size={21} />
                    </span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="subtle-note">
                {tr(
                  'No trained AI or live device is connected. Custom phrases stay in this browser; imported data and alert history last for this session only. Devices do not sync yet.',
                  'ยังไม่มี AI ที่ฝึกแล้วหรืออุปกรณ์สดเชื่อมต่อ ข้อความที่เพิ่มเก็บในเบราว์เซอร์นี้ ข้อมูลนำเข้าและประวัติแจ้งเตือนอยู่เฉพาะครั้งนี้ ยังไม่มีการซิงก์ระหว่างอุปกรณ์',
                )}
              </p>
              <div className="modal-actions">
                <button className="button button-primary" onClick={() => setModal(null)}>
                  {tr('Let’s explore', 'เริ่มสำรวจ')}
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
export default App
