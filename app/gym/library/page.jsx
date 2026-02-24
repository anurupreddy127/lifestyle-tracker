'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import BottomSheet from '@/components/BottomSheet'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Dumbbell, Trash2 } from 'lucide-react'

export default function ExerciseLibrary() {
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingExercise, setEditingExercise] = useState(null)
  const [formName, setFormName] = useState('')
  const [formEquipmentType, setFormEquipmentType] = useState('barbell_dumbbell')
  const [deleteError, setDeleteError] = useState('')

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
        .insert({ name: formName.trim(), equipment_type: formEquipmentType })
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

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-slate-50 mb-6">Exercise Library</h1>

      {deleteError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 mb-4 text-rose-400 text-sm">
          {deleteError}
        </div>
      )}

      {loading ? (
        <LoadingSkeleton count={6} height="h-14" />
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Dumbbell size={40} />
          <p className="text-sm">No exercises yet. Add your first one!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className="flex items-center justify-between">
              <div className="flex-1" onClick={() => openEditModal(exercise)}>
                <p className="text-base font-semibold text-slate-50">{exercise.name}</p>
                <span
                  className={`text-xs rounded-full px-2 py-0.5 mt-1 inline-block ${
                    exercise.equipment_type === 'barbell_dumbbell'
                      ? 'text-indigo-400 bg-indigo-400/10'
                      : 'text-emerald-400 bg-emerald-400/10'
                  }`}
                >
                  {exercise.equipment_type === 'barbell_dumbbell' ? 'Barbell/Dumbbell' : 'Machine'}
                </span>
              </div>
              <button
                onClick={() => handleDelete(exercise.id)}
                className="text-slate-500 active:text-rose-400 p-2 ml-2"
              >
                <Trash2 size={18} />
              </button>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={openAddModal}
        className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-6"
      >
        + Add Exercise
      </button>

      <BottomSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingExercise ? 'Edit Exercise' : 'Add Exercise'}
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-slate-300 mb-1 block">Exercise Name</label>
            <input
              type="text"
              placeholder="e.g., Barbell Back Squat"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50 placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500 w-full min-h-12"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 mb-2 block">Equipment Type</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormEquipmentType('barbell_dumbbell')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold ${
                  formEquipmentType === 'barbell_dumbbell'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Barbell / Dumbbell
              </button>
              <button
                onClick={() => setFormEquipmentType('machine')}
                className={`flex-1 py-3 rounded-lg text-sm font-semibold ${
                  formEquipmentType === 'machine'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                Machine
              </button>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-2"
          >
            {editingExercise ? 'Save Changes' : 'Add Exercise'}
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}
