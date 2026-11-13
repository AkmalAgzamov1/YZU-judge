import { useI18n } from "../i18n";
import { buttonGhostSmall } from "./ui";

// Shows the language you would switch to, in that language, so a student who
// cannot read the current one still finds it.
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const toChinese = lang === "en";

  return (
    <button
      type="button"
      lang={toChinese ? "zh-Hant-TW" : "en"}
      aria-label={toChinese ? "切換為中文" : "Switch to English"}
      onClick={() => setLang(toChinese ? "zh" : "en")}
      className={`${buttonGhostSmall} whitespace-nowrap ${className}`}
    >
      {toChinese ? "中文" : "EN"}
    </button>
  );
}
