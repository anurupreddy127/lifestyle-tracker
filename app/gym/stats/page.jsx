'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function GymStats() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [personalRecords, setPersonalRecords] = useState([])
  const [mainTab, setMainTab] = useState('frequency')
  const [timeRange, setTimeRange] = useState('week')

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch sessions for frequency
        const { data: sessData } = await supabase
          .from('workout_sessions')
          .select('id, day_id, performed_at, workout_days(name)')
          .order('performed_at', { ascending: false })
          .limit(200)
        setSessions(sessData || [])

        // Fetch PRs (max weight per exercise)
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('exercise_id, weight, reps, exercises(name)')
          .order('weight', { ascending: false })

        // Deduplicate: keep highest weight per exercise
        const prMap = {}
        ;(logs || []).forEach((log) => {
          if (!prMap[log.exercise_id] || log.weight > prMap[log.exercise_id].weight) {
            prMap[log.exercise_id] = log
          }
        })
        setPersonalRecords(Object.values(prMap).sort((a, b) => b.weight - a.weight))

        setLoading(false)
      } catch {
        setLoading(false)
      }
    }
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Get sessions for current week
  function getWeekSessions() {
    const now = new Date()
    const dayOfWeek = (now.getDay() + 6) % 7 // Mon=0
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    return DAYS.map((_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      const dateStr = day.toISOString().split('T')[0]
      const hasSessions = sessions.some((s) => s.performed_at?.startsWith(dateStr))
      return { day: DAYS[i], date: dateStr, active: hasSessions }
    })
  }

  const weekData = getWeekSessions()
  const weekWorkouts = weekData.filter((d) => d.active).length
  const totalSessions = sessions.length

  if (loading) {
    return (
      <div className="px-4 pt-4 pb-4">
        <LoadingSkeleton count={5} height="h-24" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-2 pb-4">
      {/* Main tabs */}
      <div className="flex border-b border-slate-200 mb-4">
        {['frequency', 'prs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              mainTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-slate-400'
            }`}
          >
            {tab === 'frequency' ? 'Frequency' : 'PRs'}
          </button>
        ))}
      </div>

      {mainTab === 'frequency' && (
        <>
          {/* Time range tabs */}
          <div className="bg-slate-200 rounded-xl p-1 flex mb-6">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-slate-600'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* Weekly view */}
          {timeRange === 'week' && (
            <>
              {/* Day indicators */}
              <div className="flex justify-between mb-6">
                {weekData.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{d.day}</p>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      d.active
                        ? 'bg-primary'
                        : 'bg-slate-100 border-2 border-dashed border-slate-300'
                    }`}>
                      {d.active && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">This Week</p>
                  <p className="text-2xl font-bold text-slate-900">{weekWorkouts}</p>
                  <p className="text-xs text-slate-500">Workouts</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">All Time</p>
                  <p className="text-2xl font-bold text-slate-900">{totalSessions}</p>
                  <p className="text-xs text-slate-500">Total Sessions</p>
                </div>
              </div>
            </>
          )}

          {/* Month/Year placeholder */}
          {(timeRange === 'month' || timeRange === 'year') && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-4xl">calendar_month</span>
              <p className="text-sm">{timeRange === 'month' ? 'Monthly' : 'Yearly'} view coming soon</p>
            </div>
          )}

          {/* Personal Records preview */}
          {personalRecords.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">Personal Records</h2>
                <button onClick={() => setMainTab('prs')} className="text-xs font-semibold text-primary">View All</button>
              </div>
              <div className="flex flex-col gap-2">
                {personalRecords.slice(0, 3).map((pr) => (
                  <div key={pr.exercise_id} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-[18px]">emoji_events</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{pr.exercises?.name}</p>
                      <p className="text-xs text-slate-500">Best lift</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{pr.weight} lbs</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* PRs Tab */}
      {mainTab === 'prs' && (
        <>
          {personalRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
              <span className="material-symbols-outlined text-5xl">emoji_events</span>
              <p className="text-sm">Complete workouts to track personal records.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {personalRecords.map((pr) => (
                <div key={pr.exercise_id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-xl">emoji_events</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-900 truncate">{pr.exercises?.name}</p>
                    <p className="text-xs text-slate-500">Best: {pr.weight} lbs × {pr.reps} reps</p>
                  </div>
                  <p className="text-lg font-bold text-primary">{pr.weight}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
