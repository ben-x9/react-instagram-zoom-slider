import { useRef, useEffect, useCallback } from 'react'
import { useSpring } from 'react-spring'
import { isTouchesInsideRect, getMiddleTouchOnElement, getLengthOfLine, clamp } from '../helpers'

export default function useZoom({ minScale, maxScale, onScale }) {
  const element = useRef(null)
  const initialBoundingRect = useRef(null)
  const firstTouch = useRef(null)
  const initialPinchLength = useRef(null)
  const firstOneFingerTouch = useRef(null)
  const currentMiddleTouchOnElement = useRef(null)
  const currentPinchLength = useRef(null)

  const [{ scale, middleTouchOnElement, translateX, translateY }, set] = useSpring(() => ({
    scale: 1,
    middleTouchOnElement: [0, 0],
    translateX: 0,
    translateY: 0,
    immediate: true,
    onFrame: ({ scale: currentScale }) => {
      if (typeof onScale === 'function') {
        onScale({ scale: currentScale })
      }
    },
  }))

  const handleTouchStart = useCallback(
    event => {
      if (event.touches.length !== 2) {
        return
      }

      initialBoundingRect.current = element.current.getBoundingClientRect()

      if (
        !event.touches.length ||
        !isTouchesInsideRect(event.touches, initialBoundingRect.current)
      ) {
        return
      }

      event.preventDefault()

      const [touch1, touch2] = event.touches
      const { clientX, clientY } = getMiddleTouchOnElement(
        event.touches,
        initialBoundingRect.current
      )

      firstTouch.current = [clientX, clientY]
      initialPinchLength.current = getLengthOfLine(touch1, touch2)

      set({ middleTouchOnElement: [clientX, clientY], immediate: true })
    },
    [set]
  )

  const handleTouchMove = useCallback(
    event => {
      if (firstTouch.current) {
        if (event.touches.length === 1) {
          if (!firstOneFingerTouch.current) {
            firstOneFingerTouch.current = [event.touches[0].clientX, event.touches[0].clientY]
          }
          set({
            scale: clamp(currentPinchLength.current / initialPinchLength.current, minScale, maxScale),
            translateX: (currentMiddleTouchOnElement.current.clientX - firstTouch.current[0]) + (event.touches[0].clientX - firstOneFingerTouch.current[0]),
            translateY: (currentMiddleTouchOnElement.current.clientY - firstTouch.current[1]) + (event.touches[0].clientY - firstOneFingerTouch.current[1]),
            immediate: true,
          })
        } else {
          currentMiddleTouchOnElement.current = getMiddleTouchOnElement(
            event.touches,
            initialBoundingRect.current
          )

          const [touch1, touch2] = event.touches
          currentPinchLength.current = getLengthOfLine(touch1, touch2)

          set({
            scale: clamp(currentPinchLength.current / initialPinchLength.current, minScale, maxScale),
            translateX: currentMiddleTouchOnElement.current.clientX - firstTouch.current[0],
            translateY: currentMiddleTouchOnElement.current.clientY - firstTouch.current[1],
            immediate: true,
          })
        }
      }
    },
    [set]
  )

  const handleTouchEnd = useCallback(() => {
    if (event.touches.length !== 0) {
      return
    }

    firstOneFingerTouch.current = null

    set({
      scale: 1,
      translateX: 0,
      translateY: 0,
      immediate: false,
    })

    firstTouch.current = null
    initialPinchLength.current = null
    initialBoundingRect.current = null
  }, [set])

  useEffect(() => {
    element.current.ontouchstart = handleTouchStart
    element.current.ontouchmove = handleTouchMove
    element.current.ontouchend = handleTouchEnd
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  return [element, scale, translateX, translateY, middleTouchOnElement]
}
