/**
 * World languages offered for `original_language` on translated works.
 * literary_works.original_language is a free BCP-47 string column — it is NOT
 * restricted to the supported_languages table, which only lists languages the
 * site catalogues content in. Most Bengali SF translations come from these.
 */
export const WORLD_LANGUAGES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "ru", name: "Russian (Русский)" },
  { code: "fr", name: "French (Français)" },
  { code: "de", name: "German (Deutsch)" },
  { code: "ja", name: "Japanese (日本語)" },
  { code: "zh", name: "Chinese (中文)" },
  { code: "es", name: "Spanish (Español)" },
  { code: "it", name: "Italian (Italiano)" },
  { code: "pt", name: "Portuguese (Português)" },
  { code: "pl", name: "Polish (Polski)" },
  { code: "cs", name: "Czech (Čeština)" },
  { code: "hu", name: "Hungarian (Magyar)" },
  { code: "sv", name: "Swedish (Svenska)" },
  { code: "no", name: "Norwegian (Norsk)" },
  { code: "da", name: "Danish (Dansk)" },
  { code: "nl", name: "Dutch (Nederlands)" },
  { code: "fi", name: "Finnish (Suomi)" },
  { code: "el", name: "Greek (Ελληνικά)" },
  { code: "uk", name: "Ukrainian (Українська)" },
  { code: "tr", name: "Turkish (Türkçe)" },
  { code: "ar", name: "Arabic (العربية)" },
  { code: "fa", name: "Persian (فارسی)" },
  { code: "he", name: "Hebrew (עברית)" },
  { code: "ko", name: "Korean (한국어)" },
  { code: "sa", name: "Sanskrit (संस्कृतम्)" },
];
