import { Component } from 'react'
import type { ReactNode } from 'react'
import logoUrl from '../assets/logo.svg'

export default class AppErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="startup-card" role="alert">
        <img src={logoUrl} alt="LARYN AI" />
        <h1>LARYN could not start</h1>
        <p>
          The app encountered an error. Reload to try again. Your saved phrases will stay in this
          browser.
        </p>
        <p lang="th">แอปเกิดข้อผิดพลาด ลองโหลดใหม่ ข้อความที่บันทึกไว้จะยังอยู่ในเบราว์เซอร์นี้</p>
        <button onClick={() => window.location.reload()}>Reload app / โหลดใหม่</button>
        <details>
          <summary>Error details to share</summary>
          <pre>{String(this.state.error.message || this.state.error).slice(0, 600)}</pre>
        </details>
      </main>
    )
  }
}
