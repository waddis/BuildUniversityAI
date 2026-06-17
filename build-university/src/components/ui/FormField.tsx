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
  const cls = 'w-full px-3 py-2 bg-[#2a2a2a] rounded-lg text-[#e5e2e1] text-sm placeholder:text-[#e5e2e1]/20 focus:outline-none focus:ring-1 focus:ring-[#FF8C00]/50'

  return (
    <div>
      <label className="block text-[#e5e2e1]/60 text-xs font-medium mb-1.5">
        {label}{required && <span className="text-[#FF8C00] ml-0.5">*</span>}
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
