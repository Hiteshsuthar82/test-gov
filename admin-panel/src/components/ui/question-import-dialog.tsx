import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './dialog'
import { Button } from './button'
import { Input } from './input'
import { Label } from './label'
import { Loader } from './loader'
import { CheckCircle2, XCircle, Upload, FileSpreadsheet } from 'lucide-react'
import { FieldMappingDialog } from './field-mapping-dialog'

interface QuestionImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setId: string
  onSuccess: () => void
}

interface PreviewQuestion {
  rowNumber: number
  data: {
    questionOrder: number
    section?: string
    sectionId?: string
    direction?: string
    questionText: string
    conclusion?: string
    optionA: string
    optionB: string
    optionC: string
    optionD: string
    optionE?: string
    rightOption: string
    marks: number
    averageTime?: number
    averageTimeSeconds?: number
    explanationText?: string
    options: Array<{ optionId: string; text: string }>
    correctOptionId: string
  }
  errors: string[]
  warnings: string[]
}

interface PreviewData {
  preview: PreviewQuestion[]
  totalRows: number
  validRows: number
  invalidRows: number
}

interface FieldMapping {
  section: string
  questionOrder: string
  correctOption: string
  marks: string
  averageTime: string
  tags: string
  'eng-direction': string
  'eng-question': string
  'eng-A': string
  'eng-B': string
  'eng-C': string
  'eng-D': string
  'eng-E': string
  'eng-solutionText': string
  'hn-direction': string
  'hn-question': string
  'hn-A': string
  'hn-B': string
  'hn-C': string
  'hn-D': string
  'hn-E': string
  'hn-solutionText': string
  'guj-direction': string
  'guj-question': string
  'guj-A': string
  'guj-B': string
  'guj-C': string
  'guj-D': string
  'guj-E': string
  'guj-solutionText': string
}

export function QuestionImportDialog({ open, onOpenChange, setId, onSuccess }: QuestionImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<Set<number>>(new Set())
  const [excelColumns, setExcelColumns] = useState<string[]>([])
  const [showMappingDialog, setShowMappingDialog] = useState(false)
  const [fieldMapping, setFieldMapping] = useState<FieldMapping | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const getColumnsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.post(`/admin/questions/sets/${setId}/questions/import/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    },
    onSuccess: (data) => {
      if (data.needsMapping && data.columns) {
        setExcelColumns(data.columns)
        setShowMappingDialog(true)
      } else {
        // Old format - direct preview
        setPreviewData(data as PreviewData)
        const validRows = (data as PreviewData).preview
          .filter((q) => q.errors.length === 0)
          .map((q) => q.rowNumber)
        setSelectedQuestions(new Set(validRows))
      }
    },
  })

  const previewMutation = useMutation({
    mutationFn: async ({ file, mapping }: { file: File; mapping: FieldMapping }) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('fieldMapping', JSON.stringify(mapping))
      const response = await api.post(`/admin/questions/sets/${setId}/questions/import/preview`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data as PreviewData
    },
    onSuccess: (data) => {
      setPreviewData(data)
      // Select all valid questions by default
      const validRows = data.preview
        .filter((q) => q.errors.length === 0)
        .map((q) => q.rowNumber)
      setSelectedQuestions(new Set(validRows))
    },
  })

  const importMutation = useMutation({
    mutationFn: async (questions: PreviewQuestion[]) => {
      // Prepare questions data (only selected ones) - using new structure
      const questionsToImport = questions.map((q) => ({
        rowNumber: q.rowNumber,
        sectionId: q.data.sectionId,
        eng: q.data.eng,
        hn: q.data.hn,
        guj: q.data.guj,
        engOptions: q.data.engOptions,
        hnOptions: q.data.hnOptions,
        gujOptions: q.data.gujOptions,
        correctOptionId: q.data.correctOptionId,
        marks: q.data.marks || 1,
        averageTimeSeconds: q.data.averageTimeSeconds || 0,
        tags: q.data.tags || [],
        questionOrder: q.data.questionOrder,
      }))

      const formData = new FormData()
      formData.append('questions', JSON.stringify(questionsToImport))

      const response = await api.post(`/admin/questions/sets/${setId}/questions/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      return response.data.data
    },
    onSuccess: () => {
      onSuccess()
      handleClose()
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreviewData(null)
      setSelectedQuestions(new Set())
    }
  }

  const handlePreview = () => {
    if (file) {
      getColumnsMutation.mutate(file)
    }
  }

  const handleMappingConfirm = (mapping: FieldMapping) => {
    setFieldMapping(mapping)
    setShowMappingDialog(false)
    if (file) {
      previewMutation.mutate({ file, mapping })
    }
  }

  const handleConfirm = () => {
    if (previewData) {
      const questionsToImport = previewData.preview.filter((q) =>
        selectedQuestions.has(q.rowNumber) && q.errors.length === 0
      )
      if (questionsToImport.length > 0) {
        importMutation.mutate(questionsToImport)
      }
    }
  }

  const handleClose = () => {
    setFile(null)
    setPreviewData(null)
    setSelectedQuestions(new Set())
    setExcelColumns([])
    setShowMappingDialog(false)
    setFieldMapping(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  const toggleQuestionSelection = (rowNumber: number) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber)
    } else {
      newSelected.add(rowNumber)
    }
    setSelectedQuestions(newSelected)
  }

  const toggleAllValid = () => {
    if (!previewData) return
    const validRows = previewData.preview
      .filter((q) => q.errors.length === 0)
      .map((q) => q.rowNumber)
    
    if (validRows.every((row) => selectedQuestions.has(row))) {
      // Deselect all
      setSelectedQuestions(new Set())
    } else {
      // Select all valid
      setSelectedQuestions(new Set(validRows))
    }
  }

  const selectedCount = previewData
    ? previewData.preview.filter((q) => selectedQuestions.has(q.rowNumber) && q.errors.length === 0).length
    : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Questions from Excel</DialogTitle>
          <DialogDescription>
            Upload an Excel file to import questions. The file should contain columns: Question Order, Section, Direction text, Question Text, Conclusion text, (A) Option, (B) Option, (C) Option, (D) Option, (E) Option, Right option, Marks, Average Time, Explanation Text, Explanation Images, Direction Image, Question Image, Conclusion Image
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* File Upload Section */}
          {!previewData && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="excel-file">Excel File</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="excel-file"
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button
                    onClick={handlePreview}
                    disabled={!file || getColumnsMutation.isPending || previewMutation.isPending}
                  >
                    {(getColumnsMutation.isPending || previewMutation.isPending) ? (
                      <>
                        <Loader inline className="mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Preview
                      </>
                    )}
                  </Button>
                </div>
                {file && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{file.name}</span>
                  </div>
                )}
              </div>

              {(getColumnsMutation.isError || previewMutation.isError) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {((getColumnsMutation.error || previewMutation.error) as any)?.response?.data?.message || 'Error processing Excel file'}
                </div>
              )}
            </div>
          )}

          {/* Preview Section */}
          {previewData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Total Rows:</span>
                    <span className="ml-2 font-semibold">{previewData.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Valid:</span>
                    <span className="ml-2 font-semibold text-green-600">{previewData.validRows}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Invalid:</span>
                    <span className="ml-2 font-semibold text-red-600">{previewData.invalidRows}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Selected:</span>
                    <span className="ml-2 font-semibold text-blue-600">{selectedCount}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={toggleAllValid}>
                  {previewData.preview.filter((q) => q.errors.length === 0).every((q) => selectedQuestions.has(q.rowNumber))
                    ? 'Deselect All'
                    : 'Select All Valid'}
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[500px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold w-12">
                          <input
                            type="checkbox"
                            checked={previewData.preview.filter((q) => q.errors.length === 0).every((q) => selectedQuestions.has(q.rowNumber)) && previewData.preview.filter((q) => q.errors.length === 0).length > 0}
                            onChange={toggleAllValid}
                            className="w-4 h-4"
                          />
                        </th>
                        <th className="px-4 py-2 text-left font-semibold w-16">Row</th>
                        <th className="px-4 py-2 text-left font-semibold w-20">Order</th>
                        <th className="px-4 py-2 text-left font-semibold w-32">Section</th>
                        <th className="px-4 py-2 text-left font-semibold">Question</th>
                        <th className="px-4 py-2 text-left font-semibold w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview.map((question) => {
                        const isValid = question.errors.length === 0
                        const isSelected = selectedQuestions.has(question.rowNumber)
                        return (
                          <tr
                            key={question.rowNumber}
                            className={`border-t hover:bg-gray-50 ${
                              !isValid ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="px-4 py-2">
                              {isValid && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleQuestionSelection(question.rowNumber)}
                                  className="w-4 h-4"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2">{question.rowNumber}</td>
                            <td className="px-4 py-2">{question.data.questionOrder}</td>
                            <td className="px-4 py-2">{question.data.section || '-'}</td>
                            <td className="px-4 py-2 max-w-md truncate">
                              {question.data.eng?.question || '-'}
                            </td>
                            <td className="px-4 py-2">
                              {isValid ? (
                                <div className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="text-xs">Valid</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-red-600">
                                  <XCircle className="w-4 h-4" />
                                  <span className="text-xs">Error</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Errors and Warnings */}
              <div className="space-y-2">
                {previewData.preview.map((question) => {
                  if (question.errors.length === 0 && question.warnings.length === 0) return null
                  return (
                    <div
                      key={question.rowNumber}
                      className={`p-3 rounded-md text-sm ${
                        question.errors.length > 0
                          ? 'bg-red-50 border border-red-200'
                          : 'bg-yellow-50 border border-yellow-200'
                      }`}
                    >
                      <div className="font-semibold mb-1">
                        Row {question.rowNumber}:
                      </div>
                      {question.errors.length > 0 && (
                        <div className="text-red-700">
                          <div className="font-semibold mb-1">Errors:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {question.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {question.warnings.length > 0 && (
                        <div className="text-yellow-700 mt-2">
                          <div className="font-semibold mb-1">Warnings:</div>
                          <ul className="list-disc list-inside space-y-1">
                            {question.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {importMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {(importMutation.error as any)?.response?.data?.message || 'Error importing questions'}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {previewData ? 'Cancel' : 'Close'}
          </Button>
          {previewData && (
            <Button
              onClick={handleConfirm}
              disabled={selectedCount === 0 || importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader inline className="mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm Import ({selectedCount} questions)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Field Mapping Dialog */}
      <FieldMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        excelColumns={excelColumns}
        onConfirm={handleMappingConfirm}
      />
    </Dialog>
  )
}

