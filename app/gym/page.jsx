'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'

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

  useEffect(() => {
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
    fetchDays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="px-4 pt-4 pb-4">
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
              <div
                key={day.id}
                className="bg-white border border-slate-200 rounded-xl shadow-sm p-3 flex items-center gap-3"
              >
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

                {/* Start button */}
                <button
                  onClick={() => router.push(`/gym/workout/${day.id}`)}
                  className="bg-primary text-white font-semibold text-sm rounded-lg px-4 h-9 shrink-0 active:bg-primary/90"
                  aria-label="Start workout"
                >
                  Start
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Create New Day Button */}
      <button
        onClick={() => router.push('/gym/builder')}
        className="border-2 border-dashed border-slate-300 bg-slate-100 rounded-xl h-14 w-full font-bold text-slate-600 text-sm mt-4 flex items-center justify-center gap-2 active:bg-slate-200"
        aria-label="Create new workout day"
      >
        <span className="material-symbols-outlined text-[20px]">add_circle</span>
        Create New Day
      </button>
    </div>
  )
}
