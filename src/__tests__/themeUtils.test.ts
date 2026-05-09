import { describe, it, expect } from 'vitest'
import {
  resolveEffectiveTheme,
  getHighlightJsTheme,
  isValidThemeSetting,
} from '../utils/themeUtils'

describe('resolveEffectiveTheme', () => {
  it('dark setting → dark', () => {
    expect(resolveEffectiveTheme('dark', false)).toBe('dark')
    expect(resolveEffectiveTheme('dark', true)).toBe('dark')
  })

  it('light setting → light', () => {
    expect(resolveEffectiveTheme('light', false)).toBe('light')
    expect(resolveEffectiveTheme('light', true)).toBe('light')
  })

  it('system + dark OS → dark', () => {
    expect(resolveEffectiveTheme('system', true)).toBe('dark')
  })

  it('system + light OS → light', () => {
    expect(resolveEffectiveTheme('system', false)).toBe('light')
  })
})

describe('getHighlightJsTheme', () => {
  it('dark → github-dark', () => {
    expect(getHighlightJsTheme('dark')).toBe('github-dark')
  })

  it('light → github', () => {
    expect(getHighlightJsTheme('light')).toBe('github')
  })
})

describe('isValidThemeSetting', () => {
  it('true for system', () => expect(isValidThemeSetting('system')).toBe(true))
  it('true for light', () => expect(isValidThemeSetting('light')).toBe(true))
  it('true for dark', () => expect(isValidThemeSetting('dark')).toBe(true))
  it('false for invalid', () => expect(isValidThemeSetting('blue')).toBe(false))
  it('false for null', () => expect(isValidThemeSetting(null)).toBe(false))
  it('false for undefined', () => expect(isValidThemeSetting(undefined)).toBe(false))
  it('false for number', () => expect(isValidThemeSetting(1)).toBe(false))
})
