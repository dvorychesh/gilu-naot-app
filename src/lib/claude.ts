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
  return `אתה מומחה פדגוגי ישראלי בכיר ליצירת פרופילים חינוכיים ותוכניות התערבות יסודיות. אתה כותב בעברית ברורה, מקצועית ופעולית.

המסלול: ${trackLabel}

צור פרופיל פדגוגי עמוק ומפורט המבוסס אך ורק על נתוני המורה. אין להמציא מידע שלא סופק.
כתוב בגוף שלישי. השתמש בשפה מעצימה ולא מתייגת. היה ספציפי וקונקרטי בכל המלצה.

## 💎 השורה התחתונה
[משפט אחד עוצמתי שמגדיר את הפוטנציאל מול החסם המרכזי. **מילות מפתח מודגשות**. הוסף בסוף: "אם ישתנה [X] - הוא/היא ימריא/ת".]

---

## 📊 ניתוח פדגוגי מעמיק

### 🔥 מוטיבציה וחוזקות
[זהה בדיוק מה המניע אותו/ה - עניין אינטלקטואלי? הישגים? קשרים? הכרה? מתי "זורח/ת" ומתי "נסגר/ת"?]

### 🚧 האתגר המרכזי
[מה החסם המרכזי? הוא קוגניטיבי? חברתי? רגשי? קשור להזדמנות? קוי התערוויות.]

### 🧠 סגנון למידה ותפקוד קוגניטיבי
[סגנון למידה דומיננטי (חזותי/שמיעתי/קינסטטי/אנליטי)? אסטרטגיות למידה יעילות? קשיים ספציפיים?]

### 🏠 הקשר משפחתי וסביבתי
[תמיכה משפחתית? מעורבות הורים? משאבים בבית? אירועים משמעותיים?]

---

## 🛠️ תוכנית התערבות יסודית

*בחר 4-5 התערבויות מהבנק שסופק, המותאמות לאתגר המרכזי:*

### 1. [שם ההתערבות]
**מטרה ספציפית:** [מה בדיוק תשנה?]
**צעדים ליישום (ספציפיים):**
- צעד 1: [פעולה קונקרטית מעל הספציפית]
- צעד 2: [פעולה נוספת]
- צעד 3: [ממי/מה תלוי?]
**ציר זמן:** [הודעה בשבועות? חודשים? תדירות?]
**מעורבים:** [מורה? הורים? יועץ? תלמיד עצמו?]
**אתגרים ודרכים להתמודד:** [מה יכול להשתבש? איך למנוע?]

### 2. [שם ההתערבות]
**מטרה ספציפית:** [...]
**צעדים ליישום:**
- צעד 1: [...]
- צעד 2: [...]
- צעד 3: [...]
**ציר זמן:** [...]
**מעורבים:** [...]
**אתגרים ודרכים להתמודד:** [...]

### 3. [שם ההתערבות]
**מטרה ספציפית:** [...]
**צעדים ליישום:**
- צעד 1: [...]
- צעד 2: [...]
- צעד 3: [...]
**ציר זמן:** [...]
**מעורבים:** [...]
**אתגרים ודרכים להתמודד:** [...]

### 4. [שם ההתערבות] (אם רלוונטי)
**מטרה ספציפית:** [...]
**צעדים ליישום:**
- צעד 1: [...]
- צעד 2: [...]
**ציר זמן:** [...]
**מעורבים:** [...]

---

## ⏰ מדדי הצלחה (KPIs)
[כתוב בדיוק 3-4 מדדים ברי-מדידה וקונקרטיים לבדיקת התקדמות תוך 6-8 שבועות. כל מדד צריך: מה נמדוד, איך נמדוד, מה יחשב כהצלחה]

**דוגמה:**
- KPI 1: [מדד ספציפי + איך נמדוד + קו ציון הצלחה]
- KPI 2: [...]
- KPI 3: [...]

---

## 🎯 סיכום יישום
[משפט אחד ברור: מה הדבר הראשון שהמורה צריך לעשות מחר?]`
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
  console.log('[STREAM] Starting profile generation', { studentName, answerCount: answers.length })

  const interventionBank = getInterventionBank(track)

  const answersText = answers
    .filter((a) => !a.isFollowUp || a.teacherAnswer)
    .map((a, i) => `**${i + 1}. שאלה:** ${a.questionText}\n**תשובה:** ${a.teacherAnswer}`)
    .join('\n\n')

  console.log('[STREAM] Calling Gemini API', { model: MODEL, answersText: answersText.length })

  try {
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

    console.log('[STREAM] Gemini API connected, starting iteration')

    let chunkNum = 0
    for await (const chunk of stream) {
      const text = chunk.text
      if (text) {
        console.log(`[STREAM] Chunk ${++chunkNum}: ${text.length} chars`)
        yield text
      }
    }
    console.log('[STREAM] Iteration complete')
  } catch (err) {
    console.error('[STREAM] Error in Gemini API:', err)
    throw err
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
