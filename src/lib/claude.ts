import { GoogleGenAI } from '@google/genai'
import { getInterventionBank, SchoolTrack } from './interventions'

function getAI() { return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! }) }
const MODEL: string = 'gemini-2.0-flash'

// ── INTERVIEWER BOT (Quality Check) ─────────────────────────────

const INTERVIEWER_SYSTEM_PROMPT = `אתה מסייע למורה לבצע ראיון פדגוגי על תלמיד. תפקידך לבדוק האם תשובת המורה מספקת מבחינה פדגוגית.

כללים:
- תשובה עוברת (PASS) אם היא: ספציפית, מכילה לפחות 2 פרטים קונקרטיים, ואינה גנרית
- תשובה נכשלת (FAIL) אם היא: קצרה מדי (פחות מ-2 משפטים), גנרית ("הוא בסדר", "לא יודעת"), או לא רלוונטית לשאלה
- אם זו שאלת המשך - תמיד תעביר PASS

הגב אך ורק ב-JSON תקני:
{"passed": true, "followUpQuestion": null}
או:
{"passed": false, "followUpQuestion": "שאלת המשך בעברית"}`

export async function runQualityCheck({
  questionText,
  answer,
  isFollowUp,
}: {
  questionText: string
  answer: string
  isFollowUp: boolean
}): Promise<{ passed: boolean; followUpQuestion?: string }> {
  if (isFollowUp) return { passed: true }

  try {
    const response = await getAI().models.generateContent({
      model: MODEL,
      config: { systemInstruction: INTERVIEWER_SYSTEM_PROMPT, maxOutputTokens: 256 },
      contents: [{ role: 'user', parts: [{ text: `שאלה: ${questionText}\n\nתשובת המורה: ${answer}` }] }],
    })

    const raw = response.text?.trim() ?? ''
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/, '').trim()
    const parsed = JSON.parse(jsonStr)
    return {
      passed: parsed.passed === true,
      followUpQuestion: parsed.followUpQuestion ?? undefined,
    }
  } catch {
    return { passed: true }
  }
}

// ── ANALYZER BOT (Profile Generator) ────────────────────────────

function buildAnalyzerSystemPrompt(track: SchoolTrack): string {
  const trackLabel = track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'
  return `אתה מומחה פדגוגי ישראלי בכיר ליצירת פרופילים חינוכיים. אתה כותב בעברית ברורה ומקצועית.

המסלול: ${trackLabel}

צור פרופיל פדגוגי מקיף המבוסס אך ורק על נתוני המורה. אין להמציא מידע שלא סופק.
כתוב בגוף שלישי. השתמש בשפה מעצימה ולא מתייגת.

## 💎 השורה התחתונה
[משפט אחד שמגדיר את הפוטנציאל מול החסם המרכזי. **מילות מפתח מודגשות**.]

---

## 📊 ניתוח פדגוגי

### 🔥 מוטיבציה וחוזקות
### 🚧 האתגר המרכזי
### 🧠 סגנון למידה ותפקוד קוגניטיבי
### 🏠 הקשר משפחתי וסביבתי

---

## 🛠️ תוכנית פעולה

*בחר בדיוק 3 התערבויות מהבנק שסופק:*

### 1. [שם ההתערבות]
**כיצד ליישם:** [2-3 משפטים ספציפיים]
**ציר זמן:** [...]

### 2. [שם ההתערבות]
**כיצד ליישם:** [...]
**ציר זמן:** [...]

### 3. [שם ההתערבות]
**כיצד ליישם:** [...]
**ציר זמן:** [...]

---

## ⏰ מדדי הצלחה (KPIs)
[3 מדדים ברי-מדידה לבדיקת ההתקדמות תוך 6-8 שבועות]`
}

export async function* streamProfileGeneration({
  answers,
  studentName,
  track,
}: {
  answers: Array<{ questionText: string; teacherAnswer: string; isFollowUp: boolean }>
  studentName: string
  track: SchoolTrack
}): AsyncGenerator<string> {
  const interventionBank = getInterventionBank(track)

  const answersText = answers
    .filter((a) => !a.isFollowUp || a.teacherAnswer)
    .map((a, i) => `**${i + 1}. שאלה:** ${a.questionText}\n**תשובה:** ${a.teacherAnswer}`)
    .join('\n\n')

  const stream = await getAI().models.generateContentStream({
    model: MODEL,
    config: { systemInstruction: buildAnalyzerSystemPrompt(track), maxOutputTokens: 2048 },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `שם התלמיד/ה: ${studentName}\n\nתשובות המורה/ת:\n${answersText}\n\n---\n\n${interventionBank}`,
          },
        ],
      },
    ],
  })

  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}

// ── CLASS PROFILE GENERATOR ──────────────────────────────────────

const CLASS_PROFILE_SYSTEM_PROMPT = `אתה מומחה פדגוגי ישראלי בכיר לניתוח כיתות. כתוב בעברית מקצועית ומעצימה.
שיטת ניתוח: אגרגציה - מגמות, דפוסים, אחוזים - לא סיכום תלמיד-תלמיד.

## 🏫 תמונה כללית
## 💪 חוזקות ועוגנים כיתתיים
## 🚧 חסמים ואתגרים מרכזיים
## 🤝 מצב חברתי
## 📚 מצב לימודי
## ❤️ מצב רגשי

---

## 🛠️ תוכנית התערבות כיתתית
*3 התערבויות מרכזיות:*

### 1. [שם] **מטרה:** [...] **יישום:** [...]
### 2. [שם] **מטרה:** [...] **יישום:** [...]
### 3. [שם] **מטרה:** [...] **יישום:** [...]`

export async function* streamClassProfile({
  className,
  track,
  description,
}: {
  className: string
  track: SchoolTrack
  description: string
}): AsyncGenerator<string> {
  const interventionBank = getInterventionBank(track)
  const trackLabel = track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'

  const stream = await getAI().models.generateContentStream({
    model: MODEL,
    config: { systemInstruction: CLASS_PROFILE_SYSTEM_PROMPT, maxOutputTokens: 2048 },
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `כיתה: ${className} (${trackLabel})\n\nתיאור:\n${description}\n\n---\n\nבנק התערבויות:\n${interventionBank}`,
          },
        ],
      },
    ],
  })

  for await (const chunk of stream) {
    const text = chunk.text
    if (text) yield text
  }
}
