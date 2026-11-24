import { Globe } from "@phosphor-icons/react";
import { useI18n, type Lang } from "../i18n";
import LanguageSelect from "./LanguageSelect";

// The languages a student can switch the interface to. Offered as words in each
// language, never flags, so a student who cannot read the current language still
// recognizes their own. Adding a language is one line here and one dictionary file.
const OPTIONS: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "zh", label: "中文", short: "中文" },
  { code: "vi", label: "Tiếng Việt", short: "VI" },
  { code: "ru", label: "Русский", short: "RU" },
  { code: "id", label: "Bahasa Indonesia", short: "ID" },
];

interface LanguageSwitchProps {
  className?: string;
  // The nav bar's globe button; the full width field is for menus and the account page.
  compact?: boolean;
}

export default function LanguageSwitch({ className = "", compact = false }: LanguageSwitchProps) {
  const { lang, setLang, t } = useI18n();

  return (
    <LanguageSelect
      value={lang}
      onChange={(id) => setLang(id as Lang)}
      options={OPTIONS.map((option) => ({ id: option.code, label: option.label, short: option.short }))}
      label={t("Site language")}
      compact={compact}
      icon={<Globe size={18} aria-hidden="true" />}
      align={compact ? "right" : "left"}
      className={`shrink-0 ${className}`}
    />
  );
}
