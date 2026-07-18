import { useEffect, useState } from 'react'
import { VRM } from '@pixiv/three-vrm'

interface AvatarDebugPanelProps {
  vrm: VRM | null
  setExpression: (name: string, weight: number) => void
  reset: () => void
}

/**
 * A beautiful, glassmorphic UI overlay containing sliders for each blendshape expression
 * on the loaded VRM. Used to manually test expression ranges.
 */
export default function AvatarDebugPanel({ vrm, setExpression, reset }: AvatarDebugPanelProps) {
  const [expressionWeights, setExpressionWeights] = useState<Record<string, number>>({})
  const [collapsed, setCollapsed] = useState(false)

  // Fetch available expression names on load or when VRM changes
  const expressions = vrm?.expressionManager?.expressions || []
  const expressionNames = expressions
    .map((e) => (e as any).expressionName || e.name)
    .filter(Boolean) as string[]

  // Initialize weights state
  useEffect(() => {
    const initialWeights: Record<string, number> = {}
    expressionNames.forEach((name) => {
      initialWeights[name] = vrm?.expressionManager?.getValue(name) ?? 0
    })
    setExpressionWeights(initialWeights)
  }, [vrm, expressionNames.join(',')])

  const handleSliderChange = (name: string, value: number) => {
    setExpressionWeights((prev) => ({ ...prev, [name]: value }))
    setExpression(name, value)
  }

  const handleReset = () => {
    reset()
    const resetWeights: Record<string, number> = {}
    expressionNames.forEach((name) => {
      resetWeights[name] = 0
    })
    setExpressionWeights(resetWeights)
  }

  if (!vrm) {
    return (
      <div style={panelStyle}>
        <h3 style={titleStyle}>Debug Panel</h3>
        <p style={{ fontSize: '14px', color: '#aaa', margin: 0 }}>
          Waiting for VRM model to load...
        </p>
      </div>
    )
  }

  // Logical groupings for clean layout
  const mouthShapes = ['aa', 'ee', 'ih', 'oh', 'ou']
  const basicEmotions = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed']
  const eyeControls = ['blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight']

  const categorized = {
    Emotions: expressionNames.filter((name) => basicEmotions.includes(name.toLowerCase())),
    Eyes: expressionNames.filter((name) => eyeControls.includes(name.toLowerCase())),
    Mouth: expressionNames.filter((name) => mouthShapes.includes(name.toLowerCase())),
    Others: expressionNames.filter(
      (name) =>
        !basicEmotions.includes(name.toLowerCase()) &&
        !eyeControls.includes(name.toLowerCase()) &&
        !mouthShapes.includes(name.toLowerCase())
    ),
  }

  return (
    <div style={{ ...panelStyle, height: collapsed ? 'auto' : undefined, paddingBottom: collapsed ? '10px' : '16px' }} className="avatar-debug-panel">
      <div style={{ ...headerStyle, marginBottom: collapsed ? '0px' : '12px', borderBottom: collapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: collapsed ? '0px' : '10px' }}>
        <div 
          onClick={() => setCollapsed(!collapsed)} 
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
          title={collapsed ? "Expand panel" : "Collapse panel"}
        >
          <span style={{ fontSize: '10px', color: '#a78bfa', transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▼</span>
          <h3 style={titleStyle}>Expression Controls</h3>
        </div>
        {!collapsed && (
          <button onClick={handleReset} style={resetButtonStyle}>
            Reset
          </button>
        )}
      </div>

      {!collapsed && (
        <div style={scrollAreaStyle}>
          {Object.entries(categorized).map(([category, names]) => {
            if (names.length === 0) return null
            return (
              <div key={category} style={{ marginBottom: '16px' }}>
                <div style={categoryTitleStyle}>{category}</div>
                {names.map((name) => {
                  const value = expressionWeights[name] ?? 0
                  return (
                    <div key={name} style={controlRowStyle}>
                      <div style={labelContainerStyle}>
                        <span style={labelStyle}>{name}</span>
                        <span id={`val-indicator-${name}`} style={valueStyle}>{value.toFixed(2)}</span>
                      </div>
                      <input
                        id={`slider-input-${name}`}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value}
                        onChange={(e) => handleSliderChange(name, parseFloat(e.target.value))}
                        style={sliderStyle}
                      />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Styling Constants
const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: '15px',
  right: '15px',
  width: '320px',
  maxHeight: 'calc(100% - 30px)',
  background: 'rgba(18, 18, 24, 0.85)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  color: '#f3f4f6',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  zIndex: 10,
  textAlign: 'left',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  paddingBottom: '10px',
  marginBottom: '12px',
}

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '16px',
  fontWeight: 600,
  letterSpacing: '-0.3px',
}

const resetButtonStyle: React.CSSProperties = {
  background: 'rgba(239, 68, 68, 0.15)',
  color: '#f87171',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  borderRadius: '6px',
  padding: '4px 10px',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
}

const scrollAreaStyle: React.CSSProperties = {
  overflowY: 'auto',
  flex: 1,
  paddingRight: '4px',
}

const categoryTitleStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  textTransform: 'uppercase',
  color: '#9ca3af',
  letterSpacing: '0.5px',
  marginBottom: '8px',
}

const controlRowStyle: React.CSSProperties = {
  marginBottom: '10px',
  display: 'flex',
  flexDirection: 'column',
}

const labelContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '13px',
  marginBottom: '4px',
}

const labelStyle: React.CSSProperties = {
  color: '#d1d5db',
}

const valueStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  color: '#a78bfa',
  fontWeight: 'bold',
}

const sliderStyle: React.CSSProperties = {
  width: '100%',
  cursor: 'pointer',
  accentColor: '#8b5cf6',
}
