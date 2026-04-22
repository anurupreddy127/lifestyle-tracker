'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import BottomSheet from '@/components/BottomSheet'
import { EQUIPMENT_LABELS, normalizeEquipment } from '@/lib/equipment'

export default function DayBuilder() {
  const router = useRouter()
  const { supabase, user } = useAuth()
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

  useEffect(() => {
    async function fetchExercises() {
      const { data } = await supabase
        .from('exercises')
        .select('id, name, equipment_type')
        .order('name', { ascending: true })
      setAllExercises(data || [])
    }
    fetchExercises()
  }, [])

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

    const { data: newDay } = await supabase
      .from('workout_days')
      .insert({ name: dayName.trim(), user_id: user.id })
      .select()
      .single()

    const dayExercises = selectedExercises.map((ex, index) => ({
      day_id: newDay.id,
      exercise_id: ex.exercise_id,
      target_sets: parseInt(ex.target_sets),
      target_reps: parseInt(ex.target_reps),
      sort_order: index,
      user_id: user.id,
    }))
    await supabase.from('day_exercises').insert(dayExercises)

    router.push('/gym')
  }

  const filteredExercises = allExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
    const notAlreadyAdded = !selectedExercises.some((sel) => sel.exercise_id === ex.id)
    return matchesSearch && notAlreadyAdded
  })

  return (
    <div className="px-4 pt-2 pb-4">
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* Day Name Input */}
      <div className="mb-6">
        <label className="text-sm font-medium text-text-secondary mb-1.5 block px-1">Day Name</label>
        <input
          type="text"
          placeholder="e.g. Upper Body Power"
          value={dayName}
          onChange={(e) => setDayName(e.target.value)}
          className="bg-bg-card border border-border rounded-2xl h-14 px-4 text-lg text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 w-full"
        />
      </div>

      {/* Exercises section header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-text-secondary uppercase tracking-widest">Exercises</p>
        <p className="text-xs text-text-secondary">{selectedExercises.length} Items</p>
      </div>

      {/* Exercises List */}
      {selectedExercises.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-8">
          No exercises added yet. Tap below to add exercises.
        </p>
      ) : (
        <div className="flex flex-col gap-2 mb-2">
          {selectedExercises.map((ex, index) => (
            <div key={ex.exercise_id} className="bg-bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              {/* Drag handle */}
              <span className="material-symbols-outlined text-text-secondary text-[20px] shrink-0">drag_indicator</span>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-text-primary truncate">{ex.name}</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {ex.target_sets} sets × {ex.target_reps} reps
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5">
                <button onClick={() => moveExercise(index, -1)} className="text-text-secondary active:text-accent p-1">
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button onClick={() => moveExercise(index, 1)} className="text-text-secondary active:text-accent p-1">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button onClick={() => removeExercise(index)} className="text-text-secondary active:text-rose-400 p-1 ml-1">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Exercise Button */}
      <button
        onClick={() => { setSearchQuery(''); setShowPicker(true) }}
        className="border-2 border-dashed border-border rounded-xl py-4 w-full text-accent font-semibold text-sm flex items-center justify-center gap-2 mt-2 active:bg-bg-card"
      >
        <span className="material-symbols-outlined text-[18px]">add_circle</span>
        Add Exercise
      </button>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="bg-accent text-white font-bold rounded-xl py-4 w-full text-base mt-6 active:bg-accent/90 shadow-lg shadow-primary/20"
      >
        Save Day
      </button>

      {/* Exercise Picker */}
      <BottomSheet isOpen={showPicker} onClose={() => setShowPicker(false)} title="Pick Exercise">
        <div className="relative mb-4">
          <span className="material-symbols-outlined text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 text-[20px]">search</span>
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-bg-input border border-border rounded-xl pl-10 pr-4 py-3 text-text-primary placeholder:text-text-secondary text-base focus:outline-none focus:ring-2 focus:ring-accent/30 w-full"
          />
        </div>
        <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
          {filteredExercises.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              {allExercises.length === 0 ? 'No exercises in library.' : 'No matching exercises.'}
            </p>
          ) : (
            filteredExercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => handlePickExercise(ex)}
                className="flex items-center gap-3 bg-bg-card border border-border border border-border rounded-xl px-3 py-3 active:bg-bg-card text-left w-full"
              >
                <div className="w-12 h-12 bg-accent/15 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-accent text-[18px]">fitness_center</span>
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text-primary block truncate">{ex.name}</span>
                  <span className="text-[10px] font-bold uppercase text-accent/60">
                    {EQUIPMENT_LABELS[normalizeEquipment(ex.equipment_type)] || ex.equipment_type}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </BottomSheet>

      {/* Target Sets/Reps Prompt */}
      <BottomSheet
        isOpen={showTargetPrompt}
        onClose={() => setShowTargetPrompt(false)}
        title={pendingExercise ? `Set Targets` : 'Set Targets'}
      >
        {pendingExercise && (
          <p className="text-sm text-text-secondary mb-4">{pendingExercise.name}</p>
        )}
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Sets</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempSets}
              onChange={(e) => setTempSets(e.target.value)}
              className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-lg text-center focus:outline-none focus:ring-2 focus:ring-accent/30 w-full font-bold"
            />
          </div>
          <div className="flex-1">
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Reps</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={tempReps}
              onChange={(e) => setTempReps(e.target.value)}
              className="bg-bg-input border border-border rounded-xl px-4 py-3 text-text-primary text-lg text-center focus:outline-none focus:ring-2 focus:ring-accent/30 w-full font-bold"
            />
          </div>
        </div>
        <button
          onClick={handleConfirmTarget}
          className="bg-accent text-white font-semibold rounded-xl py-3.5 w-full text-base active:bg-accent/90"
        >
          Confirm
        </button>
      </BottomSheet>
    </div>
  )
}
