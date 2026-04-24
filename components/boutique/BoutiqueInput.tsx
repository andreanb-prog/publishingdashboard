'use client'

interface BoutiqueInputProps {
  value?: string
  defaultValue?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  placeholder?: string
  type?: string
  disabled?: boolean
  readOnly?: boolean
  mono?: boolean
  multiline?: boolean
  rows?: number
  label?: string
  id?: string
  name?: string
  autoComplete?: string
  className?: string
  style?: React.CSSProperties
  inputStyle?: React.CSSProperties
}

const baseInputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #E8E1D3',
  borderRadius: 2,
  padding: '8px 12px',
  fontSize: 13,
  lineHeight: 1.5,
  color: '#1E2D3D',
  background: '#FFFFFF',
  outline: 'none',
  transition: 'border-color 0.15s ease',
  boxShadow: 'none',
}

export function BoutiqueInput({
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder,
  type = 'text',
  disabled = false,
  readOnly = false,
  mono = false,
  multiline = false,
  rows = 4,
  label,
  id,
  name,
  autoComplete,
  className = '',
  style,
  inputStyle,
}: BoutiqueInputProps) {
  const computedInputStyle: React.CSSProperties = {
    ...baseInputStyle,
    fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
    background: readOnly ? '#F7F1E6' : '#FFFFFF',
    ...inputStyle,
  }

  const focusStyle = `
    .boutique-input:focus {
      border-color: #D97706 !important;
      box-shadow: 0 0 0 2px rgba(217,119,6,0.12) !important;
    }
  `

  return (
    <div className={className} style={style}>
      <style>{focusStyle}</style>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#6B7280',
            marginBottom: 6,
          }}
        >
          {label}
        </label>
      )}
      {multiline ? (
        <textarea
          id={id}
          name={name}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLTextAreaElement>}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          rows={rows}
          className="boutique-input"
          style={{ ...computedInputStyle, resize: 'vertical' }}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
          onBlur={onBlur as React.FocusEventHandler<HTMLInputElement>}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          autoComplete={autoComplete}
          className="boutique-input"
          style={computedInputStyle}
        />
      )}
    </div>
  )
}
