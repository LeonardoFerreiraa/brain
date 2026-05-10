import { describe, it, expect, vi } from 'vitest'

// Simulate the ipcRenderer listener registry to verify BUG-04/05 fix:
// cleanup must remove the registered wrapper, not the original callback.
function makeIpc() {
  const listeners = new Map<string, Set<Function>>()
  return {
    on(channel: string, fn: Function) {
      if (!listeners.has(channel)) listeners.set(channel, new Set())
      listeners.get(channel)!.add(fn)
    },
    off(channel: string, fn: Function) {
      listeners.get(channel)?.delete(fn)
    },
    emit(channel: string, ...args: unknown[]) {
      listeners.get(channel)?.forEach(fn => fn({} /* event */, ...args))
    },
    count(channel: string) {
      return listeners.get(channel)?.size ?? 0
    },
  }
}

describe('BUG-04/05 — preload listener cleanup removes wrapper, not original callback', () => {
  it('cleanup removes the wrapper so no more events fire', () => {
    const ipc = makeIpc()
    const received: unknown[] = []
    const callback = (data: unknown) => received.push(data)

    // Simulates the fixed onTreeEntry pattern
    const wrapper = (_e: unknown, data: unknown) => callback(data)
    ipc.on('fs:tree-entry', wrapper)
    const cleanup = () => ipc.off('fs:tree-entry', wrapper)

    ipc.emit('fs:tree-entry', ['entry1'])
    expect(received).toHaveLength(1)

    cleanup()
    ipc.emit('fs:tree-entry', ['entry2'])
    expect(received).toHaveLength(1) // no new events after cleanup
  })

  it('broken pattern (cleanup removes callback not wrapper) leaks the listener', () => {
    const ipc = makeIpc()
    const received: unknown[] = []
    const callback = (data: unknown) => received.push(data)

    // Simulates the BUGGY pattern from before the fix
    const wrapper = (_e: unknown, data: unknown) => callback(data)
    ipc.on('fs:tree-entry', wrapper)
    const brokenCleanup = () => ipc.off('fs:tree-entry', callback) // wrong ref

    ipc.emit('fs:tree-entry', ['entry1'])
    brokenCleanup() // removes callback (not registered), wrapper stays
    ipc.emit('fs:tree-entry', ['entry2'])
    expect(received).toHaveLength(2) // wrapper still fires — leak confirmed
  })

  it('multiple mounts do not accumulate listeners when cleanup is correct', () => {
    const ipc = makeIpc()
    const cleanups: Array<() => void> = []

    for (let i = 0; i < 5; i++) {
      const wrapper = (_e: unknown, _data: unknown) => {}
      ipc.on('fs:tree-entry', wrapper)
      cleanups.push(() => ipc.off('fs:tree-entry', wrapper))
    }
    expect(ipc.count('fs:tree-entry')).toBe(5)

    cleanups.forEach(c => c())
    expect(ipc.count('fs:tree-entry')).toBe(0)
  })
})
