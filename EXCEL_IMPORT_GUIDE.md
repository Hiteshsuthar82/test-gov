# Excel Import Guide for Questions

## Overview
The Excel import feature allows you to bulk import questions into a test set. This guide explains the required format and how to use the feature.

## Excel File Format

### Required Columns

The Excel file must have the following columns (column names are case-insensitive):

1. **Question Order** (Required) - The order number of the question (must be a positive integer)
2. **Section** (Required if test set has sections) - The name of the section (must match exactly with section names in the test set)
3. **Question Text** (Required) - The main question text
4. **(A) Option** (Required) - Option A text
5. **(B) Option** (Required) - Option B text
6. **(C) Option** (Required) - Option C text
7. **(D) Option** (Required) - Option D text
8. **Right option** (Required) - The correct answer (A, B, C, D, or E)

### Optional Columns

9. **Direction text** - Text that appears before the question
10. **Conclusion text** - Text that appears after the question
11. **(E) Option** - Option E text (optional, only needed if Right option is E)
12. **Marks** - Points for this question (default: 1)
13. **Average Time** - Average time in seconds to solve (default: 0)
14. **Explanation Text** - Explanation for the answer
15. **Direction Image** - Image for direction (URL or base64 data URI)
16. **Question Image** - Image for question (URL or base64 data URI)
17. **Conclusion Image** - Image for conclusion (URL or base64 data URI)
18. **Explanation Images** - Multiple explanation images (comma-separated URLs or base64 data URIs)

## Image Handling

Images can be provided in three ways:

1. **URL**: Provide a direct URL to the image (e.g., `https://example.com/image.png`)
2. **Base64 Data URI**: Provide base64 encoded image (e.g., `data:image/png;base64,iVBORw0KGgo...`)
3. **Empty**: Leave the cell empty if no image is needed

**Note**: Currently, embedded images in Excel cells are not directly supported. Use URLs or base64 data URIs instead.

## Usage Steps

1. **Prepare Excel File**: Create an Excel file with the required columns and data
2. **Go to Questions Page**: Navigate to the test set's questions page
3. **Click Import Excel**: Click the "Import Excel" button
4. **Upload File**: Select your Excel file and click "Preview"
5. **Review Preview**: Check the preview table for validation errors
6. **Select Questions**: Select which valid questions to import (all valid questions are selected by default)
7. **Confirm Import**: Click "Confirm Import" to create the questions

## Validation

The system validates:
- Required fields are present
- Question Order is a valid positive number
- Section name matches existing sections (if test set has sections)
- All required options (A-D) are provided
- Right option is valid (A-E) and matches provided options
- Marks and Average Time are valid numbers

## Sample File

A sample Excel file (`sample_questions_sbi_po.xlsx`) with 10 SBI PO questions is provided in the project root for reference.

## Error Handling

- **Validation Errors**: Questions with validation errors will be marked in red and cannot be imported
- **Warnings**: Questions with warnings (e.g., invalid marks defaulting to 1) will be shown but can still be imported
- **Import Errors**: If some questions fail during import, the system will show which ones failed and why

## Tips

1. Make sure section names match exactly (case-sensitive matching is done after lowercasing)
2. Use consistent formatting for dates and numbers
3. For images, prefer URLs over base64 for better performance
4. Test with a small file first before importing large batches
5. Review the preview carefully before confirming import

