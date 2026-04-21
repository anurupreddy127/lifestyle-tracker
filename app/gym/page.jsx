'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import SwipeableCard from '@/components/SwipeableCard'
import BottomSheet from '@/components/BottomSheet'

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
  const [previewDay, setPreviewDay] = useState(null)
  const [previewExercises, setPreviewExercises] = useState([])
  const [previewLoading, setPreviewLoading] = useState(false)

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

  async function openPreview(day) {
    setPreviewDay(day)
    setPreviewExercises([])
    setPreviewLoading(true)
    try {
      const { data } = await supabase
        .from('day_exercises')
        .select('target_sets, target_reps, sort_order, exercises(id, name, equipment_type)')
        .eq('day_id', day.id)
        .order('sort_order', { ascending: true })
      setPreviewExercises(data || [])
    } catch {
      setPreviewExercises([])
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePreview() {
    setPreviewDay(null)
  }

  return (
    <div className="px-4 pt-4 pb-4">
      {/* In-progress workout banner */}
      {activeWorkout && (
        <button
          onClick={() => router.push(`/gym/workout/${activeWorkout.day_id}`)}
          className="w-full mb-4 bg-accent rounded-2xl p-4 flex items-center gap-3 shadow-lg shadow-primary/20 active:opacity-90 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white text-[22px]">play_arrow</span>
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">In Progress</p>
            <p className="text-base font-bold text-white truncate">{activeWorkout.day_name}</p>
          </div>
          <span className="material-symbols-outlined text-white/60 text-[22px] shrink-0">arrow_forward</span>
        </button>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={4} height="h-24" />
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
          <span className="material-symbols-outlined text-5xl">fitness_center</span>
          <p className="text-sm">No days yet. Create your first workout!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day, index) => {
            const exerciseCount = day.day_exercises?.[0]?.count ?? 0
            const gradient = GRADIENTS[index % GRADIENTS.length]
            const isActive = activeWorkout?.day_id === day.id
            return (
              <SwipeableCard
                key={day.id}
                id={`day-${day.id}`}
                onEdit={() => router.push(`/gym/builder/${day.id}`)}
                onDelete={() => handleDeleteDay(day.id)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openPreview(day)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openPreview(day)
                    }
                  }}
                  className="bg-bg-card border border-border rounded-2xl p-3 flex items-center gap-3 cursor-pointer active:bg-bg-card/70 transition-colors"
                  aria-label={`View ${day.name} exercises`}
                >
                  {/* Thumbnail */}
                  <div className={`w-20 h-20 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined text-white/80 text-3xl">fitness_center</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-text-primary truncate">{day.name}</h3>
                    <div className="flex items-center gap-1 mt-1 text-text-secondary">
                      <span className="material-symbols-outlined text-[14px]">exercise</span>
                      <span className="text-xs font-medium">{exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}</span>
                    </div>
                  </div>

                  {/* Start / Resume button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      router.push(`/gym/workout/${day.id}`)
                    }}
                    className={`font-semibold text-sm rounded-lg px-4 h-9 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-white active:bg-amber-600'
                        : 'bg-accent text-white active:bg-accent/90'
                    }`}
                    aria-label={isActive ? 'Resume workout' : 'Start workout'}
                  >
                    {isActive ? 'Resume' : 'Start'}
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
        className="border-2 border-dashed border-border bg-bg-card/50 rounded-2xl h-14 w-full font-bold text-text-secondary text-sm mt-4 flex items-center justify-center gap-2 active:bg-bg-card cursor-pointer transition-colors"
        aria-label="Create new workout day"
      >
        <span className="material-symbols-outlined text-[20px]">add_circle</span>
        Create New Day
      </button>

      {/* Exercise preview sheet */}
      <BottomSheet
        isOpen={previewDay !== null}
        onClose={closePreview}
        title={previewDay?.name}
      >
        {previewLoading ? (
          <LoadingSkeleton count={4} height="h-14" />
        ) : previewExercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-secondary">
            <span className="material-symbols-outlined text-4xl">exercise</span>
            <p className="text-sm">No exercises in this workout yet.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {previewExercises.map((de, i) => (
              <li
                key={`${de.exercises?.id ?? i}-${i}`}
                className="bg-bg-input rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-bg-card flex items-center justify-center shrink-0 text-text-secondary text-xs font-bold">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">
                    {de.exercises?.name ?? 'Unknown'}
                  </p>
                  {de.exercises?.equipment_type && (
                    <p className="text-xs text-text-secondary truncate capitalize">
                      {de.exercises.equipment_type}
                    </p>
                  )}
                </div>
                <div className="text-xs font-semibold text-text-secondary shrink-0">
                  {de.target_sets} × {de.target_reps}
                </div>
              </li>
            ))}
          </ul>
        )}

        {previewDay && (
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                const id = previewDay.id
                closePreview()
                router.push(`/gym/builder/${id}`)
              }}
              className="flex-1 h-11 rounded-xl border border-border bg-bg-input font-semibold text-text-primary text-sm cursor-pointer active:opacity-80"
            >
              Edit
            </button>
            <button
              onClick={() => {
                const id = previewDay.id
                closePreview()
                router.push(`/gym/workout/${id}`)
              }}
              className={`flex-1 h-11 rounded-xl font-semibold text-white text-sm cursor-pointer active:opacity-90 ${
                activeWorkout?.day_id === previewDay.id ? 'bg-amber-500' : 'bg-accent'
              }`}
            >
              {activeWorkout?.day_id === previewDay.id ? 'Resume' : 'Start'}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
