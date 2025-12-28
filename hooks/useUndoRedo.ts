// hooks/useUndoRedo.ts
import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });
  
  const isInternalUpdate = useRef(false);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prev => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev.present)
        : newState;
      
      if (JSON.stringify(nextState) === JSON.stringify(prev.present)) {
        return prev;
      }
      
      const newPast = [...prev.past, prev.present].slice(-maxHistory);
      
      return {
        past: newPast,
        present: nextState,
        future: []
      };
    });
  }, [maxHistory]);

  const setStateWithoutHistory = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory(prev => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev.present)
        : newState;
      return { ...prev, present: nextState };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.past.length === 0) return prev;
      
      const newPast = [...prev.past];
      const previousState = newPast.pop()!;
      
      return {
        past: newPast,
        present: previousState,
        future: [prev.present, ...prev.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(prev => {
      if (prev.future.length === 0) return prev;
      
      const newFuture = [...prev.future];
      const nextState = newFuture.shift()!;
      
      return {
        past: [...prev.past, prev.present],
        present: nextState,
        future: newFuture
      };
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setHistory({
      past: [],
      present: newState,
      future: []
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    setState,
    setStateWithoutHistory,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
    historyLength: history.past.length,
    futureLength: history.future.length
  };
}
