'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { ChevronUp, ChevronDown, X } from 'lucide-react'

export default function EditDayBuilder() {
  const router = useRouter()
  const { day_id } = useParams()
  const [dayName, setDayName] = useState('')
  const [selectedExercises, setSelectedExercises] = useState([])
  const [allExercises, setAllExercises] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [showTargetPrompt, setShowTargetPrompt] = useState(false)
  const [pendingExercise, setPendingExercise] = useState(null)
  const [tempSets, setTempSets] = useState('4')
  const [tempReps, setTempReps] = useState('8')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [dayRes, exercisesRes, allExRes] = await Promise.all([
        supabase.from('workout_days').select('name').eq('id', day_id).single(),
        supabase
          .from('day_exercises')
          .select('*, exercises(id, name, equipment_type)')
          .eq('day_id', day_id)
          .order('sort_order', { ascending: true }),
        supabase.from('exercises').select('id, name, equipment_type').order('name', { ascending: true }),
      ])

      if (dayRes.data) setDayName(dayRes.data.name)
      if (exercisesRes.data) {
        setSelectedExercises(
          exercisesRes.data.map((de) => ({
            exercise_id: de.exercise_id,
            name: de.exercises.name,
            equipment_type: de.exercises.equipment_type,
            target_sets: de.target_sets,
            target_reps: de.target_reps,
          }))
        )
      }
      setAllExercises(allExRes.data || [])
      setLoading(false)
    }
    fetchData()
  }, [day_id])

  function handlePickExercise(exercise) {
    setShowPicker(false)
    setPendingExercise(exercise)
    setTempSets('4')
    setTempReps('8')
    setShowTargetPrompt(true)
  }

  function handleConfirmTarget() {
    if (!tempSets || !tempReps) return
    setSelectedExercises([
      ...selectedExercises,
      {
        exercise_id: pendingExercise.id,
        name: pendingExercise.name,
        equipment_type: pendingExercise.equipment_type,
        target_sets: tempSets,
        target_reps: tempReps,
      },
    ])
    setPendingExercise(null)
    setShowTargetPrompt(false)
  }

  function removeExercise(index) {
    setSelectedExercises(selectedExercises.filter((_, i) => i !== index))
  }

  function moveExercise(index, direction) {
    const newList = [...selectedExercises]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= newList.length) return
    ;[newList[index], newList[swapIndex]] = [newList[swapIndex], newList[index]]
    setSelectedExercises(newList)
  }

  async function handleSave() {
    setError('')
    if (!dayName.trim()) {
      setError('Please enter a day name.')
      return
    }
    if (selectedExercises.length === 0) {
      setError('Add at least one exercise.')
      return
    }

    await supabase.from('workout_days').update({ name: dayName.trim() }).eq('id', day_id)

    await supabase.from('day_exercises').delete().eq('day_id', day_id)

    const dayExercises = selectedExercises.map((ex, index) => ({
      day_id: day_id,
      exercise_id: ex.exercise_id,
      target_sets: parseInt(ex.target_sets),
      target_reps: parseInt(ex.target_reps),
      sort_order: index,
    }))
    await supabase.from('day_exercises').insert(dayExercises)

    router.push('/gym')
  }

  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const notAlreadyAdded = !selectedExercises.some((sel) => sel.exercise_id === ex.id)
    return matchesSearch && notAlreadyAdded
  })

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4">
        <LoadingSkeleton count={4} height="h-14" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">Edit Day</h1>
        <button onClick={handleSave} className="text-indigo-400 font-semibold text-base">
          Save
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="text-sm text-slate-300 mb-1 block">Day Name</label>
        <input
          type="text"
          placeholder="e.g., Push Day"
          value={dayName}
          onChange={(e) => setDayName(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12"
        />
      </div>

      <label className="text-sm text-slate-300 mb-2 block">Exercises</label>
      {selectedExercises.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          No exercises added yet. Tap below to add exercises.
        </p>
      ) : (
        <div className="flex flex-col gap-3 mb-2">
          {selectedExercises.map((ex, index) => (
            <Card key={ex.exercise_id} className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-base font-semibold text-slate-50">{ex.name}</p>
                <p className="text-xs text-slate-400">
                  {ex.target_sets} sets x {ex.target_reps} reps
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => moveExercise(index, -1)} className="text-slate-500 active:text-indigo-400 p-1">
                  <ChevronUp size={18} />
                </button>
                <button onClick={() => moveExercise(index, 1)} className="text-slate-500 active:text-indigo-400 p-1">
                  <ChevronDown size={18} />
                </button>
                <button onClick={() => removeExercise(index)} className="text-slate-500 active:text-rose-400 p-1 ml-1">
                  <X size={18} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={() => { setSearchQuery(''); setShowPicker(true) }}
        className="bg-slate-800 active:bg-slate-700 text-indigo-400 font-semibold rounded-xl py-4 w-full text-base border border-slate-700 mt-2"
      >
        + Add Exercise
      </button>

      <BottomSheet isOpen={showPicker} onClose={() => setShowPicker(false)} title="Select Exercise">
        <input
          type="text"
          placeholder="Search exercises..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12 mb-4"
        />
        <div className="flex flex-col gap-2">
          {filteredExercises.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No matching exercises.</p>
          ) : (
            filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handlePickExercise(ex)}
                className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3 active:bg-slate-700 text-left w-full"
              >
                <span className="text-sm text-slate-50">{ex.name}</span>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 ${
                    ex.equipment_type === 'barbell_dumbbell'
                      ? 'text-indigo-400 bg-indigo-400/10'
                      : 'text-emerald-400 bg-emerald-400/10'
                  }`}
                >
                  {ex.equipment_type === 'barbell_dumbbell' ? 'Barbell/DB' : 'Machine'}
                </span>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      <BottomSheet
        isOpen={showTargetPrompt}
        onClose={() => setShowTargetPrompt(false)}
        title={pendingExercise ? `Set Targets — ${pendingExercise.name}` : 'Set Targets'}
      >
        <div className="flex gap-4 mb-4">
          <div className="flex-1">
            <label className="text-sm text-slate-300 mb-1 block">Sets</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempSets}
              onChange={(e) => setTempSets(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12 text-center"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm text-slate-300 mb-1 block">Reps</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempReps}
              onChange={(e) => setTempReps(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12 text-center"
            />
          </div>
        </div>
        <button
          onClick={handleConfirmTarget}
          className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base"
        >
          Confirm
        </button>
      </BottomSheet>
    </div>
  )
}
