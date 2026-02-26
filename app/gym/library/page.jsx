'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'

const EQUIPMENT_LABELS = {
  barbell_dumbbell: 'Barbell/Dumbbell',
  machine: 'Machine',
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Barbell', value: 'barbell_dumbbell' },
  { label: 'Machine', value: 'machine' },
]

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
  const [formEquipmentType, setFormEquipmentType] = useState('barbell_dumbbell')
  const [deleteError, setDeleteError] = useState('')
  const [filter, setFilter] = useState('all')

  async function fetchExercises() {
    const { data } = await supabase
      .from('exercises')
      .select('*')
      .order('name', { ascending: true })
    setExercises(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchExercises() }, [])

  function openAddModal() {
    setFormName('')
    setFormEquipmentType('barbell_dumbbell')
    setEditingExercise(null)
    setShowModal(true)
  }

  function openEditModal(exercise) {
    setFormName(exercise.name)
    setFormEquipmentType(exercise.equipment_type)
    setEditingExercise(exercise)
    setShowModal(true)
  }

  async function handleSave() {
    if (!formName.trim()) return

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
  }

  async function handleDelete(exerciseId) {
    setDeleteError('')
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
                ? 'bg-primary text-white'
                : 'bg-slate-200 text-slate-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {deleteError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4 text-rose-600 text-sm">
          {deleteError}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={6} height="h-16" />
      ) : filteredExercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <span className="material-symbols-outlined text-5xl">fitness_center</span>
          <p className="text-sm">No exercises yet. Add your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {grouped.map(([letter, items]) => (
            <div key={letter}>
              <p className="text-xs font-bold text-primary uppercase tracking-widest px-1 pt-4 pb-2">{letter}</p>
              <div className="flex flex-col gap-2">
                {items.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3"
                  >
                    {/* Icon */}
                    <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-slate-400 text-xl">fitness_center</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0" onClick={() => openEditModal(exercise)}>
                      <p className="text-base font-semibold text-slate-900 truncate">{exercise.name}</p>
                      <span className="text-[10px] font-bold uppercase bg-primary/10 text-primary rounded px-2 py-0.5 mt-1 inline-block">
                        {EQUIPMENT_LABELS[exercise.equipment_type] || exercise.equipment_type}
                      </span>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(exercise.id)}
                      className="text-slate-400 active:text-rose-500 p-2"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fixed Add Button */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 pt-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-10">
        <button
          onClick={openAddModal}
          className="bg-primary text-white font-bold rounded-xl py-4 w-full text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:bg-primary/90"
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
            <label className="text-sm font-medium text-slate-500 mb-1.5 block">Exercise Name</label>
            <input
              type="text"
              placeholder="e.g., Barbell Back Squat"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-slate-100 border-none rounded-xl px-4 py-3.5 text-slate-900 placeholder:text-slate-400 text-base focus:outline-none focus:ring-2 focus:ring-primary/20 w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-500 mb-2 block">Equipment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormEquipmentType('barbell_dumbbell')}
                className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                  formEquipmentType === 'barbell_dumbbell'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-slate-100 text-slate-600'
                }`}
              >
                Barbell / Dumbbell
              </button>
              <button
                onClick={() => setFormEquipmentType('machine')}
                className={`py-3 rounded-xl text-sm font-semibold border-2 ${
                  formEquipmentType === 'machine'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-transparent bg-slate-100 text-slate-600'
                }`}
              >
                Machine
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 bg-slate-100 text-slate-600 font-semibold rounded-xl py-3.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-[2] bg-primary text-white font-semibold rounded-xl py-3.5 text-sm active:bg-primary/90"
            >
              {editingExercise ? 'Save Changes' : 'Create Exercise'}
            </button>
          </div>
        </div>
      </BottomSheet>
    </div>
  )
}
