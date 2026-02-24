'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import Toast from '@/components/Toast'
import LoadingSkeleton from '@/components/LoadingSkeleton'

export default function ActiveWorkout() {
  const router = useRouter()
  const { day_id } = useParams()
  const [dayName, setDayName] = useState('')
  const [exercises, setExercises] = useState([])
  const [previousLogs, setPreviousLogs] = useState({})
  const [inputValues, setInputValues] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [invalidFields, setInvalidFields] = useState(new Set())

  useEffect(() => {
    async function fetchData() {
      // Fetch day name
      const { data: dayData } = await supabase
        .from('workout_days')
        .select('name')
        .eq('id', day_id)
        .single()
      if (dayData) setDayName(dayData.name)

      // Fetch exercises for this day
      const { data: dayExercises } = await supabase
        .from('day_exercises')
        .select('*, exercises(*)')
        .eq('day_id', day_id)
        .order('sort_order', { ascending: true })
      setExercises(dayExercises || [])

      // Initialize input values
      const initInputs = {}
      ;(dayExercises || []).forEach((de) => {
        initInputs[de.exercise_id] = { weight: '', reps: '' }
      })
      setInputValues(initInputs)

      // Fetch previous session data
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
          .select('exercise_id, weight, weight_type, reps')
          .eq('session_id', lastSession.id)

        const logMap = {}
        ;(logs || []).forEach((log) => {
          logMap[log.exercise_id] = log
        })
        setPreviousLogs(logMap)
      }

      setLoading(false)
    }
    fetchData()
  }, [day_id])

  function updateInput(exerciseId, field, value) {
    setInputValues((prev) => ({
      ...prev,
      [exerciseId]: { ...prev[exerciseId], [field]: value },
    }))
    setInvalidFields((prev) => {
      const next = new Set(prev)
      next.delete(exerciseId)
      return next
    })
  }

  async function handleFinishWorkout() {
    // Validate all inputs
    const missing = new Set()
    exercises.forEach((ex) => {
      const vals = inputValues[ex.exercise_id]
      if (!vals?.weight || !vals?.reps) {
        missing.add(ex.exercise_id)
      }
    })

    if (missing.size > 0) {
      setInvalidFields(missing)
      return
    }

    setSaving(true)

    // Create session
    const { data: newSession } = await supabase
      .from('workout_sessions')
      .insert({ day_id: day_id })
      .select()
      .single()

    // Insert all logs
    const logs = exercises.map((ex) => ({
      session_id: newSession.id,
      exercise_id: ex.exercise_id,
      weight: parseFloat(inputValues[ex.exercise_id].weight),
      weight_type: ex.exercises.equipment_type === 'barbell_dumbbell' ? 'per_side' : 'total',
      reps: parseInt(inputValues[ex.exercise_id].reps),
    }))
    await supabase.from('workout_logs').insert(logs)

    setToastMsg('Workout saved!')
    setShowToast(true)
    setTimeout(() => router.push('/gym'), 1500)
  }

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-28">
        <LoadingSkeleton count={5} height="h-40" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-28">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">{dayName}</h1>

      <div className="flex flex-col gap-4">
        {exercises.map((ex) => {
          const prev = previousLogs[ex.exercise_id]
          const isInvalid = invalidFields.has(ex.exercise_id)
          const weightLabel =
            ex.exercises.equipment_type === 'barbell_dumbbell'
              ? 'Weight per side (lbs)'
              : 'Total weight (lbs)'

          return (
            <Card
              key={ex.exercise_id}
              className={isInvalid ? 'border-rose-500' : ''}
            >
              {/* Exercise name */}
              <h3 className="text-base font-semibold text-slate-50">{ex.exercises.name}</h3>

              {/* Target guide */}
              <p className="text-xs text-slate-400 mb-1">
                {ex.target_sets} sets x {ex.target_reps} reps
              </p>

              {/* Previous session data */}
              {prev ? (
                <p className="text-xs text-slate-400 mb-3">
                  Last: {prev.weight} lbs {prev.weight_type === 'per_side' ? 'per side' : 'total'} · {prev.reps} reps
                </p>
              ) : (
                <p className="text-xs text-slate-500 mb-3">No previous data</p>
              )}

              {/* Weight + Reps inputs */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">{weightLabel}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={inputValues[ex.exercise_id]?.weight || ''}
                    onChange={(e) => updateInput(ex.exercise_id, 'weight', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-400 mb-1 block">Reps</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={inputValues[ex.exercise_id]?.reps || ''}
                    onChange={(e) => updateInput(ex.exercise_id, 'reps', e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12"
                  />
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Fixed Finish Workout Button — above BottomNav */}
      <div
        className="fixed left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-md z-40"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={handleFinishWorkout}
          disabled={saving}
          className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Finish Workout'}
        </button>
      </div>

      <Toast message={toastMsg} isVisible={showToast} onDismiss={() => setShowToast(false)} />
    </div>
  )
}
