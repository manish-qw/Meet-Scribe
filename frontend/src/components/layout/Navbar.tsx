/** Navbar and user info. */

import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

export function Navbar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-white/5 bg-navy-900/80 backdrop-blur-xl"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3 group cursor-pointer"
            id="nav-logo"
          >
            <div className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <span className="text-lg font-bold text-white group-hover:text-gradient transition-all duration-300">
              Meet Scribe
            </span>
          </button>

          {/* User info + sign out */}
          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full ring-2 ring-white/10"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center text-white font-semibold text-sm">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-white/70 font-medium">
                  {user.displayName || user.email}
                </span>
              </div>

              <button
                onClick={handleSignOut}
                id="nav-signout"
                className="px-4 py-2 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300 cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.nav>
  )
}
