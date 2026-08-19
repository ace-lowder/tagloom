import Link from "next/link";
import SiteFooter from "@/components/shared/SiteFooter";

type LegalSection = {
  title: string;
  body: string[];
};

type LegalPageProps = {
  title: string;
  description: string;
  lastUpdated: string;
  sections: LegalSection[];
};

export default function LegalPage({
  title,
  description,
  lastUpdated,
  sections,
}: LegalPageProps) {
  return (
    <div className="min-h-screen bg-stone-50 font-sans">
      <section className="border-b border-stone-100 bg-white px-5 pb-12 pt-28">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-4 text-4xl font-bold text-stone-900 sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-stone-600 sm:text-lg">
            {description}
          </p>
          <p className="mt-5 text-sm text-stone-500">
            Last updated: {lastUpdated}
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-5 py-12">
        <div className="space-y-9 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm sm:p-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="mb-3 text-xl font-bold text-stone-900">
                {section.title}
              </h2>
              <div className="space-y-3 text-sm leading-7 text-stone-600 sm:text-base">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}

          <section>
            <h2 className="mb-3 text-xl font-bold text-stone-900">
              Contact
            </h2>
            <p className="text-sm leading-7 text-stone-600 sm:text-base">
              Questions about this page or your account can be sent through{" "}
              <Link
                href="/support/contact"
                className="font-medium text-orange-600 hover:underline"
              >
                UpdateTags support
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
