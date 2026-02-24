// =============================================================
// app/gym/library/page.jsx — [GYM-4] Exercise Library Screen
// =============================================================
// Master list of all exercises. User can add, edit, and delete exercises.
// Exercises here are available to add to any workout Day.
// Route: /gym/library
// Ref: App_Flow [GYM-4], PRD Section 3.1, Implementation_Plan Step 3.1
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Import { useState, useEffect } from 'react'
// - Import { supabase } from '@/utils/supabase'
// - Import Card from '@/components/Card'
// - Import BottomSheet from '@/components/BottomSheet'
// - Import LoadingSkeleton from '@/components/LoadingSkeleton'
// - Import { Dumbbell } from 'lucide-react' (for empty state)

// TODO 3: STATE VARIABLES
// - exercises: array — all exercises from the exercises table
// - loading: boolean
// - showModal: boolean — controls Add/Edit Exercise bottom sheet
// - editingExercise: object|null — if editing, holds the exercise being edited; null = add mode
// - formName: string — exercise name input value
// - formEquipmentType: string — 'barbell_dumbbell' or 'machine' (default: 'barbell_dumbbell')

// TODO 4: FETCH ALL EXERCISES ON MOUNT
// - useEffect:
//     const { data } = await supabase
//       .from('exercises')
//       .select('*')
//       .order('name', { ascending: true })
//   - Sorted alphabetically by name
//   - Set exercises state, set loading to false

// TODO 5: HEADER
// - <h1 className="text-2xl font-bold tracking-tight text-slate-50">Exercise Library</h1>

// TODO 6: LOADING STATE
// - <LoadingSkeleton count={6} height="h-14" />

// TODO 7: EMPTY STATE
// - If no exercises exist:
//     <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
//       <Dumbbell size={40} />
//       <p className="text-sm">No exercises yet. Add your first one!</p>
//     </div>

// TODO 8: EXERCISE LIST
// - Scrollable list sorted alphabetically
// - Each row (inside a Card) shows:
//     - Exercise name (left side, text-slate-50)
//     - Equipment type badge (right side):
//       - "Barbell/Dumbbell" → small badge with "text-indigo-400 bg-indigo-400/10 rounded-full px-2 py-0.5 text-xs"
//       - "Machine" → small badge with "text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5 text-xs"
//
// - Each row interactions:
//   - Tap/click row → opens Edit mode (see TODO 10)
//   - Swipe left OR show delete icon → triggers Delete flow (see TODO 11)

// TODO 9: "+ ADD EXERCISE" BUTTON
// - Full-width button at the bottom:
//     className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold
//                rounded-xl py-4 w-full text-base mt-6"
//     Label: "+ Add Exercise"
//     onClick:
//       1. Clear form (formName='', formEquipmentType='barbell_dumbbell')
//       2. Set editingExercise = null (add mode)
//       3. Set showModal = true

// TODO 10: ADD / EDIT EXERCISE MODAL (BottomSheet)
// - <BottomSheet isOpen={showModal} onClose={() => setShowModal(false)}
//     title={editingExercise ? "Edit Exercise" : "Add Exercise"}>
//
// - Form fields:
//   10a. EXERCISE NAME INPUT
//     - Label: "Exercise Name"
//     - type="text"
//     - placeholder="e.g., Barbell Back Squat"
//     - value={formName}
//     - Standard input classes (see Frontend_Guidelines Section 3.3)
//
//   10b. EQUIPMENT TYPE TOGGLE (segmented control)
//     - Two options: "Barbell / Dumbbell" and "Machine"
//     - Active option: bg-indigo-600 text-white
//     - Inactive option: bg-slate-800 text-slate-400
//     - Tapping toggles formEquipmentType between 'barbell_dumbbell' and 'machine'
//     - THIS CHOICE CONTROLS the weight input label during Active Workout:
//       - barbell_dumbbell → "Weight per side (lbs)"
//       - machine → "Total weight (lbs)"
//
//   10c. SAVE BUTTON
//     className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold
//                rounded-xl py-4 w-full text-base mt-4"
//
//     If ADD mode (editingExercise is null):
//       await supabase.from('exercises').insert({
//         name: formName,
//         equipment_type: formEquipmentType
//       })
//
//     If EDIT mode (editingExercise is not null):
//       await supabase.from('exercises').update({
//         name: formName,
//         equipment_type: formEquipmentType
//       }).eq('id', editingExercise.id)
//
//     After save: close modal, re-fetch exercises list

// TODO 11: DELETE EXERCISE FLOW
// - Before deleting, CHECK if the exercise is used in any Day:
//     const { count } = await supabase
//       .from('day_exercises')
//       .select('*', { count: 'exact', head: true })
//       .eq('exercise_id', exerciseId)
//
// - If count > 0:
//     Show warning: "This exercise is used in {count} Day(s). Remove it from those Days first."
//     Do NOT delete.
//
// - If count === 0:
//     await supabase.from('exercises').delete().eq('id', exerciseId)
//     Re-fetch exercises list.

// =============================================================
// PAGE WRAPPER
// =============================================================
// - <div className="px-4 pt-6 pb-4">
