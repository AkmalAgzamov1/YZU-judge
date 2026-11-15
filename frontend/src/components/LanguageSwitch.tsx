import { useI18n, type Lang } from "../i18n";

// Offered as words in each language, never flags, so a student who cannot read the
// current language still recognizes their own. Adding a language is one line here.
const OPTIONS: { code: Lang; label: string; htmlLang: string }[] = [
  { code: "en", label: "EN", htmlLang: "en" },
  { code: "zh", label: "中文", htmlLang: "zh-Hant-TW" },
  { code: "vi", label: "Tiếng Việt", htmlLang: "vi" },
  { code: "ru", label: "Русский", htmlLang: "ru" },
  { code: "id", label: "Bahasa Indonesia", htmlLang: "id" },
];

export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <div role="group" aria-label={t("Language")} className={`flex flex-wrap items-center gap-1 ${className}`}>
      {OPTIONS.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.htmlLang}
          aria-current={lang === option.code ? "true" : undefined}
          onClick={() => setLang(option.code)}
          className={`whitespace-nowrap rounded px-2 py-1 text-sm font-medium transition duration-300 ease-soft ${
            lang === option.code ? "text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
