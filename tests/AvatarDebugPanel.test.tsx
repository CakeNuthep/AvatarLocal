import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import AvatarDebugPanel from '../src/avatar/AvatarDebugPanel'
import { VRM } from '@pixiv/three-vrm'

describe('AvatarDebugPanel', () => {
  test('renders loading text when vrm is null', () => {
    render(<AvatarDebugPanel vrm={null} setExpression={vi.fn()} reset={vi.fn()} />)
    expect(screen.getByText(/Waiting for VRM model to load/i)).toBeInTheDocument()
  })

  test('renders sliders for expression list when vrm is provided', () => {
    const mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
          { name: 'sad' },
        ],
        getValue: vi.fn().mockReturnValue(0.2),
      },
    } as unknown as VRM

    render(<AvatarDebugPanel vrm={mockVRM} setExpression={vi.fn()} reset={vi.fn()} />)

    expect(screen.getByText('happy')).toBeInTheDocument()
    expect(screen.getByText('sad')).toBeInTheDocument()
    
    // There are two expression labels showing 0.20
    const valueIndicators = screen.getAllByText('0.20')
    expect(valueIndicators).toHaveLength(2)
  })

  test('triggers setExpression on slider input change', () => {
    const mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
        ],
        getValue: vi.fn().mockReturnValue(0),
      },
    } as unknown as VRM

    const setExpressionSpy = vi.fn()
    render(<AvatarDebugPanel vrm={mockVRM} setExpression={setExpressionSpy} reset={vi.fn()} />)

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '0.85' } })

    expect(setExpressionSpy).toHaveBeenCalledWith('happy', 0.85)
  })

  test('triggers reset on Reset button click', () => {
    const mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
        ],
        getValue: vi.fn().mockReturnValue(0.5),
      },
    } as unknown as VRM

    const resetSpy = vi.fn()
    render(<AvatarDebugPanel vrm={mockVRM} setExpression={vi.fn()} reset={resetSpy} />)

    const resetButton = screen.getByRole('button', { name: /Reset/i })
    fireEvent.click(resetButton)

    expect(resetSpy).toHaveBeenCalled()
    // Value indicators should update to 0.00
    expect(screen.getByText('0.00')).toBeInTheDocument()
  })
})
