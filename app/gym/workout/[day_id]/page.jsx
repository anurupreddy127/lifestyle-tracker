'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import BottomSheet from '@/components/BottomSheet'
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_ICONS,
  WEIGHT_TYPE_FOR,
  isBodyweight,
  normalizeEquipment,
} from '@/lib/equipment'

const STORAGE_KEY = 'activeWorkout'
const EQUIPMENT_OPTIONS = ['dumbbell', 'barbell', 'machine', 'no_equipment']

function saveWorkoutToStorage(dayId, dayName, inputValues, equipmentOverrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      day_id: dayId,
      day_name: dayName,
      input_values: inputValues,
      equipment_overrides: equipmentOverrides || {},
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
  const [equipmentOverrides, setEquipmentOverrides] = useState({})
  const [equipSheetExerciseId, setEquipSheetExerciseId] = useState(null)
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
        setEquipmentOverrides(saved.equipment_overrides || {})
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
        setEquipmentOverrides({})
        // Save initial state to mark workout as in-progress
        saveWorkoutToStorage(day_id, name, initInputs, {})
      }

      // Fetch latest logs per exercise across ALL sessions (not just this workout day)
      const exerciseIds = (dayExercises || []).map(de => de.exercise_id)
      if (exerciseIds.length > 0) {
        const { data: logs } = await supabase.rpc('get_latest_exercise_logs', {
          p_exercise_ids: exerciseIds,
          p_user_id: user.id,
        })
        const logMap = {}
        ;(logs || []).forEach((log) => {
          if (!logMap[log.exercise_id]) logMap[log.exercise_id] = []
          logMap[log.exercise_id].push(log)
        })
        Object.values(logMap).forEach(sets => sets.sort((a, b) => a.set_number - b.set_number))
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
      saveWorkoutToStorage(day_id, dayName, next, equipmentOverrides)
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

      saveWorkoutToStorage(day_id, dayName, newValues, equipmentOverrides)
      return newValues
    })
  }

  function getEffectiveEquipment(ex) {
    return equipmentOverrides[ex.exercise_id] ?? normalizeEquipment(ex.exercises.equipment_type)
  }

  function setEquipmentOverride(exerciseId, newEquipment) {
    setEquipmentOverrides((prev) => {
      const next = { ...prev, [exerciseId]: newEquipment }
      saveWorkoutToStorage(day_id, dayName, inputValues, next)
      return next
    })
    setEquipSheetExerciseId(null)
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

    const { data: newSession, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        day_id: day_id,
        user_id: user.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      .select()
      .single()

    if (sessionError || !newSession) {
      setToastMsg('Error creating session: ' + (sessionError?.message || 'unknown'))
      setShowToast(true)
      setSaving(false)
      return
    }

    // Build logs from all completed sets
    const logs = []
    exercises.forEach((ex) => {
      const sets = inputValues[ex.exercise_id] || {}
      const totalSets = ex.target_sets || 3
      const effectiveEq = getEffectiveEquipment(ex)
      const bodyweight = isBodyweight(effectiveEq)
      for (let i = 0; i < totalSets; i++) {
        const setData = sets[i]
        const hasReps = setData?.reps
        const hasWeight = setData?.weight
        if (bodyweight ? hasReps : (hasWeight && hasReps)) {
          logs.push({
            session_id: newSession.id,
            exercise_id: ex.exercise_id,
            weight: bodyweight ? 0 : parseFloat(setData.weight),
            weight_type: WEIGHT_TYPE_FOR[effectiveEq] || 'total',
            reps: parseInt(setData.reps),
            set_number: i + 1,
            user_id: user.id,
            equipment_used: effectiveEq,
          })
        }
      }
    })

    if (logs.length > 0) {
      const { error: logError } = await supabase.from('workout_logs').insert(logs)
      if (logError) {
        setToastMsg('Error saving logs: ' + logError.message)
        setShowToast(true)
        setSaving(false)
        return
      }
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
    <div className="pb-44" style={{ paddingTop: 'calc(6.5rem + env(safe-area-inset-top))' }}>
      {/* Custom header + progress bar (fixed to top) */}
      <header
        className="fixed top-0 left-0 right-0 z-20 bg-bg-nav border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={() => router.push('/gym')} className="w-11 h-11 flex items-center justify-center rounded-xl text-text-secondary active:bg-bg-card -ml-1">
            <span className="material-symbols-outlined text-[24px]">arrow_back</span>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold leading-tight text-text-primary truncate">{dayName}</h1>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold text-text-secondary">Workout Progress</p>
            <p className="text-xs font-bold text-accent">{completedCount} of {exercises.length}</p>
          </div>
          <div className="w-full bg-bg-card rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all duration-300"
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
          const defaultEq = normalizeEquipment(ex.exercises.equipment_type)
          const effectiveEq = equipmentOverrides[ex.exercise_id] ?? defaultEq
          const overridden = effectiveEq !== defaultEq
          const lastUsedEq = prevSets.find((s) => s?.equipment_used)?.equipment_used
          const showLastUsed = lastUsedEq && lastUsedEq !== effectiveEq

          return (
            <div
              key={ex.exercise_id}
              className={`bg-bg-card border border-border border rounded-2xl  transition-all duration-300 ${
                allDone ? 'border-accent/30 bg-accent/[0.02]' : 'border-border'
              }`}
            >
              {/* Exercise header — tappable when completed */}
              <div
                role={allDone ? 'button' : undefined}
                tabIndex={allDone ? 0 : undefined}
                onClick={() => allDone && setCollapsedExercises((p) => ({ ...p, [ex.exercise_id]: !p[ex.exercise_id] }))}
                onKeyDown={(e) => {
                  if (allDone && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    setCollapsedExercises((p) => ({ ...p, [ex.exercise_id]: !p[ex.exercise_id] }))
                  }
                }}
                className={`w-full flex items-center p-4 text-left ${allDone ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {allDone && (
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center shrink-0 mr-3">
                    <span className="material-symbols-outlined text-[18px] text-accent" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-bold ${allDone ? 'text-accent' : 'text-text-primary'}`}>{ex.exercises.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className="text-xs font-semibold bg-accent/15 text-accent rounded-full px-2.5 py-0.5 inline-flex items-center gap-1">
                      Target: {ex.target_sets} × {ex.target_reps}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEquipSheetExerciseId(ex.exercise_id) }}
                      className={`text-xs font-semibold rounded-full px-2.5 py-0.5 inline-flex items-center gap-1 cursor-pointer active:opacity-80 ${
                        overridden
                          ? 'bg-accent/15 text-accent'
                          : 'bg-bg-card text-text-secondary'
                      }`}
                      aria-label="Change equipment"
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {EQUIPMENT_ICONS[effectiveEq]}
                      </span>
                      {EQUIPMENT_LABELS[effectiveEq]}
                      <span className="material-symbols-outlined text-[12px] opacity-70">swap_horiz</span>
                    </button>
                    {showLastUsed && (
                      <span className="text-[10px] font-medium bg-bg-input text-text-secondary rounded-full px-2 py-0.5 inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-[11px]">
                          {EQUIPMENT_ICONS[lastUsedEq]}
                        </span>
                        Last: {EQUIPMENT_LABELS[lastUsedEq]}
                      </span>
                    )}
                  </div>
                </div>
                {allDone && (
                  <span className={`material-symbols-outlined text-[22px] text-text-secondary shrink-0 ml-2 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}>
                    expand_more
                  </span>
                )}
              </div>

              {/* Collapsible set rows — table layout */}
              {!collapsed && (
                <div className="px-4 pb-4">
                  {/* Column headers */}
                  <div className={`grid items-center gap-2 mb-2 ${
                    !isBodyweight(effectiveEq)
                      ? 'grid-cols-[2.5rem_3.5rem_1fr_1fr_2.5rem]'
                      : 'grid-cols-[2.5rem_3.5rem_1fr_2.5rem]'
                  }`}>
                    <span className="text-[11px] font-bold text-text-secondary text-center uppercase">Set</span>
                    <span className="text-[11px] font-bold text-text-secondary text-center uppercase">Prev</span>
                    {!isBodyweight(effectiveEq) && (
                      <span className="text-[11px] font-bold text-text-secondary text-center uppercase">Lbs</span>
                    )}
                    <span className="text-[11px] font-bold text-text-secondary text-center uppercase">Reps</span>
                    <span></span>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {Array.from({ length: totalSets }).map((_, setIdx) => {
                      const setData = exerciseSets[setIdx] || {}
                      const prevSet = prevSets[setIdx]
                      const bw = isBodyweight(effectiveEq)
                      const prevText = prevSet
                        ? bw
                          ? `${prevSet.reps}`
                          : `${prevSet.weight} × ${prevSet.reps}`
                        : '—'

                      return (
                        <div
                          key={setIdx}
                          className={`grid items-center gap-2 rounded-xl px-1 py-1.5 transition-colors ${
                            setData.completed ? 'bg-accent/10' : ''
                          } ${
                            bw
                              ? 'grid-cols-[2.5rem_3.5rem_1fr_2.5rem]'
                              : 'grid-cols-[2.5rem_3.5rem_1fr_1fr_2.5rem]'
                          }`}
                        >
                          {/* SET number */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto ${
                            setData.completed ? 'bg-accent/20' : 'bg-bg-input'
                          }`}>
                            <span className={`text-xs font-bold ${setData.completed ? 'text-accent' : 'text-text-secondary'}`}>
                              {setIdx + 1}
                            </span>
                          </div>

                          {/* PREV */}
                          <span className="text-xs text-text-secondary text-center truncate">{prevText}</span>

                          {/* LBS input */}
                          {!bw && (
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="0"
                              value={setData.weight || ''}
                              onChange={(e) => updateSetInput(ex.exercise_id, setIdx, 'weight', e.target.value)}
                              className={`bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-center font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 min-w-0 ${
                                setData.completed ? 'bg-accent/10 border-accent/20' : ''
                              }`}
                            />
                          )}

                          {/* REPS input */}
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={setData.reps || ''}
                            onChange={(e) => updateSetInput(ex.exercise_id, setIdx, 'reps', e.target.value)}
                            className={`bg-bg-input border border-border rounded-lg px-3 py-2 text-sm text-center font-medium text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 min-w-0 ${
                              setData.completed ? 'bg-accent/10 border-accent/20' : ''
                            }`}
                          />

                          {/* Completion checkbox */}
                          <button
                            onClick={() => toggleSetComplete(ex.exercise_id, setIdx)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto shrink-0 transition-colors ${
                              setData.completed
                                ? 'bg-accent text-white'
                                : 'bg-bg-input border border-border text-text-secondary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">check</span>
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
        className="fixed left-0 right-0 px-4 py-3 bg-bg-nav/95 backdrop-blur-md border-t border-border z-40"
        style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => { clearWorkoutStorage(); router.push('/gym') }}
            className="border-2 border-border text-text-secondary font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
            Cancel
          </button>
          <button
            onClick={handleFinishWorkout}
            disabled={saving}
            className="bg-accent text-white font-semibold rounded-xl py-3.5 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            {saving ? 'Saving...' : 'Finish'}
          </button>
        </div>
      </div>

      <Toast message={toastMsg} isVisible={showToast} onDismiss={() => setShowToast(false)} />

      {/* Equipment override sheet */}
      <BottomSheet
        isOpen={equipSheetExerciseId !== null}
        onClose={() => setEquipSheetExerciseId(null)}
        title="Equipment used"
      >
        {(() => {
          const ex = exercises.find((e) => e.exercise_id === equipSheetExerciseId)
          if (!ex) return null
          const defaultEq = normalizeEquipment(ex.exercises.equipment_type)
          const currentEq = equipmentOverrides[ex.exercise_id] ?? defaultEq
          return (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-text-secondary">{ex.exercises.name}</p>
              <div className="grid grid-cols-2 gap-2">
                {EQUIPMENT_OPTIONS.map((key) => {
                  const selected = currentEq === key
                  const isDefault = key === defaultEq
                  return (
                    <button
                      key={key}
                      onClick={() => setEquipmentOverride(ex.exercise_id, key)}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 flex flex-col items-center justify-center gap-1 ${
                        selected
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-transparent bg-bg-card text-text-primary'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[22px]">{EQUIPMENT_ICONS[key]}</span>
                      <span>{EQUIPMENT_LABELS[key]}</span>
                      {isDefault && (
                        <span className="text-[10px] font-medium text-text-secondary">Default</span>
                      )}
                    </button>
                  )
                })}
              </div>
              {currentEq !== defaultEq && (
                <button
                  onClick={() => setEquipmentOverride(ex.exercise_id, defaultEq)}
                  className="text-sm text-text-secondary underline underline-offset-2 py-2"
                >
                  Reset to default ({EQUIPMENT_LABELS[defaultEq]})
                </button>
              )}
            </div>
          )
        })()}
      </BottomSheet>
    </div>
  )
}
