import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { v4 as uuidv4 } from 'uuid'
import api from '../lib/api'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { db, auth } from '../lib/firebase'

export function DashboardPage() {
  const [meetings, setMeetings] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [url, setUrl] = useState('')
  const [deployLoading, setDeployLoading] = useState(false)
  const [userProfileData, setUserProfileData] = useState<any>(null)
  const [showSignOutMenu, setShowSignOutMenu] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMeetings([])
        setLoadingHistory(false)
        navigate('/', { replace: true })
        return
      }
      setUserProfileData(user)

      try {
        const q = query(
          collection(db, 'meetings'),
          where('user_id', '==', user.uid),
          orderBy('created_at', 'desc')
        )
        const snapshot = await getDocs(q)
        const docsData = snapshot.docs.map(doc => ({
          meeting_id: doc.id,
          ...doc.data()
        }))
        setMeetings(docsData)
      } catch (err) {
        console.error('Failed to fetch meetings', err)
      } finally {
        setLoadingHistory(false)
      }
    })

    return () => unsubscribe()
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/')
    } catch (e) {
      console.error(e)
    }
  }

  const isValidUrl = (input: string) => {
    return input.includes('meet.google.com/')
  }

  const handleDeploy = async () => {
    if (!url.trim() || !isValidUrl(url)) {
      alert('Please enter a valid Google Meet URL')
      return
    }
    setDeployLoading(true)
    const meetingId = uuidv4()
    try {
      await api.post('/api/meetings/join', {
        url: url.trim(),
        meeting_id: meetingId,
      })
      navigate(`/meeting/${meetingId}`)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to deploy bot.')
    } finally {
      setDeployLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    try {
      let date: Date;
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      } else if (timestamp._seconds) {
        date = new Date(timestamp._seconds * 1000)
      } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000)
      } else {
        date = new Date(timestamp)
      }

      if (isNaN(date.getTime())) return 'Unknown'

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="bg-black text-[#FFFFEA] min-h-screen" style={{ zoom: 0.85 }}>
      <nav className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-xl flex justify-between items-center px-8 h-20 max-w-full mx-auto tonal-shift bg-zinc-900/50 shadow-[0_20px_40px_rgba(28,202,216,0.05)]">
        <div className="flex items-center gap-8">
          <div className="text-2xl font-black tracking-tighter text-[#FFFFEA]">Meet Scribe</div>
          <div className="hidden md:flex gap-6 items-center">
            <Link className="text-[#1ccad8] border-b-2 border-[#1ccad8] pb-1 font-bold font-['Inter'] tracking-tight transition-all duration-300" to="/dashboard">Dashboard</Link>
            <Link className="text-[#FFFFEA]/70 hover:text-[#1ccad8] transition-colors font-['Inter'] tracking-tight" to="/dashboard">Meetings</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-[#FFFFEA]/70 hover:text-[#1ccad8] transition-colors">notifications</button>

          <div className="relative">
            <button onClick={() => setShowSignOutMenu(!showSignOutMenu)} className="h-10 w-10 rounded-full bg-surface-container-highest overflow-hidden border border-[#1ccad8]/20 cursor-pointer hover:border-[#1ccad8] transition-colors" title="Profile">
              <img
                alt="User profile"
                className="w-full h-full object-cover"
                src={userProfileData?.photoURL || "https://lh3.googleusercontent.com/aida-public/AB6AXuBAp0m-h2i4CaaZI4hIqzvilzCOqIArJVKFvVsxgsUrEv8ep1FkBrUX7wmeD5yi0bYygyCUm-_1_KdP_Cua8-TuY8XMBmjtWuQk11tdFBj0apCdyrXcomN_xmN9kjRgw-1pRrJBB6WQBoYUEIXLilSOf8LhPAKcfiPlahXsC3dvDucdEzryc2oxDDbqtyX4oDq2prs5BIGfrsnW1DZw6pHleYTjM8NE5DN9bLQEK1XbwaPWtn-4re7hmTotPSIF15I9FJd3LhCCPg"}
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

      <main className="pt-32 pb-20 px-8 max-w-7xl mx-auto">
        <section className="mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                Intelligent <br />
                <span className="text-[#1ccad8]">Context</span> Capture.
              </h1>
              <p className="text-xl text-on-surface-variant max-w-xl mb-10 leading-relaxed">
                Deploy your digital scribe directly into any Google Meet session. Precise live transcription meets surgical AI insight extraction.
              </p>
            </div>

            <div className="lg:col-span-5">
              <div className="bg-surface-container-low p-8 rounded-xl border border-outline-variant/15 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#1ccad8]/5 blur-3xl rounded-full -mr-16 -mt-16"></div>
                <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[#1ccad8] mb-6">Quick Deploy</h3>
                <div className="space-y-6">
                  <div className="relative">
                    <label className="block text-[0.7rem] uppercase tracking-widest text-[#FFFFEA]/50 mb-2">Meeting URL</label>
                    <input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleDeploy()}
                      className="w-full bg-surface-container-lowest border-none rounded-lg p-4 text-[#FFFFEA] placeholder-[#FFFFEA]/20 focus:ring-1 focus:ring-[#1ccad8] transition-all outline-none"
                      placeholder="paste meeting link here..."
                      type="text"
                    />
                  </div>
                  <button
                    onClick={handleDeploy}
                    disabled={deployLoading}
                    className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold rounded-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {deployLoading ? 'Deploying...' : 'Deploy Scribe'}
                    <span className="material-symbols-outlined">rocket_launch</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-12">
          <div>
            <div className="flex justify-between items-end mb-8">
              <h2 className="text-3xl font-bold tracking-tight">Recent Archives</h2>
              <a className="text-xs font-bold uppercase tracking-widest text-[#1ccad8] hover:underline underline-offset-4" href="#">View All</a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {loadingHistory ? (
                <div className="text-[#FFFFEA]/50 text-sm">Loading archives...</div>
              ) : meetings.length === 0 ? (
                <div className="text-[#FFFFEA]/50 text-sm">No recent archives. Start a meeting!</div>
              ) : (
                meetings.map((meeting) => {
                  const isLive = meeting.status === 'live' || meeting.status === 'recording' || meeting.status === 'joining'
                  return (
                    <div
                      key={meeting.meeting_id}
                      onClick={() => navigate(`/meeting/${meeting.meeting_id}`)}
                      className={`bg-surface-container-low p-6 rounded-xl hover:bg-surface-container-high transition-all duration-300 cursor-pointer group ${isLive ? 'border-l-2 border-transparent hover:border-[#1ccad8]' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                          {isLive ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-[#1ccad8] animate-pulse shadow-[0_0_8px_#1ccad8]"></span>
                              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-[#1ccad8]">Recording</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[1rem] text-[#1ccad8]">check_circle</span>
                              <span className="text-[0.65rem] font-bold uppercase tracking-widest text-on-surface-variant">Completed</span>
                            </>
                          )}
                        </div>
                        <span className="text-[0.65rem] text-[#FFFFEA]/30 uppercase tracking-tighter">
                          {isLive ? 'Live Now' : formatDate(meeting.created_at)}
                        </span>
                      </div>

                      <h4 className="text-xl font-bold mb-2 group-hover:text-[#1ccad8] transition-colors line-clamp-1">
                        {meeting.title || meeting.meet_url}
                      </h4>
                      <p className="text-sm text-on-surface-variant mb-6 line-clamp-2">
                        {meeting.summary?.overview || (isLive ? 'Extracting intelligence from meeting...' : 'Processing transcript...')}
                      </p>

                      {isLive ? (
                        <div className="flex gap-2">
                          <span className="px-3 py-1 rounded-full bg-[#1ccad8]/10 text-[#1ccad8] text-[0.6rem] font-bold uppercase tracking-wider">Live</span>
                        </div>
                      ) : (
                        meeting.summary?.overview && (
                          <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-sm text-[#1ccad8]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
                            <span className="text-[0.7rem] text-on-surface-variant">Summary Generated</span>
                          </div>
                        )
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="md:hidden fixed bottom-8 right-8 z-50">
        <button className="w-16 h-16 rounded-full bg-[#1ccad8] text-on-primary shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </div>
    </div>
  )
}
