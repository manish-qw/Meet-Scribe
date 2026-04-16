/** Real-time status timeline. */

import { motion, AnimatePresence } from 'framer-motion'
import { StatusPill } from '../ui/StatusPill'
import { Spinner } from '../ui/Spinner'

interface LiveStatusCardProps {
  status: string
  error: string | null
}

interface TimelineStep {
  key: string
  label: string
  description: string
}

const STEPS: TimelineStep[] = [
  { key: 'PENDING', label: 'Deploying Bot', description: 'Launching headless browser and navigating to meeting' },
  { key: 'WAITING_TO_BE_ADMITTED', label: 'Waiting for Admission', description: 'Bot is in the lobby — please admit "AI Scribe Bot"' },
  { key: 'RECORDING', label: 'Recording', description: 'Capturing live captions from the meeting' },
  { key: 'PROCESSING_AI', label: 'AI Processing', description: 'Gemini is analyzing the transcript' },
  { key: 'COMPLETED', label: 'Completed', description: 'Summary is ready!' },
]

const STATUS_ORDER = ['PENDING', 'WAITING_TO_BE_ADMITTED', 'RECORDING', 'PROCESSING_AI', 'COMPLETED']

function getStepStatus(stepKey: string, currentStatus: string): 'completed' | 'active' | 'pending' | 'failed' {
  const failedStatuses = ['FAILED', 'FAILED_ENTRY', 'FAILED_TIMEOUT', 'STOPPED']

  if (failedStatuses.includes(currentStatus)) {
    const currentIdx = STATUS_ORDER.indexOf(stepKey)
    // Find the most recent active step based on the failed status
    // For FAILED_ENTRY, the bot was at WAITING_TO_BE_ADMITTED
    const failedAtStep: Record<string, number> = {
      'FAILED_ENTRY': 1,
      'FAILED_TIMEOUT': 2,
      'STOPPED': 2,
      'FAILED': 3,
    }
    const failIdx = failedAtStep[currentStatus] ?? 0

    if (currentIdx < failIdx) return 'completed'
    if (currentIdx === failIdx) return 'failed'
    return 'pending'
  }

  const currentIdx = STATUS_ORDER.indexOf(currentStatus)
  const stepIdx = STATUS_ORDER.indexOf(stepKey)

  if (stepIdx < currentIdx) return 'completed'
  if (stepIdx === currentIdx) return 'active'
  return 'pending'
}

export function LiveStatusCard({ status, error }: LiveStatusCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="glass-card p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Live Status</h3>
        </div>
        <StatusPill status={status} />
      </div>

      {/* Timeline */}
      <div className="space-y-0">
        {STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.key, status)
          const isLast = index === STEPS.length - 1

          return (
            <div key={step.key} className="flex gap-4">
              {/* Timeline line + indicator */}
              <div className="flex flex-col items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${step.key}-${stepStatus}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border
                      ${stepStatus === 'completed' ? 'bg-emerald-500/20 border-emerald-500/40' : ''}
                      ${stepStatus === 'active' ? 'bg-indigo-500/20 border-indigo-500/40 animate-glow' : ''}
                      ${stepStatus === 'pending' ? 'bg-white/5 border-white/10' : ''}
                      ${stepStatus === 'failed' ? 'bg-red-500/20 border-red-500/40' : ''}
                    `}
                  >
                    {stepStatus === 'completed' && (
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {stepStatus === 'active' && <Spinner size="sm" />}
                    {stepStatus === 'pending' && (
                      <div className="w-2 h-2 rounded-full bg-white/20" />
                    )}
                    {stepStatus === 'failed' && (
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </motion.div>
                </AnimatePresence>
                {!isLast && (
                  <div className={`
                    w-0.5 h-12 my-1
                    ${stepStatus === 'completed' ? 'bg-emerald-500/30' : 'bg-white/10'}
                  `} />
                )}
              </div>

              {/* Step content */}
              <div className="pb-8">
                <p className={`
                  font-semibold text-sm
                  ${stepStatus === 'completed' ? 'text-emerald-300' : ''}
                  ${stepStatus === 'active' ? 'text-white' : ''}
                  ${stepStatus === 'pending' ? 'text-white/30' : ''}
                  ${stepStatus === 'failed' ? 'text-red-400' : ''}
                `}>
                  {step.label}
                </p>
                <p className={`
                  text-xs mt-0.5
                  ${stepStatus === 'active' ? 'text-white/50' : 'text-white/20'}
                `}>
                  {step.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Error message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  )
}
