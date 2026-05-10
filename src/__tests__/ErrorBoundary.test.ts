import { describe, it, expect, vi } from 'vitest'
import { ErrorBoundary } from '../renderer/components/ErrorBoundary'

describe('ErrorBoundary', () => {
  it('initial state has no error', () => {
    const instance = new ErrorBoundary({ children: null })
    expect((instance as unknown as { state: { hasError: boolean; error: null } }).state.hasError).toBe(false)
    expect((instance as unknown as { state: { hasError: boolean; error: null } }).state.error).toBe(null)
  })

  it('getDerivedStateFromError captures the error', () => {
    const error = new Error('render crash')
    const state = ErrorBoundary.getDerivedStateFromError(error)
    expect(state.hasError).toBe(true)
    expect(state.error).toBe(error)
  })

  it('getDerivedStateFromError works for any Error subclass', () => {
    class CustomError extends Error {}
    const error = new CustomError('custom')
    const state = ErrorBoundary.getDerivedStateFromError(error)
    expect(state.hasError).toBe(true)
    expect(state.error).toBeInstanceOf(CustomError)
  })

  it('componentDidCatch logs to console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const instance = new ErrorBoundary({ children: null })
    const error = new Error('boom')
    instance.componentDidCatch(error, { componentStack: '\n  at App' })
    expect(spy).toHaveBeenCalledWith('React render error:', error, '\n  at App')
    spy.mockRestore()
  })
})
