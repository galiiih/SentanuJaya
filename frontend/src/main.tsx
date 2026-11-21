import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth.tsx'
import './index.css'
import App from './App.tsx'

type AppErrorBoundaryState = { hasError: boolean }

class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the original exception available for diagnosis instead of silently
    // leaving users with a blank application after a render failure.
    console.error('Sentanu Jaya UI render failure:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="auth-page" role="alert">
          <section className="auth-card">
            <h1>Aplikasi mengalami kesalahan</h1>
            <p>Halaman gagal ditampilkan. Data yang sudah tersimpan tidak otomatis dibatalkan.</p>
            <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
              Muat ulang aplikasi
            </button>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  </StrictMode>,
)
