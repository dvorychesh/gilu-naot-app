import Anthropic from '@anthropic-ai/sdk'
import { getInterventionBank, SchoolTrack } from './interventions'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// ── INTERVIEWER BOT (Quality Check) ─────────────────────────────

const INTERVIEWER_SYSTEM_PROMPT = `אתה מסייע למורה לבצע ראיון פדגוגי על תלמיד. תפקידך לבדוק האם תשובת המורה מספקת מבחינה פדגוגית.

כללים:
- תשובה עוברת (PASS) אם היא: ספציפית, מכילה לפחות 2 פרטים קונקרטיים, ואינה גנרית
- תשובה נכשלת (FAIL) אם היא: קצרה מדי (פחות מ-2 משפטים), גנרית ("הוא בסדר", "לא יודעת"), או לא רלוונטית לשאלה
- אם זו שאלת המשך — תמיד תעביר PASS

הגב אך ורק ב-JSON תקני בפורמט הבא:
{"passed": true, "followUpQuestion": null}
או:
{"passed": false, "followUpQuestion": "שאלת המשך קצרה וממוקדת בעברית"}

אם passed=true, followUpQuestion חייב להיות null.
אם passed=false, כתוב שאלת המשך שתוציא פרטים ספציפיים נוספים הקשורים לתשובה שניתנה.`

export async function runQualityCheck({
  questionText,
  answer,
  isFollowUp,
}: {
  questionText: string
  answer: string
  isFollowUp: boolean
}): Promise<{ passed: boolean; followUpQuestion?: string }> {
  // Follow-up answers always pass
  if (isFollowUp) return { passed: true }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: INTERVIEWER_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `שאלה: ${questionText}\n\nתשובת המורה: ${answer}`,
        },
      ],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const parsed = JSON.parse(raw)
    return {
      passed: parsed.passed === true,
      followUpQuestion: parsed.followUpQuestion ?? undefined,
    }
  } catch {
    // On any error, default to pass — don't block the teacher
    return { passed: true }
  }
}

// ── ANALYZER BOT (Profile Generator) ────────────────────────────

function buildAnalyzerSystemPrompt(track: SchoolTrack): string {
  const trackLabel = track === 'ELEMENTARY' ? 'יסודי' : 'על-יסודי'
  return `אתה מומחה פדגוגי ישראלי בכיר ליצירת פרופילים חינוכיים. אתה כותב בעברית ברורה ומקצועית בסגנון של יועץ/ת חינוכי/ת מנוסה.

המסלול: ${trackLabel}

צור פרופיל פדגוגי מקיף ומועיל המבוסס אך ורק על נתוני המורה. אין להמציא מידע שלא סופק.
כתוב בגוף שלישי. השתמש בשפה מעצימה ולא מתייגת.

המבנה הנדרש (בדיוק כך, כולל אמוג'ים וכותרות):

## 💎 השורה התחתונה
[משפט אחד בודד שמגדיר את הפוטנציאל מול החסם המרכזי. **מילות מפתח מודגשות**.]

---

## 📊 ניתוח פדגוגי

### 🔥 מוטיבציה וחוזקות
[ניתוח מה מניע את התלמיד/ה וחוזקות שניתן לבנות עליהן]

### 🚧 האתגר המרכזי
[ניתוח שורש הקושי — לא תיאור, אלא הבנה עמוקה של המנגנון]

### 🧠 סגנון למידה ותפקוד קוגניטיבי
[כיצד לומד/ת, מה עוזר ומה מקשה]

### 🏠 הקשר משפחתי וסביבתי
[תובנה קצרה על ההשפעה המשפחתית]

---

## 🛠️ תוכנית פעולה

*בחר בדיוק 3 התערבויות מהבנק שסופק. לכל התערבות:*

### 1. [שם ההתערבות מהבנק]
**כיצד ליישם:** [הסבר ספציפי לתלמיד/ה הזה/ה — 2-3 משפטים קונקרטיים]
**ציר זמן:** [שבוע/חודש/רבעון]

### 2. [שם ההתערבות מהבנק]
**כיצד ליישם:** [הסבר ספציפי]
**ציר זמן:** [...]

### 3. [שם ההתערבות מהבנק]
**כיצד ליישם:** [הסבר ספציפי]
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

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: buildAnalyzerSystemPrompt(track),
    messages: [
      {
        role: 'user',
        content: `שם התלמיד/ה: ${studentName}

תשובות המורה/ת:
${answersText}

---

${interventionBank}`,
      },
    ],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}

// ── CLASS PROFILE GENERATOR ──────────────────────────────────────

const CLASS_PROFILE_SYSTEM_PROMPT = `אתה מומחה פדגוגי ישראלי בכיר לניתוח כיתות. כתוב בעברית מקצועית ומעצימה.
שיטת ניתוח: אגרגציה — מגמות, דפוסים, אחוזים — לא סיכום תלמיד-תלמיד.

המבנה הנדרש:

## 🏫 תמונה כללית — ה"Vibe" של הכיתה
[תיאור כולל של אקלים הכיתה]

---

## 💪 חוזקות ועוגנים כיתתיים
[מה עובד טוב, על מה ניתן לבנות]

## 🚧 חסמים ואתגרים מרכזיים
[הקשיים הבולטים ברמה הכיתתית]

## 🤝 מצב חברתי (Dynamics)
[דינמיקות חברתיות, קבוצות, מנהיגות]

## 📚 מצב לימודי (Academics)
[רמה אקדמית כללית, פערים, נקודות חוזק]

## ❤️ מצב רגשי (Emotional Climate)
[אקלים רגשי, ביטחון, שיתוף פעולה]

---

## 🛠️ תוכנית התערבות כיתתית

*3 התערבויות מרכזיות מוכרות מחקרית לכיתה כולה:*

### 1. [שם ההתערבות]
**מטרה:** [...]
**יישום:** [...]

### 2. [שם ההתערבות]
**מטרה:** [...]
**יישום:** [...]

### 3. [שם ההתערבות]
**מטרה:** [...]
**יישום:** [...]`

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

  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: CLASS_PROFILE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `כיתה: ${className} (${trackLabel})

תיאור המורה/ת את הכיתה:
${description}

---

בנק התערבויות:
${interventionBank}`,
      },
    ],
  })

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text
    }
  }
}
