import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Button } from './button'
import { Label } from './label'
import { Select } from './select'

interface FieldMapping {
  section: string
  questionOrder: string
  correctOption: string
  marks: string
  averageTime: string
  tags: string
  // English fields
  'eng-direction': string
  'eng-question': string
  'eng-A': string
  'eng-B': string
  'eng-C': string
  'eng-D': string
  'eng-E': string
  'eng-solutionText': string
  // Hindi fields
  'hn-direction': string
  'hn-question': string
  'hn-A': string
  'hn-B': string
  'hn-C': string
  'hn-D': string
  'hn-E': string
  'hn-solutionText': string
  // Gujarati fields
  'guj-direction': string
  'guj-question': string
  'guj-A': string
  'guj-B': string
  'guj-C': string
  'guj-D': string
  'guj-E': string
  'guj-solutionText': string
}

interface FieldMappingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  excelColumns: string[]
  onConfirm: (mapping: FieldMapping) => void
}

const DEFAULT_MAPPING: FieldMapping = {
  section: 'section',
  questionOrder: 'QSNo',
  correctOption: 'correctOption',
  marks: 'marks',
  averageTime: 'avg answer time',
  tags: 'tags',
  'eng-direction': 'eng-direction',
  'eng-question': 'eng-question',
  'eng-A': 'eng-A',
  'eng-B': 'eng-B',
  'eng-C': 'eng-C',
  'eng-D': 'eng-D',
  'eng-E': 'eng-E',
  'eng-solutionText': 'eng-solutionText',
  'hn-direction': 'hn-direction',
  'hn-question': 'hn-question',
  'hn-A': 'hn-A',
  'hn-B': 'hn-B',
  'hn-C': 'hn-C',
  'hn-D': 'hn-D',
  'hn-E': 'hn-E',
  'hn-solutionText': 'hn-solutionText',
  'guj-direction': 'guj-direction',
  'guj-question': 'guj-question',
  'guj-A': 'guj-A',
  'guj-B': 'guj-B',
  'guj-C': 'guj-C',
  'guj-D': 'guj-D',
  'guj-E': 'guj-E',
  'guj-solutionText': 'guj-solutionText',
}

const FIELD_LABELS: Record<keyof FieldMapping, string> = {
  section: 'Section',
  questionOrder: 'Question Order',
  correctOption: 'Correct Option',
  marks: 'Marks',
  averageTime: 'Average Time (seconds)',
  tags: 'Tags',
  'eng-direction': 'English Direction (formatted)',
  'eng-question': 'English Question Text (formatted)',
  'eng-A': 'English Option A',
  'eng-B': 'English Option B',
  'eng-C': 'English Option C',
  'eng-D': 'English Option D',
  'eng-E': 'English Option E',
  'eng-solutionText': 'English Explanation (formatted)',
  'hn-direction': 'Hindi Direction (formatted)',
  'hn-question': 'Hindi Question Text (formatted)',
  'hn-A': 'Hindi Option A',
  'hn-B': 'Hindi Option B',
  'hn-C': 'Hindi Option C',
  'hn-D': 'Hindi Option D',
  'hn-E': 'Hindi Option E',
  'hn-solutionText': 'Hindi Explanation (formatted)',
  'guj-direction': 'Gujarati Direction (formatted)',
  'guj-question': 'Gujarati Question Text (formatted)',
  'guj-A': 'Gujarati Option A',
  'guj-B': 'Gujarati Option B',
  'guj-C': 'Gujarati Option C',
  'guj-D': 'Gujarati Option D',
  'guj-E': 'Gujarati Option E',
  'guj-solutionText': 'Gujarati Explanation (formatted)',
}

export function FieldMappingDialog({ open, onOpenChange, excelColumns, onConfirm }: FieldMappingDialogProps) {
  const [mapping, setMapping] = useState<FieldMapping>(DEFAULT_MAPPING)

  // Auto-map columns that match default values (case-insensitive)
  useEffect(() => {
    if (excelColumns.length > 0) {
      const newMapping = { ...DEFAULT_MAPPING }
      
      excelColumns.forEach((col) => {
        const colLower = col.toLowerCase().trim()
        
        // Try to match each default field with exact or close matches
        Object.keys(DEFAULT_MAPPING).forEach((key) => {
          const defaultValue = DEFAULT_MAPPING[key as keyof FieldMapping].toLowerCase().trim()
          
          // Exact match (highest priority)
          if (colLower === defaultValue) {
            newMapping[key as keyof FieldMapping] = col
            return
          }
          
          // For specific fields, use more precise matching
          if (key === 'section') {
            // Section should match "section" exactly or be very close
            if (colLower === 'section' || colLower === 'section name') {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key === 'correctOption') {
            // Correct Option should match "correct option" or "correctoption" or "correct option [a-e]"
            if (colLower.includes('correct') && (colLower.includes('option') || colLower.includes('answer'))) {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key === 'marks') {
            // Marks should match "marks" exactly, not "negative marks"
            if (colLower === 'marks' || colLower === 'mark') {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key === 'averageTime') {
            // Average Time should match "avg answer time" or similar
            if (colLower.includes('avg') && (colLower.includes('answer') || colLower.includes('time'))) {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key === 'tags') {
            // Tags should match "tags" exactly
            if (colLower === 'tags' || colLower === 'tag') {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key === 'questionOrder') {
            // Question Order should match "QSNo" exactly
            if (colLower === 'qsno' || colLower === 'question order' || colLower === 'qno') {
              newMapping[key as keyof FieldMapping] = col
            }
          } else if (key.startsWith('eng-') || key.startsWith('hn-') || key.startsWith('guj-')) {
            // Language fields - match exactly with prefix
            const prefix = key.split('-')[0] // eng, hn, or guj
            const fieldName = key.split('-').slice(1).join('-') // direction, question, A, B, etc.
            
            // For direction, match "eng-direction", "eng direction", etc. but NOT "eng-D"
            if (fieldName === 'direction') {
              if (colLower === `${prefix}-direction` || colLower === `${prefix} direction` || colLower === `${prefix}_direction`) {
                newMapping[key as keyof FieldMapping] = col
              }
            } else if (fieldName === 'question') {
              if (colLower === `${prefix}-question` || colLower === `${prefix} question` || colLower === `${prefix}_question`) {
                newMapping[key as keyof FieldMapping] = col
              }
            } else if (fieldName === 'solutionText') {
              if (colLower === `${prefix}-solutiontext` || colLower === `${prefix} solutiontext` || colLower === `${prefix}_solutiontext` || 
                  colLower === `${prefix}-solution` || colLower === `${prefix} solution`) {
                newMapping[key as keyof FieldMapping] = col
              }
            } else if (['A', 'B', 'C', 'D', 'E'].includes(fieldName)) {
              // For options, match exactly like "eng-A", "eng A", "eng_A"
              if (colLower === `${prefix}-${fieldName.toLowerCase()}` || 
                  colLower === `${prefix} ${fieldName.toLowerCase()}` || 
                  colLower === `${prefix}_${fieldName.toLowerCase()}`) {
                newMapping[key as keyof FieldMapping] = col
              }
            }
          }
        })
      })
      
      setMapping(newMapping)
    }
  }, [excelColumns])

  const handleMappingChange = (field: keyof FieldMapping, value: string) => {
    setMapping({ ...mapping, [field]: value })
  }

  const handleConfirm = () => {
    onConfirm(mapping)
    onOpenChange(false)
  }

  const handleReset = () => {
    setMapping(DEFAULT_MAPPING)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map Excel Columns to Fields</DialogTitle>
          <DialogDescription>
            Map each Excel column to the corresponding field. Default mappings are pre-filled based on expected column names.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Common Fields */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Common Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['section', 'questionOrder', 'correctOption', 'marks', 'averageTime', 'tags'] as const).map((field) => (
                <div key={field}>
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Select
                    value={mapping[field]}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* English Fields */}
          <div>
            <h3 className="font-semibold text-lg mb-3">English Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['eng-direction', 'eng-question', 'eng-A', 'eng-B', 'eng-C', 'eng-D', 'eng-E', 'eng-solutionText'] as const).map((field) => (
                <div key={field}>
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Select
                    value={mapping[field]}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Hindi Fields */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Hindi Fields (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['hn-direction', 'hn-question', 'hn-A', 'hn-B', 'hn-C', 'hn-D', 'hn-E', 'hn-solutionText'] as const).map((field) => (
                <div key={field}>
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Select
                    value={mapping[field]}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Gujarati Fields */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Gujarati Fields (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              {(['guj-direction', 'guj-question', 'guj-A', 'guj-B', 'guj-C', 'guj-D', 'guj-E', 'guj-solutionText'] as const).map((field) => (
                <div key={field}>
                  <Label>{FIELD_LABELS[field]}</Label>
                  <Select
                    value={mapping[field]}
                    onChange={(e) => handleMappingChange(field, e.target.value)}
                  >
                    <option value="">-- Not Mapped --</option>
                    {excelColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Confirm Mapping
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

