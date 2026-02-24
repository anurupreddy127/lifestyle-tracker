// =============================================================
// app/gym/builder/[day_id]/page.jsx — [GYM-3] Day Builder (Edit Mode)
// =============================================================
// Same UI as the create builder, but pre-populated with existing Day data.
// Allows editing the day name, adding/removing exercises, reordering.
// Route: /gym/builder/[day_id]
// Ref: App_Flow [GYM-3], PRD Section 3.2
// =============================================================

// TODO 1: DIRECTIVE
// - Add 'use client' at the top

// TODO 2: IMPORTS
// - Same as create builder (gym/builder/page.jsx)
// - Additionally import useParams from 'next/navigation' to get day_id

// TODO 3: STATE VARIABLES
// - Same as create builder, plus:
// - loading: boolean (need to fetch existing data first)

// TODO 4: GET day_id FROM URL PARAMS
// - const { day_id } = useParams()

// TODO 5: FETCH EXISTING DAY DATA ON MOUNT
// Run these queries when the component mounts:
//
// 5a. FETCH DAY NAME:
//   const { data: dayData } = await supabase
//     .from('workout_days')
//     .select('name')
//     .eq('id', day_id)
//     .single()
//   Pre-populate dayName state with dayData.name
//
// 5b. FETCH EXISTING EXERCISES IN THIS DAY:
//   const { data: existingExercises } = await supabase
//     .from('day_exercises')
//     .select('*, exercises(id, name, equipment_type)')
//     .eq('day_id', day_id)
//     .order('sort_order', { ascending: true })
//
//   Map these to selectedExercises format:
//     existingExercises.map(de => ({
//       exercise_id: de.exercise_id,
//       name: de.exercises.name,
//       equipment_type: de.exercises.equipment_type,
//       target_sets: de.target_sets,
//       target_reps: de.target_reps,
//     }))
//
// 5c. FETCH ALL EXERCISES (for the picker):
//   Same as create builder (all exercises from exercises table)

// TODO 6: UI — SAME AS CREATE BUILDER
// - Header says "Edit Day" instead of "Build Day"
// - Day name input pre-filled
// - Exercises list pre-populated
// - Exercise Picker, Target Prompt — all identical behavior
// - All reorder, add, remove operations work the same

// TODO 7: SAVE FLOW (EDIT MODE — different from create)
// - VALIDATION: Same as create (name not empty, at least 1 exercise)
//
// - DATABASE OPERATIONS:
//   Step 1 — Update the day name:
//     await supabase
//       .from('workout_days')
//       .update({ name: dayName })
//       .eq('id', day_id)
//
//   Step 2 — DELETE all old day_exercises for this day:
//     await supabase
//       .from('day_exercises')
//       .delete()
//       .eq('day_id', day_id)
//     (CASCADE on day_exercises means this is safe)
//
//   Step 3 — INSERT fresh day_exercises with updated sort_order:
//     const dayExercises = selectedExercises.map((ex, index) => ({
//       day_id: day_id,
//       exercise_id: ex.exercise_id,
//       target_sets: parseInt(ex.target_sets),
//       target_reps: parseInt(ex.target_reps),
//       sort_order: index,
//     }))
//     await supabase.from('day_exercises').insert(dayExercises)
//
//   Step 4 — Navigate back:
//     router.push('/gym')

// =============================================================
// NOTE: Consider refactoring — the create and edit builders share
// ~90% of their UI. You could extract a shared DayBuilderForm
// component and have both pages use it with different save logic.
// =============================================================
