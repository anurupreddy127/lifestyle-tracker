'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import SwipeableCard from '@/components/SwipeableCard'
import { EQUIPMENT_LABELS, EQUIPMENT_ICONS, normalizeEquipment } from '@/lib/equipment'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Dumbbell', value: 'dumbbell' },
  { label: 'Barbell', value: 'barbell' },
  { label: 'Machine', value: 'machine' },
  { label: 'Bodyweight', value: 'no_equipment' },
]

const EQUIPMENT_OPTIONS = ['dumbbell', 'barbell', 'machine', 'no_equipment']

function groupByLetter(exercises) {
  const groups = {}
  exercises.forEach((ex) => {
    const letter = ex.name[0].toUpperCase()
    if (!groups[letter]) groups[letter] = []
    groups[letter].push(ex)
  })
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export default function ExerciseLibrary() {
  const { supabase, user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [formName, setFormName] = useState('')
  const [formEquipmentType, setFormEquipmentType] = useState('dumbbell')
  const [deleteError, setDeleteError] = useState('')
  const [filter, setFilter] = useState('all')

  async function fetchExercises() {
    try {
      const { data } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true })
      setExercises(data || [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchExercises() }, [])

  function openAddModal() {
    setFormName('')
    setFormEquipmentType('dumbbell')
    setEditingExercise(null)
    setShowModal(true)
  }

  function openEditModal(exercise) {
    setFormName(exercise.name)
    setFormEquipmentType(normalizeEquipment(exercise.equipment_type))
    setEditingExercise(exercise)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) return

    try {
      if (editingExercise) {
        await supabase
          .from('exercises')
          .update({ name: formName.trim(), equipment_type: formEquipmentType })
          .eq('id', editingExercise.id)
      } else {
        await supabase
          .from('exercises')
          .insert({ name: formName.trim(), equipment_type: formEquipmentType, user_id: user.id })
      }

      setShowModal(false)
      fetchExercises()
    } catch {
      // Supabase error handled silently
    }
  }

  async function handleDelete(exerciseId) {
    setDeleteError('')
    try {
      const { count } = await supabase
        .from('day_exercises')
        .select('*', { count: 'exact', head: true })
        .eq('exercise_id', exerciseId)

      if (count > 0) {
        setDeleteError(`This exercise is used in ${count} Day(s). Remove it from those Days first.`)
        return
      }

      await supabase.from('exercises').delete().eq('id', exerciseId)
      fetchExercises()
    } catch {
      // Supabase error handled silently
    }
  }

  const filteredExercises = filter === 'all'
    ? exercises
    : exercises.filter((ex) => ex.equipment_type === filter)

  const grouped = groupByLetter(filteredExercises)

  return (
    <div className="px-4 pt-2 pb-32">
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 h-9 rounded-full text-sm font-semibold whitespace-nowrap shrink-0 ${
              filter === f.value
                ? 'bg-accent text-white'
                : 'bg-bg-card text-text-primary'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {deleteError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4 text-rose-400 text-sm">
          {deleteError}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={6} height="h-16" />
      ) : filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-secondary">
          <span className="material-symbols-outlined text-5xl">fitness_center</span>
          <p className="text-sm">No exercises yet. Add your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <p className="text-xs font-bold text-accent uppercase tracking-widest px-1 pt-4 pb-2">{letter}</p>
              <div className="flex flex-col gap-2">
                {items.map((exercise) => (
                  <SwipeableCard
                    key={exercise.id}
                    id={`exercise-${exercise.id}`}
                    onEdit={() => openEditModal(exercise)}
                    onDelete={() => handleDelete(exercise.id)}
                  >
                    <div className="bg-bg-card border border-border border border-border rounded-2xl p-3 flex items-center gap-3">
                      {/* Icon */}
                      <div className="w-14 h-14 bg-bg-card rounded-lg flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-text-secondary text-xl">fitness_center</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-text-primary truncate">{exercise.name}</p>
                        <span className="text-[10px] font-bold uppercase bg-accent/15 text-accent rounded px-2 py-0.5 mt-1 inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">
                            {EQUIPMENT_ICONS[normalizeEquipment(exercise.equipment_type)]}
                          </span>
                          {EQUIPMENT_LABELS[normalizeEquipment(exercise.equipment_type)] || exercise.equipment_type}
                        </span>
                      </div>
                    </div>
                  </SwipeableCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed Add Button */}
      <div className="fixed left-0 right-0 px-4 pb-2 pt-6 bg-gradient-to-t from-bg-primary/90 via-bg-primary/50 to-transparent z-10" style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}>
        <button
          onClick={openAddModal}
          className="bg-accent text-white font-bold rounded-xl py-4 w-full text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:bg-accent/90"
          aria-label="Add new exercise"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Add Exercise
        </button>
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExercise ? 'Edit Exercise' : 'New Exercise'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Exercise Name</label>
            <input
              type="text"
              placeholder="e.g., Barbell Back Squat"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-bg-input border border-border rounded-xl px-4 py-3.5 text-text-primary placeholder:text-text-secondary text-base focus:outline-none focus:ring-2 focus:ring-accent/30 w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-secondary mb-2 block">Equipment Type</label>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_OPTIONS.map((key) => (
                <button
                  key={key}
                  onClick={() => setFormEquipmentType(key)}
                  className={`py-3 rounded-xl text-xs font-semibold border-2 flex items-center justify-center gap-1.5 ${
                    formEquipmentType === key
                      ? 'border-accent bg-accent/15 text-accent'
                      : 'border-transparent bg-bg-card text-text-secondary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{EQUIPMENT_ICONS[key]}</span>
                  {EQUIPMENT_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 bg-bg-card text-text-secondary font-semibold rounded-xl py-3.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] bg-accent text-white font-semibold rounded-xl py-3.5 text-sm active:bg-accent/90"
            >
              {editingExercise ? 'Save Changes' : 'Create Exercise'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
