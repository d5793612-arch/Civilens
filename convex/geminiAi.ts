'use node'

import { GoogleGenerativeAI } from '@google/generative-ai'

/** Vision + text; adjust if your project uses a different allowed model. */
const MODEL_ID = 'gemini-2.0-flash'

export type VisionJson = {
  issue: string
  category: string
  department: string
  severity: string
}

export type Bilingual = { complaint_en: string; complaint_hi: string }

export function getGeminiApiKey(): string | undefined {
  const k = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GEMINI_API_KEY
  return k?.trim() || undefined
}

function parseJsonObject<T>(raw: string): T | null {
  try {
    const j = JSON.parse(raw) as T
    return j && typeof j === 'object' ? j : null
  } catch {
    return null
  }
}

/** Strip optional ```json ... ``` wrapper from model output. */
function unwrapJsonFence(text: string): string {
  let t = text.trim()
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i)
  if (m) t = m[1].trim()
  return t
}

export async function runVisionGemini(
  apiKey: string,
  imageBase64: string,
  mimeHint = 'image/jpeg',
): Promise<VisionJson> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `You analyze civic infrastructure photos. Respond with JSON only (no markdown):
{"issue":"short factual description","category":"pothole|garbage|water|other","department":"ignore","severity":"low|medium|high"}
Category: pothole=road damage; garbage=waste/litter/dumping; water=leaks/flooding/pipes.`

  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType: mimeHint, data: imageBase64 } },
  ])

  const text = unwrapJsonFence(result.response.text())
  const parsed = parseJsonObject<VisionJson>(text)
  return (
    parsed ?? {
      issue: 'Reported civic issue from image',
      category: 'other',
      department: '',
      severity: 'medium',
    }
  )
}

export async function runBilingualGemini(
  apiKey: string,
  input: {
    location: string
    issue: string
    severity: string
    department: string
    routedDepartment: string
    exaContext: string
  },
): Promise<Bilingual> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `Generate a formal government grievance in two languages.
Return JSON only (no markdown): {"complaint_en":"...","complaint_hi":"..."}
Use respectful official tone. Include location, issue, severity, and routed authority (${input.routedDepartment}).
Hindi must be Devanagari script.

Context:
${JSON.stringify({
  location: input.location || 'Not specified',
  issue: input.issue,
  severity: input.severity,
  uiDepartment: input.department,
  routedDepartment: input.routedDepartment,
  referenceContext: input.exaContext || undefined,
})}`

  const result = await model.generateContent(prompt)
  const text = unwrapJsonFence(result.response.text())
  const parsed = parseJsonObject<Bilingual>(text)
  return (
    parsed ?? {
      complaint_en: `Complaint: ${input.issue}. Severity: ${input.severity}. Location: ${input.location || 'N/A'}.`,
      complaint_hi: `शिकायत: ${input.issue}. गंभीरता: ${input.severity}. स्थान: ${input.location || 'अज्ञात'}.`,
    }
  )
}
