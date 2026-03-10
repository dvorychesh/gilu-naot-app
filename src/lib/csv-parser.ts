export interface StudentRow {
  studentName: string
  grade?: string
  track: 'ELEMENTARY' | 'HIGH_SCHOOL'
  answers?: Record<number, string> // Answers to interview questions (indices 1-9)
}

export interface ParseResult {
  valid: StudentRow[]
  errors: Array<{ row: number; error: string }>
}

/**
 * RFC 4180 CSV Parser - handles quoted fields with newlines and commas
 */
function parseCSV_RFC4180(csvText: string): string[][] {
  const result: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < csvText.length) {
    const char = csvText[i]
    const nextChar = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        field += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      row.push(field.trim())
      field = ''
      i++
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (field || row.length > 0) {
        row.push(field.trim())
        if (row.some((f) => f)) {
          // Only add non-empty rows
          result.push(row)
        }
        row = []
        field = ''
      }
      i++
      // Skip \r\n as one line ending
      if (char === '\r' && nextChar === '\n') {
        i++
      }
    } else {
      field += char
      i++
    }
  }

  // Add last field and row if exists
  if (field || row.length > 0) {
    row.push(field.trim())
    if (row.some((f) => f)) {
      result.push(row)
    }
  }

  return result
}

export function parseCSV(csvText: string): ParseResult {
  try {
    const rows = parseCSV_RFC4180(csvText)

    if (rows.length < 2) {
      return { valid: [], errors: [{ row: 0, error: 'CSV must have at least header + 1 data row' }] }
    }

    const headers = rows[0]

    // Find headers with flexible matching
    const studentNameIdx = headers.findIndex((h) => h.includes('שם התלמיד'))
    const gradeIdx = headers.findIndex((h) => h.includes('כיתה'))

    if (studentNameIdx === -1) {
      return {
        valid: [],
        errors: [{ row: 0, error: `Missing required column: "שם התלמיד". Found: ${headers.slice(0, 5).join(', ')}...` }],
      }
    }

    // Find question column indices by keywords
    const questionKeywords = [
      'חוזקות', // 1
      'קוגניטיבי', // 2
      'שפה', // 3
      'חברתי', // 4
      'תלמידאות', // 5
      'אחריות', // 6
      'מוטיבציה', // 7
      'רקע', // 8
      'הערות', // 9
    ]

    const questionIndices: Record<number, number> = {}
    questionKeywords.forEach((keyword, idx) => {
      const colIdx = headers.findIndex((h) => h.includes(keyword))
      if (colIdx !== -1) {
        questionIndices[idx + 1] = colIdx
      }
    })

    const valid: StudentRow[] = []
    const errors: Array<{ row: number; error: string }> = []

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
      const studentName = cells[studentNameIdx]?.trim()

      if (!studentName) {
        errors.push({ row: i + 1, error: 'Student name cannot be empty' })
        continue
      }

      const grade = gradeIdx !== -1 ? cells[gradeIdx]?.trim() : undefined
      // Always use ELEMENTARY - track selection removed for simplicity
      const track: 'ELEMENTARY' | 'HIGH_SCHOOL' = 'ELEMENTARY'

      // Extract answers if any question columns are present
      const answers: Record<number, string> = {}
      Object.entries(questionIndices).forEach(([qIdx, colIdx]) => {
        const answer = cells[colIdx]?.trim()
        if (answer) {
          answers[parseInt(qIdx)] = answer
        }
      })

      valid.push({
        studentName,
        grade: grade || undefined,
        track,
        ...(Object.keys(answers).length > 0 && { answers }),
      })
    }

    return { valid, errors }
  } catch (err) {
    return {
      valid: [],
      errors: [{ row: 0, error: `CSV parsing failed: ${err instanceof Error ? err.message : String(err)}` }],
    }
  }
}
