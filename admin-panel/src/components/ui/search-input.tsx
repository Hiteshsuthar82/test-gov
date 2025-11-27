import React, { useState, useEffect, useRef } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { Input } from './input'
import cn from 'classnames'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export const SearchInput = React.memo(function SearchInput({ 
  value, 
  onChange, 
  placeholder = 'Search...', 
  className,
  debounceMs = 300 
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Only update local value if it's different from the prop value
    // and the input is not currently focused (to prevent focus loss)
    if (value !== localValue && document.activeElement !== inputRef.current) {
      setLocalValue(value)
    }
  }, [value, localValue])

  const handleChange = (newValue: string) => {
    setLocalValue(newValue)
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onChange(newValue)
    }, debounceMs)
  }

  const handleClear = () => {
    setLocalValue('')
    onChange('')
    // Focus back on input after clear
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  return (
    <div className={cn('relative', className)}>
      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          type="button"
          tabIndex={-1}
        >
          <FiX className="w-4 h-4" />
        </button>
      )}
    </div>
  )
})

export default SearchInput

