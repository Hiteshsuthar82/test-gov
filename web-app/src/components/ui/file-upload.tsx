import React, { useState, useRef } from 'react'
import { Button } from './button'
import { Label } from './label'
import { FiUpload, FiX, FiImage } from 'react-icons/fi'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  value?: File | null
  onChange: (file: File | null) => void
  label?: string
  required?: boolean
  className?: string
  accept?: string
}

export function FileUpload({
  value,
  onChange,
  label,
  required = false,
  className,
  accept = 'image/*',
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(value || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    // Store file and create preview
    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Pass file to parent component
    onChange(file)
  }

  const handleRemove = () => {
    setPreview(null)
    setSelectedFile(null)
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={handleClick}
        >
          <FiUpload className="w-4 h-4 mr-2" />
          Select File
        </Button>
        {selectedFile && (
          <Button
            type="button"
            variant="outline"
            onClick={handleRemove}
          >
            <FiX className="w-4 h-4" />
          </Button>
        )}
      </div>

      {preview && selectedFile && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-48 object-contain border border-gray-200 rounded"
          />
          <div className="mt-2 text-xs text-gray-500">
            File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          </div>
        </div>
      )}

      {!preview && !selectedFile && (
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No image selected</p>
            <p className="text-xs text-gray-400 mt-1">Click "Select File" to upload an image</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default FileUpload

