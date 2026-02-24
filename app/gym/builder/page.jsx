// =============================================================
// app/gym/builder/page.jsx — [GYM-3] Day Builder (Create Mode)
// =============================================================
// Screen to create a NEW workout Day from scratch.
// User names the day, picks exercises from the library, sets targets.
// Route: /gym/builder
// Ref: App_Flow [GYM-3], PRD Section 3.2, Implementation_Plan Step 3.2
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Import { useState, useEffect } from 'react'
// - Import { useRouter } from 'next/navigation'
// - Import { supabase } from '@/utils/supabase'
// - Import Card from '@/components/Card'
// - Import BottomSheet from '@/components/BottomSheet'

// TODO 3: STATE VARIABLES
// - dayName: string — the name for this new day (e.g., "Push Day")
// - selectedExercises: array — exercises added to this day so far
//     Each item: { exercise_id, name, equipment_type, target_sets, target_reps }
// - allExercises: array — full Exercise Library list (for the picker)
// - searchQuery: string — filter text for the exercise picker
// - showPicker: boolean — controls Exercise Picker bottom sheet visibility
// - showTargetPrompt: boolean — controls Sets/Reps input prompt visibility
// - pendingExercise: object — the exercise waiting for target sets/reps input
// - tempSets: string — temporary input for target sets
// - tempReps: string — temporary input for target reps

// TODO 4: FETCH EXERCISE LIBRARY ON MOUNT
// - useEffect that runs once on mount:
//     const { data } = await supabase
//       .from('exercises')
//       .select('id, name, equipment_type')
//       .order('name', { ascending: true })
//     Set allExercises = data
// - This populates the Exercise Picker with all available exercises

// TODO 5: HEADER
// - Layout: flex row with space-between
// - Left: Title "Build Day"
//     <h1 className="text-2xl font-bold tracking-tight text-slate-50">Build Day</h1>
// - Right: "Save" button
//     className="text-indigo-400 font-semibold text-base"
//     onClick → triggers the SAVE flow (see TODO 10)

// TODO 6: DAY NAME INPUT
// - Label: "Day Name"
// - Input field:
//     type="text"
//     placeholder="e.g., Push Day"
//     value={dayName}
//     onChange={e => setDayName(e.target.value)}
//     className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50
//                placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500
//                w-full min-h-12"

// TODO 7: EXERCISES LIST (drag-to-reorder or up/down arrows)
// - Display selectedExercises in order
// - Each row shows (inside a Card):
//     - Exercise name (left side)
//     - Target: "4 sets x 8 reps" (under the name, muted text)
//     - Delete (X) button (right side) → removes exercise from selectedExercises
//     - The row is tappable to EDIT the target sets/reps for that exercise
//
// - For reordering:
//   OPTION A (simpler): Up/Down arrow buttons on each row
//   OPTION B (nicer): Drag-to-reorder using long press
//   - Either way, changing order updates the sort_order for each item
//
// - If selectedExercises is empty, show:
//     <p className="text-sm text-slate-500 text-center py-8">
//       No exercises added yet. Tap below to add exercises.
//     </p>

// TODO 8: "+ ADD EXERCISE" BUTTON
// - Full-width button at the bottom of the exercises list:
//     className="bg-slate-800 active:bg-slate-700 text-indigo-400 font-semibold
//                rounded-xl py-4 w-full text-base border border-slate-700"
//     Label: "+ Add Exercise"
//     onClick: setShowPicker(true) → opens the Exercise Picker bottom sheet

// TODO 9: EXERCISE PICKER BOTTOM SHEET
// - Use <BottomSheet isOpen={showPicker} onClose={() => setShowPicker(false)} title="Select Exercise">
// - Content:
//   9a. SEARCH INPUT at the top:
//       placeholder="Search exercises..."
//       value={searchQuery}
//       onChange → filter allExercises by name match
//
//   9b. FILTERED EXERCISE LIST:
//       - Show exercises matching searchQuery (case-insensitive)
//       - Each row: exercise name + equipment type badge ("Barbell/Dumbbell" or "Machine")
//       - Exclude exercises already in selectedExercises (prevent duplicates)
//       - On tap:
//           1. Close picker (setShowPicker(false))
//           2. Set pendingExercise to the tapped exercise
//           3. Open target prompt (setShowTargetPrompt(true))
//
// - TARGET SETS/REPS PROMPT (separate BottomSheet or inline):
//   - Shows after an exercise is picked
//   - Two inputs: "Sets" and "Reps" (both numeric, inputMode="numeric")
//   - "Confirm" button:
//       1. Add exercise to selectedExercises with target_sets and target_reps
//       2. Clear tempSets, tempReps, pendingExercise
//       3. Close prompt

// TODO 10: SAVE FLOW (triggered by "Save" button)
// - VALIDATION:
//   - dayName must not be empty → show error if it is
//   - selectedExercises must have at least 1 item → show error if empty
//
// - DATABASE OPERATIONS:
//   Step 1 — Insert the day:
//     const { data: newDay } = await supabase
//       .from('workout_days')
//       .insert({ name: dayName })
//       .select()
//       .single()
//
//   Step 2 — Insert all day_exercises with correct sort_order:
//     const dayExercises = selectedExercises.map((ex, index) => ({
//       day_id: newDay.id,
//       exercise_id: ex.exercise_id,
//       target_sets: parseInt(ex.target_sets),
//       target_reps: parseInt(ex.target_reps),
//       sort_order: index,
//     }))
//     await supabase.from('day_exercises').insert(dayExercises)
//
//   Step 3 — Navigate back to Gym Home:
//     router.push('/gym')

// =============================================================
// PAGE WRAPPER
// =============================================================
// - <div className="px-4 pt-6 pb-4">
