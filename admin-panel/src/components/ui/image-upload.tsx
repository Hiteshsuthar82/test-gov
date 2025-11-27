import React, { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { FiUpload, FiX, FiImage } from 'react-icons/fi'
import cn from 'classnames'

interface ImageUploadProps {
  value?: string
  onChange: (file: File | null, url?: string) => void
  label?: string
  required?: boolean
  className?: string
  folder?: string
  accept?: string
}

export function ImageUpload({
  value,
  onChange,
  label,
  required = false,
  className,
  folder = 'general',
  accept = 'image/*',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUrlInput, setIsUrlInput] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value && !selectedFile) {
      setPreview(value)
    }
  }, [value, selectedFile])

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

    // Store file locally and create preview
    setSelectedFile(file)
    setIsUrlInput(false)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Pass file to parent component
    onChange(file)
  }

  const handleUrlChange = (url: string) => {
    if (url) {
      setPreview(url)
      setIsUrlInput(true)
      setSelectedFile(null)
      // Pass URL to parent - backend will fetch and upload
      onChange(null, url)
    } else {
      setPreview(null)
      setIsUrlInput(false)
      setSelectedFile(null)
      onChange(null)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setSelectedFile(null)
    setIsUrlInput(false)
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
      
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Input
            type="text"
            value={isUrlInput ? (value || '') : ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="Or enter image URL"
            className="mb-2"
          />
        </div>
        <div className="flex gap-2">
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
          {(preview || selectedFile) && (
            <Button
              type="button"
              variant="outline"
              onClick={handleRemove}
            >
              <FiX className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {preview && (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Preview"
            className="max-w-xs max-h-48 object-contain border border-gray-200 rounded"
          />
          {selectedFile && (
            <div className="mt-2 text-xs text-gray-500">
              File: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
            </div>
          )}
          {isUrlInput && (
            <div className="mt-2 text-xs text-gray-500">
              URL: Will be fetched and uploaded on save
            </div>
          )}
        </div>
      )}

      {!preview && !value && (
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <FiImage className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No image selected</p>
            <p className="text-xs text-gray-400 mt-1">Select a file or enter a URL</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ImageUpload

