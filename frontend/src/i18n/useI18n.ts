import { useContext } from "react";
import { I18nContext, type I18n } from "./context";

// Reading the context is also what re-renders a component when the language changes.
export function useI18n(): I18n {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }

  return context;
}
