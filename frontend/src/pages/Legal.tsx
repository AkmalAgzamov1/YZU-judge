import PageShell from "../components/PageShell";

interface LegalProps {
  kind: "privacy" | "terms";
}

const content = {
  privacy: {
    title: "Privacy policy",
    updated: "October 31, 2026",
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
        heading: "What we never do",
        body: "We do not sell your data, show ads or share your email with anyone. There are no third party trackers on this site.",
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
};

export default function Legal({ kind }: LegalProps) {
  const page = content[kind];

  return (
    <PageShell>
      <article className="px-4 pt-24 pb-24">
        <div className="mx-auto max-w-[680px] pt-16">
          <h1 className="text-hero text-4xl font-semibold tracking-tight">{page.title}</h1>
          <p className="mt-3 text-sm text-neutral-500">Last updated {page.updated}</p>
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
