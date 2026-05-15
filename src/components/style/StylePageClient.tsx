"use client";

import { useState } from "react";

import FeedbackModal from "@/components/feedback/FeedbackModal";
import { useToast } from "@/components/toasts/toasts";
import {
  BrandSection,
  ButtonsSection,
  CardsSection,
  ColorsSection,
  FeedbackSection,
  FormsSection,
  GenerationHistorySection,
  ToastsSection,
  TypographySection,
} from "@/components/style/StyleSections";

// === Components ===

export default function StylePageClient({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { showToast } = useToast();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [showFeedbackModalSample, setShowFeedbackModalSample] = useState(false);

  const runLoadingDemo = (key: string) => {
    setLoadingKey(key);
    window.setTimeout(() => setLoadingKey(null), 1000);
  };

  return (
    <main
      className={
        embedded
          ? "min-h-full bg-surface-lower text-ink"
          : "min-h-screen bg-surface-lower px-5 pb-20 pt-28 text-ink"
      }
    >
      <div
        className={
          embedded
            ? "mx-auto max-w-6xl space-y-12 px-5 py-6"
            : "mx-auto max-w-6xl space-y-12"
        }
      >
        <TypographySection />
        <ColorsSection />
        <BrandSection />
        <ButtonsSection loadingKey={loadingKey} onRunLoadingDemo={runLoadingDemo} />
        <FormsSection />
        <CardsSection />
        <ToastsSection onShow={showToast} />
        <GenerationHistorySection />
        <FeedbackSection
          onOpenFeedbackModal={() => setShowFeedbackModalSample(true)}
        />
      </div>

      <FeedbackModal
        open={showFeedbackModalSample}
        title="Sample feedback modal"
        placeholder="Please tell us what went wrong with these tags so we can improve future tags."
        onCloseWithoutNote={() => setShowFeedbackModalSample(false)}
        onSubmit={() => setShowFeedbackModalSample(false)}
      />
    </main>
  );
}
