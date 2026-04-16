import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useMeetingSocket, MeetingSummary } from '../hooks/useMeetingSocket'
import api from '../lib/api'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

export function MeetingPage() {
  const { meetingId } = useParams<{ meetingId: string }>()
  const navigate = useNavigate()
  const { status, summary, error, isConnected } = useMeetingSocket(meetingId || null)

  const [recoveredSummary, setRecoveredSummary] = useState<MeetingSummary | null>(null)
  const [stopping, setStopping] = useState(false)
  const [userProfileData, setUserProfileData] = useState<any>(null)
  const [showSignOutMenu, setShowSignOutMenu] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/')
        return
      }
      setUserProfileData(user)
    })
    return () => unsubscribe()
  }, [navigate])

  useEffect(() => {
    if (!meetingId) return
    const recover = async () => {
      try {
        const response = await api.get(`/api/meetings/${meetingId}`)
        const data = response.data
        if (data.summary && data.status === 'COMPLETED') {
          setRecoveredSummary(data.summary)
        }
      } catch {
        // Ignore
      }
    }
    recover()
  }, [meetingId])

  const activeSummary = summary || recoveredSummary
  const isTerminal = ['COMPLETED', 'FAILED', 'FAILED_ENTRY', 'FAILED_TIMEOUT', 'STOPPED'].includes(status)
  const canStop = !isTerminal && status !== 'CONNECTING'

  const handleStop = async () => {
    if (!meetingId) return
    setStopping(true)
    try {
      await api.delete(`/api/meetings/${meetingId}/stop`)
    } catch (err) {
      console.error('Failed to stop bot:', err)
    } finally {
      setStopping(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (e) {
      console.error(e)
    }
  }

  if (!meetingId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white/50">Invalid meeting ID</p>
      </div>
    )
  }

  const hasConnected = status !== 'CONNECTING' && status !== 'JOINING' && status !== 'FAILED_ENTRY'
  const isRecording = status === 'CAPTURING'
  const finishedRecording = status === 'PROCESSING_AI' || status === 'COMPLETED' || status === 'STOPPED' || status === 'FAILED'
  const isProcessing = status === 'PROCESSING_AI'
  const isCompleted = status === 'COMPLETED' || !!activeSummary

  const keyPoints = activeSummary?.key_points?.length ? activeSummary.key_points : [
    "No key points available yet."
  ]

  const actionItems = activeSummary?.action_items?.length ? activeSummary.action_items : [
    "No action items identified."
  ]

  return (
    <div className="bg-black text-[#FFFFEA] min-h-screen" style={{ zoom: 0.85 }}>
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(28,202,216,0.05)] flex justify-between items-center px-8 h-20 max-w-full mx-auto font-['Inter'] tracking-tight">
        <div className="text-2xl font-black tracking-tighter text-[#FFFFEA]">Meet Scribe</div>
        <div className="hidden md:flex items-center space-x-8 h-full">
          <Link className="text-[#FFFFEA]/70 hover:text-[#1ccad8] transition-colors h-full flex items-center px-2" to="/dashboard">Dashboard</Link>
          <Link className="text-[#1ccad8] border-b-2 border-[#1ccad8] pb-1 font-bold h-full flex items-center px-2" to="#">Transcripts</Link>
          <Link className="text-[#FFFFEA]/70 hover:text-[#1ccad8] transition-colors h-full flex items-center px-2" to="/dashboard">Meetings</Link>
        </div>
        <div className="flex items-center gap-6">
          <button className="material-symbols-outlined text-[#FFFFEA]/70 hover:text-[#1ccad8] transition-all active:scale-95">notifications</button>

          <div className="relative">
            <button onClick={() => setShowSignOutMenu(!showSignOutMenu)} className="w-10 h-10 rounded-full overflow-hidden border border-[#1ccad8]/20 cursor-pointer hover:border-[#1ccad8] transition-colors" title="Profile">
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src={userProfileData?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuAoKo7k2hsrhtYnSK6ctPO1xUJutJ8aNa3Cw__YaQZ2Vnlt9p9Pzei6Wy09trpFkdcfgANg1glOrO0CALMQVbokw-rWBzJngHM2njTG0cQ4EF2EUP0BKAXHlsRBN3lo7aDok2IZQqCmwz3Z8HxdREjKfIn7f0J8pyWZOaPZ9-ECQeKpL421UoDTGMODJXjmqmieXhDE9hAryETRKrwDsmd_tHvJblidAeNSNJTX6GheNQwrRoWXDCSfIES0vVL7M_kfNHE8HT7uoQ"}
              />
            </button>

            {showSignOutMenu && (
              <div className="absolute right-0 mt-2 w-32 bg-surface-container-lowest border border-outline-variant/10 rounded-lg shadow-2xl overflow-hidden z-50">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-white/5 transition-colors font-medium flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-12 px-8 max-w-7xl mx-auto grid grid-cols-12 gap-8">
        <aside className="col-span-12 lg:col-span-4 space-y-8">
          <div className="p-8 rounded-xl bg-surface-container-lowest border border-outline-variant/10">
            <div className="text-[0.75rem] font-['Inter'] uppercase tracking-[0.1em] text-primary-container mb-4">Current Session</div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Live Transcript</h1>
            <p className="text-on-surface-variant text-sm mb-8 truncate">
              {isTerminal ? 'Session Completed' : 'Recording live'} • Status: {status}
            </p>

            <div className="space-y-0 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-outline-variant/20"></div>

              {/* Established */}
              <div className="relative flex items-start gap-4 pb-10">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center ${hasConnected ? 'bg-surface-container-high border-2 border-outline-variant' : 'bg-surface-container-lowest border-2 border-outline-variant/30'}`}>
                  {hasConnected && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">check</span>}
                </div>
                <div>
                  <p className={`text-[0.75rem] font-bold uppercase tracking-wider ${hasConnected ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>Connection established</p>
                  <p className={`text-xs ${hasConnected ? 'text-on-surface-variant/60' : 'text-on-surface-variant/30'}`}>{hasConnected ? 'Success' : 'Waiting...'}</p>
                </div>
              </div>

              {/* Active */}
              <div className="relative flex items-start gap-4 pb-10">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center ${isRecording ? 'bg-primary-container glow-cyan' : finishedRecording ? 'bg-surface-container-high border-2 border-outline-variant' : 'bg-surface-container-lowest border-2 border-outline-variant/30'}`}>
                  {isRecording && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                  {finishedRecording && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">check</span>}
                </div>
                <div>
                  <p className={`text-[0.75rem] font-bold uppercase tracking-wider ${isRecording ? 'text-primary-container' : finishedRecording ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>Recording Session</p>
                  <p className={`text-xs ${isRecording ? 'text-primary-container/80' : finishedRecording ? 'text-on-surface-variant/60' : 'text-on-surface-variant/30'}`}>{isRecording ? 'Active now' : finishedRecording ? 'Done' : 'Pending'}</p>
                </div>
              </div>

              {/* Analysis */}
              <div className="relative flex items-start gap-4 pb-10">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center ${isProcessing ? 'bg-primary-container glow-cyan' : isCompleted ? 'bg-surface-container-high border-2 border-outline-variant' : 'bg-surface-container-lowest border-2 border-outline-variant/30'}`}>
                  {isProcessing && <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>}
                  {isCompleted && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">check</span>}
                </div>
                <div>
                  <p className={`text-[0.75rem] font-bold uppercase tracking-wider ${isProcessing ? 'text-primary-container' : isCompleted ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>AI Analysis</p>
                  <p className={`text-xs ${isProcessing ? 'text-primary-container/80' : isCompleted ? 'text-on-surface-variant/60' : 'text-on-surface-variant/30'}`}>{isProcessing ? 'Running' : isCompleted ? 'Complete' : 'Pending completion'}</p>
                </div>
              </div>

              {/* Future */}
              <div className="relative flex items-start gap-4">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center ${isCompleted ? 'bg-surface-container-high border-2 border-outline-variant' : 'bg-surface-container-lowest border-2 border-outline-variant/30'}`}>
                  {isCompleted && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">check</span>}
                </div>
                <div>
                  <p className={`text-[0.75rem] font-bold uppercase tracking-wider ${isCompleted ? 'text-on-surface-variant' : 'text-on-surface-variant/40'}`}>Insight Distribution</p>
                  <p className={`text-xs ${isCompleted ? 'text-on-surface-variant/60' : 'text-on-surface-variant/30'}`}>{isCompleted ? 'Ready' : 'Final step'}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="col-span-12 lg:col-span-8 space-y-8">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-2xl overflow-hidden bg-surface-container-lowest border border-outline-variant/10">
            <div className="h-2 w-full bg-gradient-to-r from-primary to-primary-container"></div>
            <div className="p-10">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h2 className="text-4xl font-black tracking-tighter mb-4 text-[#FFFFEA]">Executive Summary</h2>
                  <p className="text-on-surface-variant max-w-xl leading-relaxed">
                    {activeSummary?.overview || 'Meet Scribe is currently distilling the discussion into high-impact blocks. Real-time extraction of goals, constraints, and decisions is active.'}
                  </p>
                </div>
                {isCompleted && (
                  <button className="flex items-center gap-2 px-6 py-3 rounded-lg border border-primary-container/30 text-primary-container hover:bg-primary-container/5 transition-all font-bold uppercase text-[0.75rem] tracking-widest active:scale-95">
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    Download Transcript
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#FFFFEA]/40 flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-primary-container"></span>
                    Key Points
                  </h3>
                  <ul className="space-y-6">
                    {keyPoints.map((point, i) => (
                      <li key={i} className="flex gap-4 group">
                        <div className="mt-1.5 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-primary-container shadow-[0_0_8px_#1ccad8]"></div>
                        <p className="text-on-surface leading-snug transition-colors group-hover:text-primary">
                          {point}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-[0.75rem] font-black uppercase tracking-[0.2em] text-[#FFFFEA]/40 flex items-center gap-2">
                    <span className="w-4 h-[1px] bg-primary-container"></span>
                    Action Items
                  </h3>
                  <div className="space-y-4">
                    {actionItems.map((item, i) => (
                      <label key={i} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-all cursor-pointer group">
                        <div className="w-6 h-6 rounded-lg border-2 border-primary-container flex items-center justify-center group-hover:bg-primary-container/10">
                          {activeSummary && i === 0 && <span className="material-symbols-outlined text-[18px] text-primary-container font-bold">check</span>}
                        </div>
                        <span className="text-on-surface font-medium">{item}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 px-6 py-4 rounded-full bg-black/40 backdrop-blur-2xl border border-white/5 shadow-2xl z-40">
        <button
          onClick={handleStop}
          disabled={!canStop || stopping}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${canStop ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-white/5 text-white/20'}`}
          title="Stop Scribe"
        >
          <span className="material-symbols-outlined">stop</span>
        </button>
        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
        <button className="material-symbols-outlined text-white/60 hover:text-primary-container transition-all">mic_off</button>
        <button className="material-symbols-outlined text-white/60 hover:text-primary-container transition-all">videocam</button>
        <button className="material-symbols-outlined text-white/60 hover:text-primary-container transition-all">add_comment</button>
        <div className="h-6 w-[1px] bg-white/10 mx-2"></div>
        <button className="px-6 py-2 rounded-full bg-primary-container text-on-primary font-bold text-sm tracking-tight active:scale-95 transition-all">
          Share Stream
        </button>
      </div>
    </div>
  )
}
