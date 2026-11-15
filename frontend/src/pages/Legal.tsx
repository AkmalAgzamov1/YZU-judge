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
  vi: {
    privacy: {
      title: "Chính sách bảo mật",
      updated: "Ngày 10 tháng 11 năm 2026",
      sections: [
        {
          heading: "Chúng tôi lưu những gì",
          body: "Tên đăng nhập, địa chỉ email, một bản băm của mật khẩu, code bạn nộp và các kết quả chấm nó nhận được. Không có gì khác.",
        },
        {
          heading: "Vì sao chúng tôi lưu",
          body: "Để đăng nhập cho bạn, để chạy và chấm code của bạn, và để cho bạn xem lịch sử nộp của chính mình. Code đã nộp được chạy trong một container tách biệt và không được chia sẻ với người dùng khác.",
        },
        {
          heading: "Những email chúng tôi gửi",
          body: "Chỉ có mã: một mã để xác nhận email khi bạn đăng ký, và một mã khi bạn đặt lại mật khẩu. Chúng được gửi bởi nhà cung cấp email của chúng tôi, Resend, nơi nhận địa chỉ email và nội dung tin nhắn của bạn chỉ cho mục đích đó. Không có bản tin, không có tiếp thị.",
        },
        {
          heading: "Những điều chúng tôi không bao giờ làm",
          body: "Chúng tôi không bán dữ liệu của bạn, không hiển thị quảng cáo, và không chia sẻ email của bạn với bất kỳ ai ngoài việc gửi các mã đó. Không có công cụ theo dõi của bên thứ ba trên trang này.",
        },
        {
          heading: "Xóa dữ liệu của bạn",
          body: "Hãy mở một issue trên trang GitHub của dự án hoặc liên hệ người bảo trì, tài khoản và các lần nộp của bạn sẽ bị xóa.",
        },
      ],
    },
    terms: {
      title: "Điều khoản sử dụng",
      updated: "Ngày 31 tháng 10 năm 2026",
      sections: [
        {
          heading: "Đây là gì",
          body: "YZU Judge là một trang luyện tập cho Kỳ thi Lập trình Đại học, do một sinh viên Đại học Yuan Ze làm ra. Trang không liên kết với ban tổ chức CPE.",
        },
        {
          heading: "Sử dụng công bằng",
          body: "Hãy nộp lời giải của chính bạn. Đừng cố phá, làm quá tải hay thoát khỏi hệ thống chấm, và đừng upload code nhằm gây hại cho máy chủ hay cho người dùng khác.",
        },
        {
          heading: "Không có bảo đảm",
          body: "Trang được cung nguyên trạng. Luyện ở đây giúp ích, nhưng không bảo đảm kết quả trong kỳ thi thật. Luôn xác nhận yêu cầu tốt nghiệp với khoa của bạn.",
        },
      ],
    },
  },
  ru: {
    privacy: {
      title: "Политика конфиденциальности",
      updated: "10 ноября 2026",
      sections: [
        {
          heading: "Что мы храним",
          body: "Твой логин, адрес email, хеш пароля, отправленный код и полученные вердикты. Ничего больше.",
        },
        {
          heading: "Зачем мы это храним",
          body: "Чтобы впускать тебя, запускать и проверять твой код и показывать историю твоих посылок. Отправленный код выполняется в изолированном контейнере и не передаётся другим пользователям.",
        },
        {
          heading: "Письма, которые мы отправляем",
          body: "Только коды: один для подтверждения email при регистрации и один при сбросе пароля. Их отправляет наш почтовый провайдер Resend, который получает email-адрес и содержание письма только для этого. Никаких рассылок и маркетинга.",
        },
        {
          heading: "Чего мы никогда не делаем",
          body: "Мы не продаём твои данные, не показываем рекламу и не делимся твоим email ни с кем, кроме отправки этих кодов. На сайте нет сторонних трекеров.",
        },
        {
          heading: "Удаление твоих данных",
          body: "Открой issue на GitHub-странице проекта или свяжись с сопровождающим — твой аккаунт и посылки будут удалены.",
        },
      ],
    },
    terms: {
      title: "Условия использования",
      updated: "31 октября 2026",
      sections: [
        {
          heading: "Что это",
          body: "YZU Judge — это сайт тренировки к Коллегиальному экзамену по программированию, созданный студентом университета Юань-Цзе. Он не связан с организаторами CPE.",
        },
        {
          heading: "Честное использование",
          body: "Отправляй собственные решения. Не пытайся сломать, перегрузить или обойти систему judge и не загружай код, предназначенный навредить серверу или другим пользователям.",
        },
        {
          heading: "Без гарантий",
          body: "Сайт предоставляется как есть. Тренировка здесь помогает, но не гарантирует результат на настоящем экзамене. Всегда уточняй требования к выпуску у своей кафедры.",
        },
      ],
    },
  },
  id: {
    privacy: {
      title: "Kebijakan privasi",
      updated: "10 November 2026",
      sections: [
        {
          heading: "Apa yang kami simpan",
          body: "Nama pengguna, alamat email, versi ter-hash kata sandimu, kode yang kamu kirim, dan verdict yang diperolehnya. Tidak ada yang lain.",
        },
        {
          heading: "Kenapa kami menyimpannya",
          body: "Untuk memasukanmu, menjalankan dan menilai kodemu, dan menampilkan riwayat kirimanmu sendiri. Kode terkirim dijalankan dalam kontainer terisolasi dan tidak dibagikan ke pengguna lain.",
        },
        {
          heading: "Email yang kami kirim",
          body: "Hanya kode: satu untuk mengonfirmasi email saat kamu mendaftar, dan satu saat menyetel ulang kata sandi. Dikirim oleh penyedia email kami, Resend, yang menerima alamat email dan isi pesanmu hanya untuk tujuan itu. Tidak ada buletin, tidak ada pemasaran.",
        },
        {
          heading: "Yang tidak pernah kami lakukan",
          body: "Kami tidak menjual datamu, tidak menampilkan iklan, dan tidak membagikan emailmu kepada siapa pun selain mengirim kode-kode itu. Tidak ada pelacak pihak ketiga di situs ini.",
        },
        {
          heading: "Menghapus datamu",
          body: "Buka sebuah issue di halaman GitHub proyek ini atau hubungi pengelola, lalu akun dan kirimanmu akan dihapus.",
        },
      ],
    },
    terms: {
      title: "Ketentuan penggunaan",
      updated: "31 Oktober 2026",
      sections: [
        {
          heading: "Apa ini",
          body: "YZU Judge adalah situs latihan untuk Collegiate Programming Exam, dibuat oleh seorang mahasiswa Universitas Yuan Ze. Situs ini tidak berafiliasi dengan penyelenggara CPE.",
        },
        {
          heading: "Penggunaan yang wajar",
          body: "Kirimkan solusimu sendiri. Jangan mencoba merusak, membanjiri, atau keluar dari sistem judge, dan jangan mengunggah kode untuk membahayakan server atau pengguna lain.",
        },
        {
          heading: "Tanpa jaminan",
          body: "Situs disediakan apa adanya. Berlatih di sini membantu, tetapi tidak menjamin hasil pada ujian sungguhan. Selalu konfirmasikan persyaratan kelulusan dengan jurusanmu.",
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
