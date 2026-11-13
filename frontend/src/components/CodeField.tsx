import { useI18n } from "../i18n";
import Field from "./Field";

interface CodeFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

// The 6 digit code from the email. one-time-code lets phones offer it from the notification.
export default function CodeField({ value, onChange, error }: CodeFieldProps) {
  const { t } = useI18n();

  return (
    <Field
      id="code"
      label={t("6-digit code")}
      inputMode="numeric"
      autoComplete="one-time-code"
      autoFocus
      maxLength={7}
      placeholder="123456"
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/[^\d ]/g, ""))}
      error={error}
    />
  );
}
