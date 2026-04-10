'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Convert UTC timestamp to YYYY-MM-DD in the original workout timezone
function toLocalDate(utcStr, tz) {
  if (!utcStr) return ''
  const d = new Date(utcStr)
  return d.toLocaleDateString('en-CA', { timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone })
}

export default function GymStats() {
  const { supabase } = useAuth()
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [personalRecords, setPersonalRecords] = useState([])
  const [mainTab, setMainTab] = useState('frequency')
  const [timeRange, setTimeRange] = useState('week')

  // Month/Year navigation
  const [selectedMonth, setSelectedMonth] = useState(() => new Date())
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())
  const [allSessions, setAllSessions] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: sessData } = await supabase
          .from('workout_sessions')
          .select('id, day_id, performed_at, timezone, workout_days(name)')
          .order('performed_at', { ascending: false })
          .limit(200)
        setSessions(sessData || [])

        const { data: logs } = await supabase
          .from('workout_logs')
          .select('exercise_id, weight, reps, exercises(name)')
          .order('weight', { ascending: false })

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

  // Lazy-fetch all sessions when switching to yearly view
  useEffect(() => {
    if (timeRange !== 'year' || allSessions !== null) return
    async function fetchAllSessions() {
      const { data } = await supabase
        .from('workout_sessions')
        .select('id, day_id, performed_at, timezone, workout_days(name)')
        .order('performed_at', { ascending: false })
      setAllSessions(data || [])
    }
    fetchAllSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, allSessions])

  // ── Helpers ──

  function getWeekSessions() {
    const now = new Date()
    const dayOfWeek = (now.getDay() + 6) % 7
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    return DAYS.map((_, i) => {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
      const hasSessions = sessions.some((s) => toLocalDate(s.performed_at, s.timezone) === dateStr)
      return { day: DAYS[i], date: dateStr, active: hasSessions }
    })
  }

  function getMonthData(targetDate, sessionsList) {
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startOffset = (firstDay.getDay() + 6) % 7 // Monday-start

    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const activeDays = new Set()
    sessionsList.forEach(s => {
      const ld = toLocalDate(s.performed_at, s.timezone)
      if (ld.startsWith(prefix)) {
        activeDays.add(parseInt(ld.substring(8, 10), 10))
      }
    })

    const totalWorkouts = sessionsList.filter(s => toLocalDate(s.performed_at, s.timezone).startsWith(prefix)).length
    const weeksInMonth = Math.ceil((daysInMonth + startOffset) / 7)
    const avgPerWeek = weeksInMonth > 0 ? (totalWorkouts / weeksInMonth).toFixed(1) : '0'

    const dayBreakdown = {}
    sessionsList.forEach(s => {
      if (toLocalDate(s.performed_at, s.timezone).startsWith(prefix)) {
        const name = s.workout_days?.name || 'Unknown'
        dayBreakdown[name] = (dayBreakdown[name] || 0) + 1
      }
    })
    const topDays = Object.entries(dayBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return { year, month, daysInMonth, startOffset, activeDays, totalWorkouts, avgPerWeek, topDays }
  }

  function getYearData(targetYear, sessionsList) {
    const months = Array.from({ length: 12 }, (_, i) => {
      const prefix = `${targetYear}-${String(i + 1).padStart(2, '0')}`
      const count = sessionsList.filter(s => toLocalDate(s.performed_at, s.timezone).startsWith(prefix)).length
      return {
        index: i,
        label: new Date(targetYear, i, 1).toLocaleString('default', { month: 'short' }),
        count,
      }
    })

    const totalWorkouts = months.reduce((sum, m) => sum + m.count, 0)
    const maxMonth = Math.max(...months.map(m => m.count), 1)
    const activeMonths = months.filter(m => m.count > 0)
    const avgPerMonth = activeMonths.length > 0 ? (totalWorkouts / activeMonths.length).toFixed(1) : '0'
    const bestMonth = months.reduce((best, m) => m.count > best.count ? m : best, months[0])

    return { months, totalWorkouts, maxMonth, avgPerMonth, bestMonth }
  }

  function navigateMonth(direction) {
    setSelectedMonth(prev => {
      const next = new Date(prev)
      next.setMonth(next.getMonth() + direction)
      return next
    })
  }

  function navigateYear(direction) {
    setSelectedYear(prev => prev + direction)
  }

  const now = new Date()
  const isCurrentMonth = selectedMonth.getFullYear() === now.getFullYear()
    && selectedMonth.getMonth() === now.getMonth()
  const isCurrentYear = selectedYear === now.getFullYear()

  const weekData = getWeekSessions()
  const weekWorkouts = weekData.filter((d) => d.active).length
  const allTimeCount = allSessions !== null ? allSessions.length : sessions.length

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
      <div className="flex border-b border-border mb-4">
        {['frequency', 'prs'].map((tab) => (
          <button
            key={tab}
            onClick={() => setMainTab(tab)}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-colors ${
              mainTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary'
            }`}
          >
            {tab === 'frequency' ? 'Frequency' : 'PRs'}
          </button>
        ))}
      </div>

      {mainTab === 'frequency' && (
        <>
          {/* Time range tabs */}
          <div className="bg-bg-card rounded-xl p-1 flex mb-6">
            {['week', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => {
                  setTimeRange(range)
                  if (range === 'month') setSelectedMonth(new Date())
                  if (range === 'year') setSelectedYear(new Date().getFullYear())
                }}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  timeRange === range
                    ? 'bg-bg-nav text-accent '
                    : 'text-text-secondary'
                }`}
              >
                {range.charAt(0).toUpperCase() + range.slice(1)}
              </button>
            ))}
          </div>

          {/* ── Weekly View ── */}
          {timeRange === 'week' && (
            <>
              <div className="flex justify-between mb-6">
                {weekData.map((d) => (
                  <div key={d.day} className="flex flex-col items-center gap-1.5">
                    <p className="text-[10px] font-bold text-text-secondary uppercase">{d.day}</p>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      d.active
                        ? 'bg-accent'
                        : 'bg-bg-card border-2 border-dashed border-border'
                    }`}>
                      {d.active && <span className="material-symbols-outlined text-white text-[16px]">check</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-bg-card border border-border rounded-2xl p-4 ">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">This Week</p>
                  <p className="text-2xl font-bold text-text-primary">{weekWorkouts}</p>
                  <p className="text-xs text-text-secondary">Workouts</p>
                </div>
                <div className="bg-bg-card border border-border rounded-2xl p-4 ">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">All Time</p>
                  <p className="text-2xl font-bold text-text-primary">{allTimeCount}</p>
                  <p className="text-xs text-text-secondary">Total Sessions</p>
                </div>
              </div>
            </>
          )}

          {/* ── Monthly View ── */}
          {timeRange === 'month' && (() => {
            const monthData = getMonthData(selectedMonth, sessions)
            const monthLabel = selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })

            return (
              <>
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => navigateMonth(-1)}
                    className="w-10 h-10 rounded-xl bg-bg-card flex items-center justify-center active:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-text-secondary text-[20px]">chevron_left</span>
                  </button>
                  <p className="text-sm font-bold text-text-primary">{monthLabel}</p>
                  <button
                    onClick={() => navigateMonth(1)}
                    disabled={isCurrentMonth}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCurrentMonth ? 'bg-bg-card text-text-secondary/60' : 'bg-bg-card text-text-secondary active:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <p key={i} className="text-[10px] font-bold text-text-secondary uppercase text-center">{d}</p>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                  {Array.from({ length: monthData.startOffset }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: monthData.daysInMonth }).map((_, i) => {
                    const dayNum = i + 1
                    const isActive = monthData.activeDays.has(dayNum)
                    const isToday = isCurrentMonth && dayNum === now.getDate()
                    return (
                      <div key={dayNum} className="flex items-center justify-center aspect-square">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isActive
                            ? 'bg-accent text-white'
                            : isToday
                              ? 'bg-bg-card border-2 border-accent text-accent'
                              : 'text-text-secondary'
                        }`}>
                          {dayNum}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Summary stat cards */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-bg-card border border-border rounded-2xl p-4 ">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">This Month</p>
                    <p className="text-2xl font-bold text-text-primary">{monthData.totalWorkouts}</p>
                    <p className="text-xs text-text-secondary">Workouts</p>
                  </div>
                  <div className="bg-bg-card border border-border rounded-2xl p-4 ">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Weekly Avg</p>
                    <p className="text-2xl font-bold text-text-primary">{monthData.avgPerWeek}</p>
                    <p className="text-xs text-text-secondary">Per Week</p>
                  </div>
                </div>

                {/* Most trained breakdown */}
                {monthData.topDays.length > 0 && (
                  <div className="bg-bg-card border border-border rounded-2xl p-4 ">
                    <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-3">Most Trained</p>
                    <div className="flex flex-col gap-2.5">
                      {monthData.topDays.map(([name, count]) => {
                        const pct = monthData.totalWorkouts > 0 ? (count / monthData.totalWorkouts) * 100 : 0
                        return (
                          <div key={name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-accent text-[16px]">fitness_center</span>
                                </div>
                                <p className="text-sm font-semibold text-text-primary">{name}</p>
                              </div>
                              <p className="text-sm font-bold text-accent">{count}×</p>
                            </div>
                            <div className="h-1.5 bg-bg-card rounded-full overflow-hidden ml-10">
                              <div className="h-full bg-accent/30 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}

          {/* ── Yearly View ── */}
          {timeRange === 'year' && (() => {
            const yearSessions = allSessions ?? sessions
            const isLoadingYear = allSessions === null

            if (isLoadingYear) {
              return (
                <div className="flex flex-col gap-3">
                  <div className="bg-bg-card rounded-xl w-full h-48 animate-pulse" />
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map(i => <div key={i} className="bg-bg-card rounded-xl h-20 animate-pulse" />)}
                  </div>
                </div>
              )
            }

            const yearData = getYearData(selectedYear, yearSessions)

            return (
              <>
                {/* Year navigation */}
                <div className="flex items-center justify-between mb-5">
                  <button
                    onClick={() => navigateYear(-1)}
                    className="w-10 h-10 rounded-xl bg-bg-card flex items-center justify-center active:bg-white/5"
                  >
                    <span className="material-symbols-outlined text-text-secondary text-[20px]">chevron_left</span>
                  </button>
                  <p className="text-sm font-bold text-text-primary">{selectedYear}</p>
                  <button
                    onClick={() => navigateYear(1)}
                    disabled={isCurrentYear}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isCurrentYear ? 'bg-bg-card text-text-secondary/60' : 'bg-bg-card text-text-secondary active:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>

                {yearData.totalWorkouts === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-secondary">
                    <span className="material-symbols-outlined text-4xl">event_busy</span>
                    <p className="text-sm">No workouts in {selectedYear}</p>
                  </div>
                ) : (
                  <>
                    {/* Bar chart */}
                    <div className="bg-bg-card border border-border rounded-2xl p-4  mb-4">
                      <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-4">Workouts Per Month</p>
                      <div className="flex items-end justify-between gap-1" style={{ height: '140px' }}>
                        {yearData.months.map((m) => {
                          const heightPct = yearData.maxMonth > 0 ? (m.count / yearData.maxMonth) * 100 : 0
                          const isCurrent = isCurrentYear && m.index === now.getMonth()
                          return (
                            <div key={m.index} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                              {m.count > 0 && (
                                <p className="text-[10px] font-bold text-text-secondary">{m.count}</p>
                              )}
                              <div
                                className={`w-full rounded-t-md ${
                                  m.count > 0
                                    ? isCurrent ? 'bg-accent' : 'bg-accent/40'
                                    : 'bg-bg-card'
                                }`}
                                style={{
                                  height: m.count > 0 ? `${Math.max(heightPct, 8)}%` : '4px',
                                  minHeight: m.count > 0 ? '12px' : '4px',
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex justify-between gap-1 mt-2">
                        {yearData.months.map((m) => (
                          <p key={m.index} className="flex-1 text-center text-[9px] font-bold text-text-secondary uppercase">
                            {m.label.charAt(0)}
                          </p>
                        ))}
                      </div>
                    </div>

                    {/* Summary stat cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-bg-card border border-border rounded-2xl p-3 ">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Total</p>
                        <p className="text-xl font-bold text-text-primary">{yearData.totalWorkouts}</p>
                        <p className="text-[10px] text-text-secondary">Workouts</p>
                      </div>
                      <div className="bg-bg-card border border-border rounded-2xl p-3 ">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Avg</p>
                        <p className="text-xl font-bold text-text-primary">{yearData.avgPerMonth}</p>
                        <p className="text-[10px] text-text-secondary">Per Month</p>
                      </div>
                      <div className="bg-bg-card border border-border rounded-2xl p-3 ">
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest mb-1">Best</p>
                        <p className="text-xl font-bold text-accent">{yearData.bestMonth.label}</p>
                        <p className="text-[10px] text-text-secondary">{yearData.bestMonth.count} workouts</p>
                      </div>
                    </div>
                  </>
                )}
              </>
            )
          })()}

          {/* Personal Records preview */}
          {personalRecords.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-text-primary">Personal Records</h2>
                <button onClick={() => setMainTab('prs')} className="text-xs font-semibold text-accent">View All</button>
              </div>
              <div className="flex flex-col gap-2">
                {personalRecords.slice(0, 3).map((pr) => (
                  <div key={pr.exercise_id} className="bg-bg-card border border-border rounded-2xl p-3 flex items-center gap-3 ">
                    <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-accent text-[18px]">emoji_events</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text-primary truncate">{pr.exercises?.name}</p>
                      <p className="text-xs text-text-secondary">Best lift</p>
                    </div>
                    <p className="text-sm font-bold text-accent">{pr.weight} lbs</p>
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
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
              <span className="material-symbols-outlined text-5xl">emoji_events</span>
              <p className="text-sm">Complete workouts to track personal records.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {personalRecords.map((pr) => (
                <div key={pr.exercise_id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3 ">
                  <div className="w-12 h-12 rounded-lg bg-accent/15 flex items-center justify-center">
                    <span className="material-symbols-outlined text-accent text-xl">emoji_events</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-text-primary truncate">{pr.exercises?.name}</p>
                    <p className="text-xs text-text-secondary">Best: {pr.weight} lbs × {pr.reps} reps</p>
                  </div>
                  <p className="text-lg font-bold text-accent">{pr.weight}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
