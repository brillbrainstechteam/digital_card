import { useCallback, useEffect, useReducer, useRef } from 'react'

const MAX_HISTORY = 50

function snapshot(value) {
  return JSON.stringify(value)
}

function restore(value) {
  return JSON.parse(value)
}

function historyReducer(history, action) {
  if (action.type === 'reset') {
    return { present: action.value, undo: [], redo: [] }
  }

  if (action.type === 'set') {
    const next = typeof action.value === 'function' ? action.value(history.present) : action.value
    const currentSnapshot = snapshot(history.present)
    const nextSnapshot = snapshot(next)
    if (nextSnapshot === currentSnapshot) {
      if (action.fromSnapshot && action.fromSnapshot !== currentSnapshot) {
        return {
          present: next,
          undo: [...history.undo, action.fromSnapshot].slice(-MAX_HISTORY),
          redo: [],
        }
      }
      return history
    }
    if (action.commit === false) {
      return {
        ...history,
        present: next,
      }
    }
    return {
      present: next,
      undo: [...history.undo, action.fromSnapshot || currentSnapshot].slice(-MAX_HISTORY),
      redo: [],
    }
  }

  if (action.type === 'undo') {
    if (!history.undo.length) return history
    const previous = history.undo[history.undo.length - 1]
    return {
      present: restore(previous),
      undo: history.undo.slice(0, -1),
      redo: [snapshot(history.present), ...history.redo].slice(0, MAX_HISTORY),
    }
  }

  if (action.type === 'redo') {
    if (!history.redo.length) return history
    const next = history.redo[0]
    return {
      present: restore(next),
      undo: [...history.undo, snapshot(history.present)].slice(-MAX_HISTORY),
      redo: history.redo.slice(1),
    }
  }

  return history
}

export function useHistory(initialValue, options = {}) {
  const [history, dispatch] = useReducer(historyReducer, {
    present: initialValue,
    undo: [],
    redo: [],
  })
  const onRestoreRef = useRef(options.onRestore)

  useEffect(() => {
    onRestoreRef.current = options.onRestore
  }, [options.onRestore])

  const set = useCallback((next, options = {}) => {
    dispatch({ type: 'set', value: next, commit: options.commit, fromSnapshot: options.fromSnapshot })
  }, [])

  const reset = useCallback((next) => {
    dispatch({ type: 'reset', value: next })
  }, [])

  const clear = useCallback(() => {
    dispatch({ type: 'reset', value: history.present })
  }, [history.present])

  const undo = useCallback(() => {
    dispatch({ type: 'undo' })
    onRestoreRef.current?.()
  }, [])

  const redo = useCallback(() => {
    dispatch({ type: 'redo' })
    onRestoreRef.current?.()
  }, [])

  useEffect(() => {
    function handleKeyDown(event) {
      if (!event.ctrlKey) return
      const key = event.key.toLowerCase()
      if (key === 'z' && event.shiftKey) {
        event.preventDefault()
        redo()
      } else if (key === 'z') {
        event.preventDefault()
        undo()
      } else if (key === 'y') {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  return {
    state: history.present,
    set,
    reset,
    clear,
    undo,
    redo,
    canUndo: history.undo.length > 0,
    canRedo: history.redo.length > 0,
  }
}
