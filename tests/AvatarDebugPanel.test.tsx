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

  test('collapses and expands controls when clicking header toggle', () => {
    const mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
        ],
        getValue: vi.fn().mockReturnValue(0),
      },
    } as unknown as VRM

    render(<AvatarDebugPanel vrm={mockVRM} setExpression={vi.fn()} reset={vi.fn()} />)

    // Sliders are rendered initially
    expect(screen.getByText('happy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()

    // Click the toggle area
    const toggleArea = screen.getByText('Expression Controls')
    fireEvent.click(toggleArea)

    // Sliders and Reset button should be hidden
    expect(screen.queryByText('happy')).toBeNull()
    expect(screen.queryByRole('button', { name: /Reset/i })).toBeNull()

    // Click again to expand
    fireEvent.click(toggleArea)

    // Sliders should be visible again
    expect(screen.getByText('happy')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset/i })).toBeInTheDocument()
  })

  test('triggers onSpeak when typing text and clicking Speak button', () => {
    const mockVRM = {
      expressionManager: {
        expressions: [
          { name: 'happy' },
        ],
        getValue: vi.fn().mockReturnValue(0),
      },
    } as unknown as VRM

    const speakSpy = vi.fn().mockResolvedValue(undefined)
    render(
      <AvatarDebugPanel
        vrm={mockVRM}
        setExpression={vi.fn()}
        reset={vi.fn()}
        onSpeak={speakSpy}
      />
    )

    const input = screen.getByPlaceholderText(/Type text to speak.../i) as HTMLInputElement
    const button = screen.getByRole('button', { name: /Speak/i })

    // Initially button is disabled
    expect(button).toBeDisabled()

    // Type text
    fireEvent.change(input, { target: { value: 'Test direct voice synthesis' } })
    expect(input.value).toBe('Test direct voice synthesis')
    expect(button).not.toBeDisabled()

    // Click button
    fireEvent.click(button)
    expect(speakSpy).toHaveBeenCalledWith('Test direct voice synthesis')
  })
})
