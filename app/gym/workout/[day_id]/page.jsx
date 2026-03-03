'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'
import LoadingSkeleton from '@/components/LoadingSkeleton'

const STORAGE_KEY = 'activeWorkout'

function saveWorkoutToStorage(dayId, dayName, inputValues) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      day_id: dayId,
      day_name: dayName,
      input_values: inputValues,
      started_at: JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}').started_at || new Date().toISOString(),
    }))
  } catch {}
}

function clearWorkoutStorage() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}

export default function ActiveWorkout() {
  const router = useRouter()
  const { day_id } = useParams()
  const { supabase, user } = useAuth()
  const [dayName, setDayName] = useState('')
  const [exercises, setExercises] = useState([])
  const [previousLogs, setPreviousLogs] = useState({})
  // inputValues: { [exerciseId]: { [setIndex]: { weight, reps, completed } } }
  const [inputValues, setInputValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [collapsedExercises, setCollapsedExercises] = useState({})


  useEffect(() => {
    async function fetchData() {
      const { data: dayData } = await supabase
        .from('workout_days')
        .select('name')
        .eq('id', day_id)
        .single()
      const name = dayData?.name || ''
      setDayName(name)

      const { data: dayExercises } = await supabase
        .from('day_exercises')
        .select('*, exercises(*)')
        .eq('day_id', day_id)
        .order('sort_order', { ascending: true })
      setExercises(dayExercises || [])

      // Check for saved in-progress data
      let saved = null
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.day_id === day_id) saved = parsed
        }
      } catch {}

      if (saved?.input_values) {
        // Restore saved input values
        setInputValues(saved.input_values)
        // Auto-collapse completed exercises
        const collapsed = {}
        ;(dayExercises || []).forEach((de) => {
          const sets = saved.input_values[de.exercise_id] || {}
          const totalSets = de.target_sets || 3
          let allDone = true
          for (let i = 0; i < totalSets; i++) {
            if (!sets[i]?.completed) { allDone = false; break }
          }
          if (allDone) collapsed[de.exercise_id] = true
        })
        setCollapsedExercises(collapsed)
      } else {
        // Initialize fresh multi-set input values
        const initInputs = {}
        ;(dayExercises || []).forEach((de) => {
          const sets = {}
          for (let i = 0; i < (de.target_sets || 3); i++) {
            sets[i] = { weight: '', reps: '', completed: false }
          }
          initInputs[de.exercise_id] = sets
        })
        setInputValues(initInputs)
        // Save initial state to mark workout as in-progress
        saveWorkoutToStorage(day_id, name, initInputs)
      }

      // Fetch previous session logs
      const { data: lastSession } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('day_id', day_id)
        .order('performed_at', { ascending: false })
        .limit(1)
        .single()

      if (lastSession) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('exercise_id, weight, weight_type, reps, set_number')
          .eq('session_id', lastSession.id)
          .order('set_number', { ascending: true })

        const logMap = {}
        ;(logs || []).forEach((log) => {
          if (!logMap[log.exercise_id]) logMap[log.exercise_id] = []
          logMap[log.exercise_id].push(log)
        })
        setPreviousLogs(logMap)
      }

      setLoading(false)
    }
    fetchData()
  }, [day_id])

  function updateSetInput(exerciseId, setIndex, field, value) {
    setInputValues((prev) => {
      const next = {
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          [setIndex]: { ...prev[exerciseId]?.[setIndex], [field]: value },
        },
      }
      saveWorkoutToStorage(day_id, dayName, next)
      return next
    })
  }

  function isExerciseComplete(exerciseId, targetSets) {
    const sets = inputValues[exerciseId] || {}
    for (let i = 0; i < targetSets; i++) {
      if (!sets[i]?.completed) return false
    }
    return true
  }

  function toggleSetComplete(exerciseId, setIndex) {
    setInputValues((prev) => {
      const setData = prev[exerciseId]?.[setIndex] || {}
      const newValues = {
        ...prev,
        [exerciseId]: {
          ...prev[exerciseId],
          [setIndex]: { ...setData, completed: !setData.completed },
        },
      }

      // Auto-collapse when all sets become completed
      const ex = exercises.find((e) => e.exercise_id === exerciseId)
      const totalSets = ex?.target_sets || 3
      let allDone = true
      for (let i = 0; i < totalSets; i++) {
        if (!newValues[exerciseId]?.[i]?.completed) { allDone = false; break }
      }
      if (allDone) {
        setCollapsedExercises((p) => ({ ...p, [exerciseId]: true }))
      }

      saveWorkoutToStorage(day_id, dayName, newValues)
      return newValues
    })
  }

  // Count completed exercises (all sets completed)
  function getCompletedCount() {
    let count = 0
    exercises.forEach((ex) => {
      const sets = inputValues[ex.exercise_id] || {}
      const totalSets = ex.target_sets || 3
      let allDone = true
      for (let i = 0; i < totalSets; i++) {
        if (!sets[i]?.completed) {
          allDone = false
          break
        }
      }
      if (allDone) count++
    })
    return count
  }

  async function handleFinishWorkout() {
    setSaving(true)

    const { data: newSession } = await supabase
      .from('workout_sessions')
      .insert({ day_id: day_id, user_id: user.id })
      .select()
      .single()

    // Build logs from all completed sets
    const logs = []
    exercises.forEach((ex) => {
      const sets = inputValues[ex.exercise_id] || {}
      const totalSets = ex.target_sets || 3
      const isBodyweight = ex.exercises.equipment_type === 'no_equipment'
      for (let i = 0; i < totalSets; i++) {
        const setData = sets[i]
        const hasReps = setData?.reps
        const hasWeight = setData?.weight
        if (isBodyweight ? hasReps : (hasWeight && hasReps)) {
          logs.push({
            session_id: newSession.id,
            exercise_id: ex.exercise_id,
            weight: isBodyweight ? 0 : parseFloat(setData.weight),
            weight_type: isBodyweight ? 'bodyweight' : ex.exercises.equipment_type === 'barbell_dumbbell' ? 'per_side' : 'total',
            reps: parseInt(setData.reps),
            set_number: i + 1,
            user_id: user.id,
          })
        }
      }
    })

    if (logs.length > 0) {
      await supabase.from('workout_logs').insert(logs)
    }

    clearWorkoutStorage()
    setToastMsg('Workout saved!')
    setShowToast(true)
    setTimeout(() => router.push('/gym'), 1500)
  }

  const completedCount = getCompletedCount()
  const progress = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-28">
        <LoadingSkeleton count={4} height="h-48" />
      </div>
    )
  }

  return (
    <div className="pb-44">
      {/* Custom header + progress bar (sticky together) */}
      <header
        className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => router.push('/gym')} className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-600 active:bg-slate-100 -ml-1">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight text-slate-900 truncate">{dayName}</h1>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-slate-500">Workout Progress</p>
            <p className="text-xs font-bold text-primary">{completedCount} of {exercises.length}</p>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </header>

      {/* Exercise cards */}
      <div className="px-4 pt-4 flex flex-col gap-4">
        {exercises.map((ex) => {
          const prevSets = previousLogs[ex.exercise_id] || []
          const totalSets = ex.target_sets || 3
          const exerciseSets = inputValues[ex.exercise_id] || {}
          const allDone = isExerciseComplete(ex.exercise_id, totalSets)
          const collapsed = allDone && collapsedExercises[ex.exercise_id]

          return (
            <div
              key={ex.exercise_id}
              className={`bg-white border rounded-xl shadow-sm transition-all duration-300 ${
                allDone ? 'border-primary/30 bg-primary/[0.02]' : 'border-slate-200'
              }`}
            >
              {/* Exercise header — tappable when completed */}
              <button
                type="button"
                onClick={() => allDone && setCollapsedExercises((p) => ({ ...p, [ex.exercise_id]: !p[ex.exercise_id] }))}
                className={`w-full flex items-center p-4 text-left ${allDone ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {allDone && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mr-3">
                    <span className="material-symbols-outlined text-[18px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${allDone ? 'text-primary' : 'text-slate-900'}`}>{ex.exercises.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs font-semibold bg-primary/10 text-primary rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
                      Target: {ex.target_sets} × {ex.target_reps}
                    </span>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-500 rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">
                        {ex.exercises.equipment_type === 'barbell_dumbbell' ? 'fitness_center' : ex.exercises.equipment_type === 'machine' ? 'precision_manufacturing' : 'back_hand'}
                      </span>
                      {ex.exercises.equipment_type === 'barbell_dumbbell' ? 'Dumbbell' : ex.exercises.equipment_type === 'machine' ? 'Machine' : 'Bodyweight'}
                    </span>
                  </div>
                </div>
                {allDone && (
                  <span className={`material-symbols-outlined text-[22px] text-slate-400 shrink-0 ml-2 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>
                    expand_more
                  </span>
                )}
              </button>

              {/* Collapsible set rows */}
              {!collapsed && (
                <div className="px-4 pb-4">
                  {!allDone && prevSets.length > 0 && (
                    <p className="text-xs text-slate-500 mb-3">
                      Last: {prevSets[0].weight} lbs × {prevSets[0].reps} reps
                    </p>
                  )}
                  {!allDone && prevSets.length === 0 && (
                    <p className="text-xs text-slate-400 mb-3">No previous data</p>
                  )}

                  <div className="flex flex-col gap-2">
                    {Array.from({ length: totalSets }).map((_, setIdx) => {
                      const setData = exerciseSets[setIdx] || {}
                      return (
                        <div key={setIdx} className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-slate-500">{setIdx + 1}</span>
                          </div>

                          {ex.exercises.equipment_type !== 'no_equipment' && (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="lbs"
                              value={setData.weight || ''}
                              onChange={(e) => updateSetInput(ex.exercise_id, setIdx, 'weight', e.target.value)}
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-0"
                            />
                          )}

                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="reps"
                            value={setData.reps || ''}
                            onChange={(e) => updateSetInput(ex.exercise_id, setIdx, 'reps', e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-0"
                          />

                          <button
                            onClick={() => toggleSetComplete(ex.exercise_id, setIdx)}
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                              setData.completed
                                ? 'bg-primary text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[20px]">check</span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Fixed bottom buttons */}
      <div
        className="fixed left-0 right-0 px-4 py-3 bg-white/90 backdrop-blur-md border-t border-slate-200 z-40"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { clearWorkoutStorage(); router.push('/gym') }}
            className="border-2 border-slate-200 text-slate-600 font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Cancel
          </button>
          <button
            onClick={handleFinishWorkout}
            disabled={saving}
            className="bg-primary text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            {saving ? 'Saving...' : 'Finish'}
          </button>
        </div>
      </div>

      <Toast message={toastMsg} isVisible={showToast} onDismiss={() => setShowToast(false)} />
    </div>
  )
}
