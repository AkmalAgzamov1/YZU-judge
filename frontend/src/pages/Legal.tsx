import PageShell from "../components/PageShell";
import { useI18n, type Lang } from "../i18n";

interface LegalProps {
  kind: "privacy" | "terms";
}

interface Page {
  title: string;
  updated: string;
  sections: { heading: string; body: string }[];
}

// Whole pages rather than single lines, so each language is kept together here.
const content: Record<Lang, Record<LegalProps["kind"], Page>> = {
  en: {
    privacy: {
      title: "Privacy policy",
      updated: "November 10, 2026",
      sections: [
        {
          heading: "What we store",
          body: "Your username, your email address, a hashed version of your password, the code you submit and the verdicts it receives. Nothing else.",
        },
        {
          heading: "Why we store it",
          body: "To sign you in, to run and judge your code, and to show you your own submission history. Submitted code is executed in an isolated container and is not shared with other users.",
        },
        {
          heading: "Emails we send",
          body: "Only codes: one to confirm your email when you sign up, and one when you reset your password. They are delivered by our email provider, Resend, which receives your email address and the message for that purpose only. No newsletters, no marketing.",
        },
        {
          heading: "What we never do",
          body: "We do not sell your data, show ads or share your email with anyone beyond sending those codes. There are no third party trackers on this site.",
        },
        {
          heading: "Deleting your data",
          body: "Open an issue on the project GitHub page or contact the maintainer, and your account and submissions will be removed.",
        },
      ],
    },
    terms: {
      title: "Terms of use",
      updated: "October 31, 2026",
      sections: [
        {
          heading: "What this is",
          body: "YZU Judge is a practice site for the Collegiate Programming Exam, made by a student at Yuan Ze University. It is not affiliated with the CPE organizers.",
        },
        {
          heading: "Fair use",
          body: "Submit your own solutions. Do not try to break, overload or escape the judge, and do not upload code meant to harm the server or other users.",
        },
        {
          heading: "No guarantees",
          body: "The site is provided as is. Practicing here helps, but it does not guarantee a result on the real exam. Always confirm graduation requirements with your department.",
        },
      ],
    },
  },
  zh: {
    privacy: {
      title: "隱私權政策",
      updated: "2026 年 11 月 10 日",
      sections: [
        {
          heading: "我們保存哪些資料",
          body: "你的使用者名稱、電子郵件、經過雜湊處理的密碼、你提交的程式碼，以及評測結果。僅此而已。",
        },
        {
          heading: "為什麼保存",
          body: "用來讓你登入、執行並評測你的程式，以及顯示你自己的提交紀錄。提交的程式碼會在隔離的容器中執行，不會分享給其他使用者。",
        },
        {
          heading: "我們寄送的信件",
          body: "只有驗證碼：註冊時用來確認信箱的一封，以及重設密碼時的一封。信件由我們的郵件服務商 Resend 寄送，Resend 僅為此目的取得你的電子郵件與信件內容。沒有電子報，也沒有行銷信。",
        },
        {
          heading: "我們絕不會做的事",
          body: "我們不會販售你的資料、不會顯示廣告，除了寄送上述驗證碼之外，也不會把你的電子郵件提供給任何人。本站沒有第三方追蹤程式。",
        },
        {
          heading: "刪除你的資料",
          body: "在本專案的 GitHub 頁面開一個 issue，或直接聯絡維護者，我們就會移除你的帳號與提交紀錄。",
        },
      ],
    },
    terms: {
      title: "使用條款",
      updated: "2026 年 10 月 31 日",
      sections: [
        {
          heading: "這是什麼",
          body: "YZU Judge 是大學程式能力檢定（CPE）的練習網站，由元智大學的學生製作，與 CPE 主辦單位無關。",
        },
        {
          heading: "合理使用",
          body: "請提交你自己的解答。請勿嘗試破壞、癱瘓或逃脫評測系統，也不要上傳意圖危害伺服器或其他使用者的程式。",
        },
        {
          heading: "不提供保證",
          body: "本站依現況提供。在這裡練習會有幫助，但不保證正式考試的結果。畢業門檻請務必向系辦確認。",
        },
      ],
    },
  },
};

export default function Legal({ kind }: LegalProps) {
  const { lang, t } = useI18n();
  const page = content[lang][kind];

  return (
    <PageShell>
      <article className="px-4 pt-24 pb-24">
        <div className="mx-auto max-w-[680px] pt-16">
          <h1 className="text-hero text-4xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-3 text-sm text-neutral-500">{t("Last updated {date}", { date: page.updated })}</p>
          <div className="mt-12 flex flex-col gap-8">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-xl font-semibold text-white">{section.heading}</h2>
                <p className="mt-2 text-base text-neutral-400">{section.body}</p>
              </section>
            ))}
          </div>
        </div>
      </article>
    </PageShell>
  );
}
