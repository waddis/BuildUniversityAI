'use client'

interface FormFieldProps {
  label: string
  name: string
  value: string
  onChange: (name: string, value: string) => void
  type?: 'text' | 'textarea' | 'select' | 'number'
  options?: { value: string; label: string }[]
  placeholder?: string
  required?: boolean
}

export default function FormField({
  label, name, value, onChange, type = 'text', options, placeholder, required
}: FormFieldProps) {
  const cls = 'w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-amber-500/50'

  return (
    <div>
      <label className="block text-white/60 text-xs font-medium mb-1.5">
        {label}{required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={cls}
        />
      ) : type === 'select' ? (
        <select value={value} onChange={e => onChange(name, e.target.value)} className={cls}>
          <option value="">Select...</option>
          {options?.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cls}
        />
      )}
    </div>
  )
}
