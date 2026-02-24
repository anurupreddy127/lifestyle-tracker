'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import Card from '@/components/Card'
import LoadingSkeleton from '@/components/LoadingSkeleton'
import { Dumbbell } from 'lucide-react'

export default function GymHome() {
  const router = useRouter()
  const [days, setDays] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDays() {
      const { data } = await supabase
        .from('workout_days')
        .select('id, name, day_exercises(count)')
        .order('created_at', { ascending: true })
      setDays(data || [])
      setLoading(false)
    }
    fetchDays()
  }, [])

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-50">My Workouts</h1>
        <button
          onClick={() => router.push('/gym/library')}
          className="text-slate-400 active:text-indigo-400 p-2"
        >
          <Dumbbell size={22} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton count={4} height="h-20" />
      ) : days.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
          <Dumbbell size={40} />
          <p className="text-sm">No days yet. Create your first workout!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map((day) => {
            const exerciseCount = day.day_exercises?.[0]?.count ?? 0
            return (
              <Card
                key={day.id}
                onClick={() => router.push(`/gym/workout/${day.id}`)}
              >
                <h3 className="text-base font-semibold text-slate-50">{day.name}</h3>
                <p className="text-xs text-slate-400">{exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}</p>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create New Day Button */}
      <button
        onClick={() => router.push('/gym/builder')}
        className="bg-indigo-600 active:bg-indigo-700 text-white font-semibold rounded-xl py-4 w-full text-base mt-6"
      >
        + Create New Day
      </button>
    </div>
  )
}
