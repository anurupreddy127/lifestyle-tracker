'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import SwipeableCard from '@/components/SwipeableCard'

const GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
  'from-cyan-500 to-blue-600',
]

export default function GymHome() {
  const router = useRouter()
  const { supabase } = useAuth()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeWorkout, setActiveWorkout] = useState(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('activeWorkout')
      if (raw) setActiveWorkout(JSON.parse(raw))
    } catch {}
  }, [])

  async function fetchDays() {
    try {
      const { data } = await supabase
        .from('workout_days')
        .select('id, name, day_exercises(count)')
        .order('created_at', { ascending: true })
      setDays(data || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchDays() }, [])

  async function handleDeleteDay(dayId) {
    try {
      await supabase.from('day_exercises').delete().eq('day_id', dayId)
      await supabase.from('workout_days').delete().eq('id', dayId)
      fetchDays()
    } catch {
      // Silent fail
    }
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {/* In-progress workout banner */}
      {activeWorkout && (
        <button
          onClick={() => router.push(`/gym/workout/${activeWorkout.day_id}`)}
          className="w-full mb-4 rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-primary/15 active:opacity-90 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, rgba(37, 106, 244, 0.85), rgba(59, 130, 246, 0.7))',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[22px]">play_arrow</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">In Progress</p>
            <p className="text-base font-bold text-white truncate">{activeWorkout.day_name}</p>
          </div>
          <span className="material-symbols-outlined text-white/70 text-[22px] shrink-0">arrow_forward</span>
        </button>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={4} height="h-24" />
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <span className="material-symbols-outlined text-5xl">fitness_center</span>
          <p className="text-sm">No days yet. Create your first workout!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day, index) => {
            const exerciseCount = day.day_exercises?.[0]?.count ?? 0
            const gradient = GRADIENTS[index % GRADIENTS.length]
            return (
              <SwipeableCard
                key={day.id}
                id={`day-${day.id}`}
                onEdit={() => router.push(`/gym/builder/${day.id}`)}
                onDelete={() => handleDeleteDay(day.id)}
              >
                <div className="glass rounded-2xl shadow-sm shadow-black/[0.03] p-3 flex items-center gap-3">
                  {/* Thumbnail */}
                  <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white/80 text-3xl">fitness_center</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-slate-900 truncate">{day.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-slate-500">
                      <span className="material-symbols-outlined text-[14px]">exercise</span>
                      <span className="text-xs font-medium">{exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}</span>
                    </div>
                  </div>

                  {/* Start / Resume button */}
                  <button
                    onClick={() => router.push(`/gym/workout/${day.id}`)}
                    className={`font-semibold text-sm rounded-lg px-4 h-9 shrink-0 ${
                      activeWorkout?.day_id === day.id
                        ? 'bg-amber-500 text-white active:bg-amber-600'
                        : 'bg-primary text-white active:bg-primary/90'
                    }`}
                    aria-label={activeWorkout?.day_id === day.id ? 'Resume workout' : 'Start workout'}
                  >
                    {activeWorkout?.day_id === day.id ? 'Resume' : 'Start'}
                  </button>
                </div>
              </SwipeableCard>
            )
          })}
        </div>
      )}

      {/* Create New Day Button */}
      <button
        onClick={() => router.push('/gym/builder')}
        className="border-2 border-dashed border-white/50 bg-white/30 backdrop-blur-sm rounded-2xl h-14 w-full font-bold text-slate-600 text-sm mt-4 flex items-center justify-center gap-2 active:bg-white/50 cursor-pointer transition-colors"
        aria-label="Create new workout day"
      >
        <span className="material-symbols-outlined text-[20px]">add_circle</span>
        Create New Day
      </button>
    </div>
  )
}
