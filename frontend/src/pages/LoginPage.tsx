import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Spinner } from '../components/ui/Spinner'

export function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="bg-black min-h-screen flex justify-center items-center overflow-hidden relative">
      <div className="fixed inset-0 bg-glow-radial pointer-events-none"></div>

      <div className="fixed top-8 left-8 z-50 flex items-center gap-3 transform scale-[0.85] origin-top-left">
        <div className="w-10 h-10 bg-primary-container rounded-xl flex items-center justify-center">
          <span className="material-symbols-outlined text-on-primary text-2xl">auto_awesome</span>
        </div>
        <span className="text-xl font-headline font-bold tracking-tight text-[#FFFFEA]">Meet Scribe</span>
      </div>

      <main className="relative z-10 w-full max-w-xl px-6 text-center transform scale-[0.85]">
        <div className="relative mb-12">
          <div className="absolute inset-0 blur-3xl bg-primary-container/10 rounded-full scale-75 -z-10"></div>
          <div className="space-y-6">
            <h2 className="text-4xl md:text-6xl font-headline font-bold tracking-tight text-[#FFFFEA] leading-tight">
              AI that listens. <br />
              <span className="text-primary-container">Summaries that matter.</span>
            </h2>
            <p className="text-lg md:text-xl text-[#FFFFEA]/60 max-w-md mx-auto font-body">
              Automatically join meetings and generate structured insights.
            </p>
          </div>
        </div>

        <div className="bg-surface-container-lowest/40 backdrop-blur-2xl p-10 rounded-[2rem] border border-outline-variant/10 shadow-2xl">
          <div className="space-y-4">
            <button
              onClick={signIn}
              className="w-full h-16 bg-primary-container hover:bg-primary transition-all duration-300 rounded-xl flex items-center justify-center gap-4 group active:scale-95"
            >
              <img
                alt="Google Logo"
                className="w-6 h-6 p-1 rounded-sm bg-black"
                src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
              />
              <span className="text-on-primary font-headline font-bold text-lg">Sign in with Google</span>
            </button>
            <p className="text-[0.7rem] uppercase tracking-[0.2em] text-[#FFFFEA]/30 pt-4">
              Secure enterprise-grade encryption enabled
            </p>
          </div>
        </div>

        <div className="flex justify-center gap-12 mt-12">
          <div className="flex flex-col items-center gap-2 opacity-40">
            <span className="material-symbols-outlined text-primary-container">transcribe</span>
            <span className="text-[0.6rem] uppercase tracking-widest text-[#FFFFEA]">Real-time Transcription</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <span className="material-symbols-outlined text-primary-container">summarize</span>
            <span className="text-[0.6rem] uppercase tracking-widest text-[#FFFFEA]">AI Synthesis</span>
          </div>
          <div className="flex flex-col items-center gap-2 opacity-40">
            <span className="material-symbols-outlined text-primary-container">hub</span>
            <span className="text-[0.6rem] uppercase tracking-widest text-[#FFFFEA]">Workflow Sync</span>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary-container/5 to-transparent pointer-events-none"></div>

      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary-container/5 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="fixed -bottom-48 -left-48 w-[500px] h-[500px] bg-primary-container/5 rounded-full blur-[120px] pointer-events-none"></div>
    </div>
  )
}
