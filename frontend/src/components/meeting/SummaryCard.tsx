/** Rendered AI summary output. */

import { motion } from 'framer-motion'
import { useState } from 'react'
import api from '../../lib/api'
import { Button } from '../ui/Button'
import type { MeetingSummary } from '../../hooks/useMeetingSocket'

interface SummaryCardProps {
  summary: MeetingSummary
  meetingId: string
}

export function SummaryCard({ summary, meetingId }: SummaryCardProps) {
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const response = await api.get(`/api/meetings/${meetingId}`)
      const downloadUrl = response.data.download_url
      if (downloadUrl) {
        window.open(downloadUrl, '_blank')
      }
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="glass-card p-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Meeting Summary</h3>
        </div>

        <Button
          id="download-transcript-btn"
          onClick={handleDownload}
          loading={downloading}
          variant="secondary"
          size="sm"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download Transcript
          </span>
        </Button>
      </motion.div>

      {/* Overview */}
      <motion.div variants={itemVariants} className="mb-8">
        <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Overview
        </h4>
        <p className="text-white/70 leading-relaxed text-sm">
          {summary.overview}
        </p>
      </motion.div>

      {/* Key Points */}
      {summary.key_points.length > 0 && (
        <motion.div variants={itemVariants} className="mb-8">
          <h4 className="text-sm font-semibold text-teal-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Key Points
          </h4>
          <ul className="space-y-2.5">
            {summary.key_points.map((point, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="flex items-start gap-3 text-sm text-white/70"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />
                {point}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Action Items */}
      {summary.action_items.length > 0 && (
        <motion.div variants={itemVariants}>
          <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            Action Items
          </h4>
          <ul className="space-y-2.5">
            {summary.action_items.map((item, idx) => {
              // Parse "Name: task" format
              const colonIdx = item.indexOf(':')
              const hasAssignee = colonIdx > 0 && colonIdx < 30
              const assignee = hasAssignee ? item.slice(0, colonIdx).trim() : null
              const task = hasAssignee ? item.slice(colonIdx + 1).trim() : item

              return (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className="flex items-start gap-3 text-sm"
                >
                  <div className="mt-0.5 w-4 h-4 rounded border border-amber-500/30 bg-amber-500/10 flex-shrink-0 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/70">
                    {assignee && (
                      <span className="font-semibold text-amber-300">{assignee}: </span>
                    )}
                    {task}
                  </span>
                </motion.li>
              )
            })}
          </ul>
        </motion.div>
      )}
    </motion.div>
  )
}
