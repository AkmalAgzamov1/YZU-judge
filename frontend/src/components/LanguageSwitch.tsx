import { useI18n, type Lang } from "../i18n";
import LanguageSelect from "./LanguageSelect";

// The languages a student can switch the interface to. Offered as words in each
// language, never flags, so a student who cannot read the current language still
// recognizes their own. Adding a language is one line here and one dictionary file.
const OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "zh", label: "中文" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "ru", label: "Русский" },
  { code: "id", label: "Bahasa Indonesia" },
];

// A dropdown picker, not a row of buttons: the chosen language sits on the trigger and the
// rest open in a popup list, so the bar stays tidy as more languages are added.
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();

  return (
    <LanguageSelect
      value={lang}
      onChange={(id) => setLang(id as Lang)}
      options={OPTIONS.map((option) => ({ id: option.code, label: option.label }))}
      label={t("Language")}
      className={`shrink-0 ${className}`}
    />
  );
}
