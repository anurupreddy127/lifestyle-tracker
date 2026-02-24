// =============================================================
// app/gym/workout/[day_id]/page.jsx — [GYM-2] Active Workout Screen
// =============================================================
// THE MOST COMPLEX SCREEN. Opens when user taps a Day card on Gym Home.
// Shows all exercises for the selected Day with input fields for logging.
// Displays previous session data so the user knows what to beat.
// Route: /gym/workout/[day_id]
// Ref: App_Flow [GYM-2], PRD Section 3.3, Implementation_Plan Step 3.4
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Import { useState, useEffect } from 'react'
// - Import { useRouter, useParams } from 'next/navigation'
// - Import { supabase } from '@/utils/supabase'
// - Import Card from '@/components/Card'
// - Import Toast from '@/components/Toast'
// - Import LoadingSkeleton from '@/components/LoadingSkeleton'

// TODO 3: STATE VARIABLES
// - dayName: string — the name of the workout day (e.g., "Push Day")
// - exercises: array — the exercises in this day with their targets
// - previousLogs: object — keyed by exercise_id, holds last session's weight/reps
// - inputValues: object — keyed by exercise_id, holds current weight/reps inputs
//     Example: { [exerciseId]: { weight: '', reps: '' } }
// - loading: boolean
// - showToast: boolean
// - toastMsg: string

// TODO 4: GET day_id FROM URL PARAMS
// - const { day_id } = useParams()

// TODO 5: FETCH DATA ON MOUNT (useEffect)
// Run these queries when the component mounts:
//
// 5a. FETCH DAY NAME:
//   const { data: dayData } = await supabase
//     .from('workout_days')
//     .select('name')
//     .eq('id', day_id)
//     .single()
//   Set dayName = dayData.name
//
// 5b. FETCH EXERCISES FOR THIS DAY (ordered by sort_order):
//   const { data: dayExercises } = await supabase
//     .from('day_exercises')
//     .select('*, exercises(*)')
//     .eq('day_id', day_id)
//     .order('sort_order', { ascending: true })
//
//   - This returns each row from day_exercises with the full exercise object nested
//   - Each item has: target_sets, target_reps, sort_order, exercises.name,
//     exercises.equipment_type
//
// 5c. FETCH PREVIOUS SESSION DATA:
//   Step 1 — Find the most recent completed session for this day:
//     const { data: lastSession } = await supabase
//       .from('workout_sessions')
//       .select('id')
//       .eq('day_id', day_id)
//       .order('performed_at', { ascending: false })
//       .limit(1)
//       .single()
//
//   Step 2 — If lastSession exists, fetch its logs:
//     const { data: logs } = await supabase
//       .from('workout_logs')
//       .select('exercise_id, weight, weight_type, reps')
//       .eq('session_id', lastSession.id)
//
//   Step 3 — Convert logs array to a lookup object keyed by exercise_id:
//     const logMap = {}
//     logs.forEach(log => { logMap[log.exercise_id] = log })
//     Set previousLogs = logMap
//
// 5d. INITIALIZE INPUT VALUES:
//   Create an object with empty weight/reps for each exercise:
//     const initInputs = {}
//     dayExercises.forEach(de => {
//       initInputs[de.exercise_id] = { weight: '', reps: '' }
//     })
//     Set inputValues = initInputs

// TODO 6: HEADER
// - Display the day name:
//     <h1 className="text-2xl font-bold tracking-tight text-slate-50">{dayName}</h1>

// TODO 7: EXERCISE CARDS LIST
// - Map over exercises array, render one Card per exercise
// - Each Exercise Card contains (top to bottom):
//
//   7a. EXERCISE NAME
//     <h3 className="text-base font-semibold text-slate-50">
//       {exercise.exercises.name}
//     </h3>
//
//   7b. TARGET GUIDE (read-only, display only)
//     <p className="text-xs text-slate-400">
//       {exercise.target_sets} sets x {exercise.target_reps} reps
//     </p>
//     - This shows the planned target — it is NOT logged
//
//   7c. PREVIOUS SESSION DATA (read-only, muted)
//     - Look up previousLogs[exercise.exercise_id]
//     - If found:
//         "Last: {weight} lbs {per side|total} · {reps} reps"
//         - "per side" if weight_type === 'per_side'
//         - "total" if weight_type === 'total'
//         className="text-xs text-slate-400"
//     - If NOT found:
//         "No previous data"
//         className="text-xs text-slate-500"
//
//   7d. WEIGHT INPUT
//     - Label depends on equipment_type:
//       - If exercises.equipment_type === 'barbell_dumbbell' → "Weight per side (lbs)"
//       - If exercises.equipment_type === 'machine' → "Total weight (lbs)"
//     - Input attributes:
//         type="text"
//         inputMode="decimal"        ← Shows numeric keyboard on iOS
//         pattern="[0-9]*"           ← Ensures iOS shows number pad
//         placeholder="0"
//     - Input classes:
//         "bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-50
//          placeholder:text-slate-500 text-base focus:outline-none focus:border-indigo-500
//          w-full min-h-12"
//     - onChange: update inputValues[exercise_id].weight
//
//   7e. REPS INPUT
//     - Label: "Reps"
//     - Same input styling as weight input
//     - inputMode="numeric" pattern="[0-9]*"
//     - onChange: update inputValues[exercise_id].reps

// TODO 8: "FINISH WORKOUT" BUTTON
// - Fixed at the bottom of the screen (not inside scroll area):
//     className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950"
//     style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
//
// - Button inside:
//     className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold
//                rounded-xl py-4 w-full text-base"
//     Label: "Finish Workout"
//
// - onClick handler — FINISH WORKOUT FLOW:
//
//   Step 1 — VALIDATE: Check that every exercise has BOTH weight AND reps filled in.
//     - If any are empty, highlight those cards (e.g., add red border)
//     - Do NOT proceed. Show an error or visual indicator.
//
//   Step 2 — CREATE SESSION: Insert one row into workout_sessions
//     const { data: newSession } = await supabase
//       .from('workout_sessions')
//       .insert({ day_id: day_id })
//       .select()
//       .single()
//     - IMPORTANT: Create the session ONLY on "Finish" — NOT on screen load
//     - This prevents orphaned session rows if the user backs out
//
//   Step 3 — INSERT ALL LOGS: One row per exercise
//     const logs = exercises.map(ex => ({
//       session_id: newSession.id,
//       exercise_id: ex.exercise_id,
//       weight: parseFloat(inputValues[ex.exercise_id].weight),
//       weight_type: ex.exercises.equipment_type === 'barbell_dumbbell' ? 'per_side' : 'total',
//       reps: parseInt(inputValues[ex.exercise_id].reps),
//     }))
//     await supabase.from('workout_logs').insert(logs)
//
//   Step 4 — SUCCESS:
//     - Show toast: "Workout saved!"
//     - Navigate back to /gym (Gym Home)

// TODO 9: RENDER TOAST
// - <Toast message={toastMsg} isVisible={showToast} onDismiss={() => setShowToast(false)} />

// TODO 10: LOADING STATE
// - Show <LoadingSkeleton count={5} height="h-40" /> while data is fetching

// =============================================================
// PAGE WRAPPER
// =============================================================
// - <div className="px-4 pt-6 pb-28">
//   - pb-28 = extra bottom padding for the fixed "Finish Workout" button
//
// IMPORTANT NOTES:
// - Only the FINAL (top) set's weight and reps are saved per exercise
// - Target sets/reps are display-only guides — they are never logged
// - Warm-ups, rest timers, intermediate sets are all out of scope
// - The bottom nav may be hidden on this screen to maximize space
