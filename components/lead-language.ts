export type LeadLanguage = 'en' | 'ar' | 'ur'

/** understands: other speech the language's calls cover (Hindi and Hinglish callers are answered on the Urdu line). */
export const LEAD_LANGUAGES: Array<{ code: LeadLanguage; label: string; nativeLabel: string; locale: string; understands: string[] }> = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US', understands: [] },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', locale: 'ar-SA', understands: [] },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', locale: 'ur-PK', understands: ['Hindi', 'Hinglish'] },
]

export const leadLanguageLabel = (code?: string) => LEAD_LANGUAGES.find((item) => item.code === code)?.label || 'English'
