export const EQUIPMENT_TYPES = ['dumbbell', 'barbell', 'machine', 'no_equipment']

export const EQUIPMENT_LABELS = {
  dumbbell: 'Dumbbell',
  barbell: 'Barbell',
  machine: 'Machine',
  no_equipment: 'Bodyweight',
}

export const EQUIPMENT_ICONS = {
  dumbbell: 'exercise',
  barbell: 'fitness_center',
  machine: 'precision_manufacturing',
  no_equipment: 'back_hand',
}

export const WEIGHT_TYPE_FOR = {
  dumbbell: 'per_side',
  barbell: 'per_side',
  machine: 'total',
  no_equipment: 'bodyweight',
}

export function isBodyweight(eq) {
  return eq === 'no_equipment'
}

export function normalizeEquipment(eq) {
  if (eq === 'barbell_dumbbell') return 'dumbbell'
  if (!eq) return 'dumbbell'
  return eq
}
