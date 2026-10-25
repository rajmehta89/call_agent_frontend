export type LeadLanguage = 'en' | 'ar' | 'ur'

export const LEAD_LANGUAGES: Array<{ code: LeadLanguage; label: string; nativeLabel: string; locale: string }> = [
  { code: 'en', label: 'English', nativeLabel: 'English', locale: 'en-US' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', locale: 'ar-SA' },
  { code: 'ur', label: 'Urdu', nativeLabel: 'اردو', locale: 'ur-PK' },
]

export const leadLanguageLabel = (code?: string) => LEAD_LANGUAGES.find((item) => item.code === code)?.label || 'English'
