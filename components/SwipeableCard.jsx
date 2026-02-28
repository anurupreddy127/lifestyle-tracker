'use client'

import { useRef, useEffect, useCallback } from 'react'

export default function SwipeableCard({ children, onEdit, onDelete, id }) {
  const cardRef = useRef(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const currentXRef = useRef(0)
  const directionLockedRef = useRef(null)
  const isOpenRef = useRef(false)

  const hasEdit = typeof onEdit === 'function'
  const hasDelete = typeof onDelete === 'function'
  const buttonCount = (hasEdit ? 1 : 0) + (hasDelete ? 1 : 0)
  const ACTION_WIDTH = buttonCount * 70

  const snapClosed = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease'
      cardRef.current.style.transform = 'translateX(0)'
    }
    currentXRef.current = 0
    isOpenRef.current = false
  }, [])

  const snapOpen = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.style.transition = 'transform 0.3s ease'
      cardRef.current.style.transform = `translateX(-${ACTION_WIDTH}px)`
    }
    currentXRef.current = -ACTION_WIDTH
    isOpenRef.current = true
  }, [ACTION_WIDTH])

  useEffect(() => {
    function handleClose(e) {
      if (e.detail !== id) {
        snapClosed()
      }
    }
    window.addEventListener('swipecard-close', handleClose)
    return () => window.removeEventListener('swipecard-close', handleClose)
  }, [id, snapClosed])

  function handleTouchStart(e) {
    const touch = e.touches[0]
    startXRef.current = touch.clientX
    startYRef.current = touch.clientY
    directionLockedRef.current = null
    if (cardRef.current) {
      cardRef.current.style.transition = 'none'
    }
  }

  function handleTouchMove(e) {
    const touch = e.touches[0]
    const diffX = touch.clientX - startXRef.current
    const diffY = touch.clientY - startYRef.current

    // Lock direction after threshold
    if (!directionLockedRef.current) {
      if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
        directionLockedRef.current = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical'
      }
      return
    }

    if (directionLockedRef.current !== 'horizontal') return

    e.preventDefault()

    const baseX = isOpenRef.current ? -ACTION_WIDTH : 0
    let newX = baseX + diffX
    // Clamp: don't go right of 0, don't go left beyond ACTION_WIDTH
    newX = Math.max(-ACTION_WIDTH, Math.min(0, newX))

    if (cardRef.current) {
      cardRef.current.style.transform = `translateX(${newX}px)`
    }
    currentXRef.current = newX
  }

  function handleTouchEnd() {
    if (directionLockedRef.current !== 'horizontal') return

    const threshold = -ACTION_WIDTH * 0.35
    if (currentXRef.current <= threshold) {
      // Close other cards, open this one
      window.dispatchEvent(new CustomEvent('swipecard-close', { detail: id }))
      snapOpen()
    } else {
      snapClosed()
    }
  }

  if (buttonCount === 0) return children

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex">
        {hasEdit && (
          <button
            onClick={() => { snapClosed(); onEdit() }}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-blue-500 text-white"
          >
            <span className="material-symbols-outlined text-[20px]">edit</span>
            <span className="text-[10px] font-semibold">Edit</span>
          </button>
        )}
        {hasDelete && (
          <button
            onClick={() => { snapClosed(); onDelete() }}
            className="w-[70px] flex flex-col items-center justify-center gap-1 bg-rose-500 text-white"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
            <span className="text-[10px] font-semibold">Delete</span>
          </button>
        )}
      </div>

      {/* Card content */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 bg-inherit"
        style={{ willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  )
}
