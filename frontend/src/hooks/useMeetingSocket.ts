/** WebSocket hook for real-time meeting status updates. */

import { useState, useEffect, useRef, useCallback } from 'react'
import { API_URL } from '../lib/api'

export interface MeetingSummary {
  overview: string
  key_points: string[]
  action_items: string[]
}

interface MeetingSocketState {
  status: string
  summary: MeetingSummary | null
  error: string | null
  isConnected: boolean
}

const WS_URL = API_URL.replace(/^http/, 'ws')
const MAX_RECONNECT_ATTEMPTS = 5
const BASE_DELAY = 1000 // 1 second

export function useMeetingSocket(meetingId: string | null): MeetingSocketState {
  const [status, setStatus] = useState<string>('CONNECTING')
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttempts = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const pingTimer = useRef<ReturnType<typeof setInterval>>()

  const cleanup = useCallback(() => {
    if (pingTimer.current) clearInterval(pingTimer.current)
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!meetingId) return

    const connect = () => {
      cleanup()

      const ws = new WebSocket(`${WS_URL}/ws/${meetingId}`)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectAttempts.current = 0

        // Keepalive pings
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping')
          }
        }, 30000)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Skip pong
          if (data.type === 'pong') return

          if (data.status) {
            setStatus(data.status)
          }

          if (data.summary) {
            setSummary(data.summary)
          }

          if (data.error) {
            setError(data.error)
          }

          // Terminal states
          const terminalStates = [
            'COMPLETED', 'FAILED', 'FAILED_ENTRY',
            'FAILED_TIMEOUT', 'STOPPED'
          ]
          if (terminalStates.includes(data.status)) {
            // Don't reconnect on terminal states
            reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e)
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        if (pingTimer.current) clearInterval(pingTimer.current)

        // Exponential backoff
        if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          const delay = BASE_DELAY * Math.pow(2, reconnectAttempts.current)
          reconnectTimer.current = setTimeout(() => {
            reconnectAttempts.current++
            connect()
          }, delay)
        }
      }

      ws.onerror = (e) => {
        console.error('WebSocket error:', e)
      }
    }

    connect()

    return () => {
      reconnectAttempts.current = MAX_RECONNECT_ATTEMPTS // prevent reconnect on unmount
      cleanup()
    }
  }, [meetingId, cleanup])

  return { status, summary, error, isConnected }
}
