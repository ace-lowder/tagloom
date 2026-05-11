"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedbackRating = "up" | "down";

type FeedbackButtonsProps = {
  rating: FeedbackRating | null;
  disabled?: boolean;
  onUp: () => void;
  onDown: () => void;
};

export default function FeedbackButtons({
  rating,
  disabled = false,
  onUp,
  onDown,
}: FeedbackButtonsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Thumbs up"
        aria-pressed={rating === "up"}
        disabled={disabled}
        onClick={onUp}
        className={cn(
          "inline-flex h-6 items-center justify-center bg-transparent px-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70",
          rating === "up"
            ? "text-green-600"
            : "text-stone-500 hover:text-stone-700",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <ThumbsUp className="h-5 w-5" />
      </button>

      <button
        type="button"
        aria-label="Thumbs down"
        aria-pressed={rating === "down"}
        disabled={disabled}
        onClick={onDown}
        className={cn(
          "inline-flex h-6 items-center justify-center bg-transparent px-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-300/70",
          rating === "down"
            ? "text-red-600"
            : "text-stone-500 hover:text-stone-700",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <ThumbsDown className="h-5 w-5" />
      </button>
    </div>
  );
}
