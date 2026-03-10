export interface StudentRow {
  studentName: string
  grade?: string
  track: 'ELEMENTARY' | 'HIGH_SCHOOL'
}

export interface ParseResult {
  valid: StudentRow[]
  errors: Array<{ row: number; error: string }>
}

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) {
    return { valid: [], errors: [{ row: 0, error: 'CSV must have at least header + 1 data row' }] }
  }

  const headerLine = lines[0]
  const headers = headerLine.split(',').map((h) => h.trim())

  // Find headers with flexible matching (ignore gender markers and extra whitespace)
  const studentNameIdx = headers.findIndex((h) => h.startsWith('שם התלמיד'))
  const gradeIdx = headers.findIndex((h) => h === 'כיתה')
  const trackIdx = headers.findIndex((h) => h === 'מסלול')

  if (studentNameIdx === -1) {
    return {
      valid: [],
      errors: [{ row: 0, error: 'Missing required column: "שם התלמיד"' }],
    }
  }

  // If no track column, default to ELEMENTARY
  const hasTrack = trackIdx !== -1

  const valid: StudentRow[] = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cells = line.split(',').map((c) => c.trim())

    const studentName = cells[studentNameIdx]
    const grade = gradeIdx !== -1 ? cells[gradeIdx] : undefined
    const trackRaw = hasTrack ? cells[trackIdx]?.toLowerCase() : 'יסודי'

    if (!studentName) {
      errors.push({ row: i + 1, error: 'Student name cannot be empty' })
      continue
    }

    let track: 'ELEMENTARY' | 'HIGH_SCHOOL' = 'ELEMENTARY' // Default to ELEMENTARY

    if (hasTrack && trackRaw) {
      if (trackRaw === 'יסודי') {
        track = 'ELEMENTARY'
      } else if (trackRaw === 'על-יסודי' || trackRaw === 'על יסודי') {
        track = 'HIGH_SCHOOL'
      } else {
        errors.push({ row: i + 1, error: `Invalid track: "${trackRaw}". Use "יסודי" or "על-יסודי"` })
        continue
      }
    }

    valid.push({
      studentName,
      grade: grade || undefined,
      track,
    })
  }

  return { valid, errors }
}
