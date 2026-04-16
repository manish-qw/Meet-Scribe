/** Status badge component. */

import { motion } from 'framer-motion'

interface StatusPillProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; glow?: boolean }> = {
  CONNECTING: {
    label: 'Connecting',
    color: 'text-blue-300',
    bg: 'bg-blue-500/20 border-blue-500/30',
  },
  PENDING: {
    label: 'Deploying Bot',
    color: 'text-yellow-300',
    bg: 'bg-yellow-500/20 border-yellow-500/30',
    glow: true,
  },
  WAITING_TO_BE_ADMITTED: {
    label: 'Waiting for Admission',
    color: 'text-orange-300',
    bg: 'bg-orange-500/20 border-orange-500/30',
    glow: true,
  },
  RECORDING: {
    label: 'Recording',
    color: 'text-red-300',
    bg: 'bg-red-500/20 border-red-500/30',
    glow: true,
  },
  PROCESSING_AI: {
    label: 'AI Processing',
    color: 'text-purple-300',
    bg: 'bg-purple-500/20 border-purple-500/30',
    glow: true,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/20 border-emerald-500/30',
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30',
  },
  FAILED_ENTRY: {
    label: 'Entry Failed',
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30',
  },
  FAILED_TIMEOUT: {
    label: 'Timed Out',
    color: 'text-red-400',
    bg: 'bg-red-500/20 border-red-500/30',
  },
  STOPPED: {
    label: 'Stopped',
    color: 'text-gray-400',
    bg: 'bg-gray-500/20 border-gray-500/30',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function StatusPill({ status, size = 'md' }: StatusPillProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: 'text-gray-400',
    bg: 'bg-gray-500/20 border-gray-500/30',
  }

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bg} ${config.color} ${sizeClasses[size]}
      `}
    >
      {config.glow && (
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.color.replace('text-', 'bg-')}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.color.replace('text-', 'bg-')}`} />
        </span>
      )}
      {config.label}
    </motion.span>
  )
}
