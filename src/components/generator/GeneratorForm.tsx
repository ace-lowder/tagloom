"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { DESCRIPTION_MAX, TITLE_MAX } from "./generatorConstants";
import type { DescriptionRevealMode } from "./generatorTypes";

// === Components ===

export function GeneratorForm({
  title,
  titlePlaceholder,
  description,
  showDescription,
  descriptionRevealMode,
  skipGeneratorReturnAnimations,
  focusedField,
  hasTitle,
  isGenerating,
  titleInputRef,
  onTitleFocus,
  onTitleBlur,
  onTitleChange,
  onDescriptionFocus,
  onDescriptionBlur,
  onDescriptionChange,
  onDescriptionAnimationComplete,
  onGenerate,
}: GeneratorFormProps) {
  return (
    <>
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-stone-700">
            Listing Title <span className="text-orange-500">*</span>
          </label>
          {focusedField === "title" ? (
            <span className="text-xs font-medium text-stone-500">
              {title.length}/{TITLE_MAX}
            </span>
          ) : null}
        </div>
        <div data-testid="title-focus-gutter" className="-mx-1 px-1 pb-1">
          <input
            ref={titleInputRef}
            type="text"
            maxLength={TITLE_MAX}
            value={title}
            onFocus={onTitleFocus}
            onBlur={onTitleBlur}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder={titlePlaceholder}
            className="w-full rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
          />
        </div>
      </div>

      <AnimatePresence>
        {showDescription && (
          <motion.div
            data-skip-generator-return-animations={
              skipGeneratorReturnAnimations ? "true" : "false"
            }
            data-description-animation={
              descriptionRevealMode === "first-focus" &&
              !skipGeneratorReturnAnimations
                ? "enter"
                : "none"
            }
            initial={
              descriptionRevealMode === "first-focus" &&
              !skipGeneratorReturnAnimations
                ? { height: 0, opacity: 0 }
                : false
            }
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={onDescriptionAnimationComplete}
            className="mb-3 overflow-visible"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium text-stone-700">
                Listing Description
              </label>
              {focusedField === "description" ? (
                <span className="text-xs font-medium text-stone-500">
                  {description.length}/{DESCRIPTION_MAX}
                </span>
              ) : null}
            </div>
            <div
              data-testid="description-focus-gutter"
              className="-mx-1 px-1 pb-1"
            >
              <textarea
                maxLength={DESCRIPTION_MAX}
                value={description}
                onFocus={onDescriptionFocus}
                onBlur={onDescriptionBlur}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Add more details about your product to get more accurate tags..."
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-200 bg-white/70 px-4 py-3 text-sm text-stone-800 placeholder-stone-400 transition-all focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pb-2">
        <Button
          onClick={onGenerate}
          disabled={isGenerating || !title.trim()}
          isLoading={isGenerating}
          loadingLabel="Generating tags"
          leftIcon={<Sparkles className="h-4 w-4" />}
          className={`mt-1 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
            hasTitle
              ? "bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              : "bg-gray-300"
          }`}
          style={{
            boxShadow: title.trim() ? "0 4px 20px rgba(249,115,22,0.35)" : "none",
          }}
        >
          Generate tags
        </Button>
      </div>
    </>
  );
}

// === Types ===

type GeneratorFormProps = {
  title: string;
  titlePlaceholder: string;
  description: string;
  showDescription: boolean;
  descriptionRevealMode: DescriptionRevealMode;
  skipGeneratorReturnAnimations: boolean;
  focusedField: "title" | "description" | null;
  hasTitle: boolean;
  isGenerating: boolean;
  titleInputRef: RefObject<HTMLInputElement>;
  onTitleFocus: () => void;
  onTitleBlur: () => void;
  onTitleChange: (nextTitle: string) => void;
  onDescriptionFocus: () => void;
  onDescriptionBlur: () => void;
  onDescriptionChange: (nextDescription: string) => void;
  onDescriptionAnimationComplete: () => void;
  onGenerate: () => void;
};
