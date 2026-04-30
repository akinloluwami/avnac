import { describe, expect, it } from 'vitest'
import { transferMayContainFiles } from '../scene-engine/primitives/files'

function makeTransfer(types: string[]): DataTransfer {
  return { types } as unknown as DataTransfer
}

describe('transferMayContainFiles', () => {
  it('accepts generic file drags before file details are available', () => {
    expect(transferMayContainFiles(makeTransfer(['Files']))).toBe(true)
  })

  it('ignores non-file drags', () => {
    expect(transferMayContainFiles(makeTransfer(['text/plain']))).toBe(false)
  })
})
