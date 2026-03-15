'use client'

import { useRef, useEffect, useCallback } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'motion/react'

const SPRING = { stiffness: 400, damping: 35, mass: 0.5 }
const VELOCITY_THRESHOLD = 500
const RUBBER_BAND = 0.15

export default function SwipeableCard({ children, onEdit, onDelete, id }) {
  const contentRef = useRef(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const directionLockedRef = useRef(null)
  const isOpenRef = useRef(false)
  const startTimeRef = useRef(0)

  const hasEdit = typeof onEdit === 'function'
  const hasDelete = typeof onDelete === 'function'
  const buttonCount = (hasEdit ? 1 : 0) + (hasDelete ? 1 : 0)
  const ACTION_WIDTH = buttonCount * 75

  const x = useMotionValue(0)

  // Derived transforms for button reveal animations
  const buttonOpacity = useTransform(x, [-ACTION_WIDTH, -20, 0], [1, 0.3, 0])
  const buttonScale = useTransform(x, [-ACTION_WIDTH, -10, 0], [1, 0.7, 0.5])
  const editBtnX = useTransform(x, [-ACTION_WIDTH, 0], [0, 40])
  const deleteBtnX = useTransform(x, [-ACTION_WIDTH, 0], [0, hasEdit ? 60 : 40])

  const snapTo = useCallback((target) => {
    animate(x, target, SPRING)
    isOpenRef.current = target !== 0
  }, [x])

  // Keep ACTION_WIDTH in a ref so touch handlers always use the latest value
  const actionWidthRef = useRef(ACTION_WIDTH)
  actionWidthRef.current = ACTION_WIDTH

  useEffect(() => {
    function handleClose(e) {
      if (e.detail !== id && isOpenRef.current) {
        snapTo(0)
      }
    }
    window.addEventListener('swipecard-close', handleClose)
    return () => window.removeEventListener('swipecard-close', handleClose)
  }, [id, snapTo])

  // Register touch listeners directly on DOM with { passive: false } for touchmove
  // React 19 uses passive touch listeners by default, which silently ignores preventDefault()
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    function onTouchStart(e) {
      const touch = e.touches[0]
      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      startTimeRef.current = Date.now()
      directionLockedRef.current = null
      x.stop()
    }

    function onTouchMove(e) {
      const touch = e.touches[0]
      const diffX = touch.clientX - startXRef.current
      const diffY = touch.clientY - startYRef.current
      const AW = actionWidthRef.current

      if (!directionLockedRef.current) {
        if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
          directionLockedRef.current = Math.abs(diffX) > Math.abs(diffY) ? 'horizontal' : 'vertical'
        }
        return
      }

      if (directionLockedRef.current !== 'horizontal') return
      e.preventDefault()

      const baseX = isOpenRef.current ? -AW : 0
      let newX = baseX + diffX

      if (newX < -AW) {
        const over = newX + AW
        newX = -AW + over * RUBBER_BAND
      }
      if (newX > 0) {
        newX = newX * RUBBER_BAND
      }

      x.set(newX)
    }

    function onTouchEnd() {
      if (directionLockedRef.current !== 'horizontal') return
      const AW = actionWidthRef.current

      const current = x.get()
      const elapsed = Date.now() - startTimeRef.current
      const velocity = elapsed > 0 ? ((current - (isOpenRef.current ? -AW : 0)) / elapsed) * 1000 : 0

      if (velocity < -VELOCITY_THRESHOLD) {
        window.dispatchEvent(new CustomEvent('swipecard-close', { detail: id }))
        snapTo(-AW)
      } else if (velocity > VELOCITY_THRESHOLD) {
        snapTo(0)
      } else {
        if (current < -AW * 0.35) {
          window.dispatchEvent(new CustomEvent('swipecard-close', { detail: id }))
          snapTo(-AW)
        } else {
          snapTo(0)
        }
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [x, id, snapTo])

  if (buttonCount === 0) return children

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Action buttons behind */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center">
        {hasEdit && (
          <motion.button
            onClick={() => { snapTo(0); onEdit() }}
            className="w-[75px] flex items-center justify-center"
            style={{ opacity: buttonOpacity, scale: buttonScale, x: editBtnX }}
          >
            <div className="w-11 h-11 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">edit</span>
            </div>
          </motion.button>
        )}
        {hasDelete && (
          <motion.button
            onClick={() => { snapTo(0); onDelete() }}
            className="w-[75px] flex items-center justify-center"
            style={{ opacity: buttonOpacity, scale: buttonScale, x: deleteBtnX }}
          >
            <div className="w-11 h-11 rounded-full bg-rose-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[20px]">delete</span>
            </div>
          </motion.button>
        )}
      </div>

      {/* Card content */}
      <motion.div
        ref={contentRef}
        className="relative z-10 bg-inherit"
        style={{ x, willChange: 'transform', touchAction: 'pan-y' }}
      >
        {children}
      </motion.div>
    </div>
  )
}
