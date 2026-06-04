import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceToReveal,
  CLEAR_TEST_TIMINGS,
  countGenerateCalls,
  createFetchMockForGenerator,
  DEFAULT_TITLE_PLACEHOLDER,
  renderWithToasts,
  resetGeneratorTestStorage,
  sanitizeExpectedTags,
  TEST_TIMINGS,
} from "./Generator.testUtils";
import Generator from "./Generator";

beforeEach(() => {
  resetGeneratorTestStorage();
});

describe("Generator demo chips", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders only non-empty chips in demo reveal", async () => {
    const fixture = {
      title: "Demo title",
      tags: {
        target: ["ceramic mug", "coffee gift", "artisan cup"],
        discovery: ["kitchen decor", "housewarming", "handmade"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const chips = screen.getAllByTestId("generated-tag-chip");
    const shell = screen.getByTestId("generator-shell");
    expect(chips).toHaveLength(expected.length);
    expect(
      chips.every((chip) => chip.getAttribute("data-animation") === "reveal"),
    ).toBe(true);
    expect(chips.every((chip) => chip.textContent?.trim().length)).toBe(true);
    expect(chips.some((chip) => chip.textContent === "undefined" || chip.textContent === "null")).toBe(false);
    expect(screen.getByTestId("generated-tag-count")).toHaveTextContent(`${expected.length} tags generated`);
    expect(shell).toHaveAttribute("data-clear-phase", "idle");
    expect(shell).toHaveAttribute("data-height-locked", "false");
  });

  it("sanitizes empty, whitespace, and duplicate tags before rendering", async () => {
    const fixture = {
      title: "Dirty tags fixture",
      tags: {
        target: ["floral bookmark", " ", "", "book lover gift", "floral bookmark"],
        discovery: ["  ", "teacher gift", "teacher gift", "cottagecore", ""],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const chips = screen.getAllByTestId("generated-tag-chip");
    const chipTexts = chips.map((chip) => chip.textContent?.trim() ?? "");

    expect(chips).toHaveLength(expected.length);
    expect(chipTexts).toEqual(expected);
    expect(chipTexts.some((text) => text.length === 0)).toBe(false);
  });

  it("copies only sanitized visible tags", async () => {
    const fixture = {
      title: "Copy fixture",
      tags: {
        target: ["alpha", " ", "beta", "alpha"],
        discovery: ["gamma", "", "delta"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);
    fireEvent.click(screen.getByRole("button", { name: "Copy all" }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected.join(", "));
  });

  it("fades full results together, then collapses height, then resumes backspace", async () => {
    const fixture = {
      title: "Clear sequence fixture",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };
    const expected = sanitizeExpectedTags(fixture.tags.target, fixture.tags.discovery);

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: CLEAR_TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    await advanceToReveal(fixture.title, expected.length);

    const shell = screen.getByTestId("generator-shell");
    expect(shell).toHaveAttribute("data-height-locked", "false");
    expect(screen.getByTestId("results-block")).toBeInTheDocument();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "fading"));
    expect(screen.queryByTestId("results-block") || shell.getAttribute("data-clear-phase") === "collapsing").toBeTruthy();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "collapsing"));
    expect(shell).toHaveAttribute("data-height-locked", "true");
    expect(screen.getByTestId("results-block")).toBeInTheDocument();

    await waitFor(() => expect(shell).toHaveAttribute("data-clear-phase", "idle"));
    expect(shell).toHaveAttribute("data-height-locked", "false");
    expect(screen.queryByTestId("results-block")).not.toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText(
      "e.g. Handmade ceramic coffee mug with minimalist design",
    ) as HTMLInputElement;
    await waitFor(() => expect(titleInput.value.length).toBeLessThan(fixture.title.length));
  });

  it("on partial demo typing focus, clears value and sets full fixture placeholder", async () => {
    const fixture = {
      title: "Full demo title should become placeholder",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));
    expect(titleInput.value.length).toBeLessThan(fixture.title.length);

    fireEvent.focus(titleInput);
    expect(titleInput.value).toBe("");
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);

    fireEvent.change(titleInput, { target: { value: "x" } });
    expect(titleInput).toHaveAttribute("placeholder", DEFAULT_TITLE_PLACEHOLDER);
  });

  it("on backspacing focus, clears value and keeps full fixture placeholder", async () => {
    const fixture = {
      title: "Backspacing demo title placeholder",
      tags: {
        target: ["alpha", "beta", "gamma"],
        discovery: ["delta", "epsilon", "zeta"],
      },
    };

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: CLEAR_TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    await waitFor(() => expect(titleInput.value).toBe(fixture.title));
    await waitFor(() => expect(titleInput.value.length).toBeLessThan(fixture.title.length));
    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));

    fireEvent.focus(titleInput);
    expect(titleInput.value).toBe("");
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);
  });

  it("keeps default placeholder when refocusing after user interaction", async () => {
    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [
            {
              title: "Any demo fixture",
              tags: { target: ["a"], discovery: ["b"] },
            },
          ],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(
      DEFAULT_TITLE_PLACEHOLDER,
    ) as HTMLInputElement;

    fireEvent.change(titleInput, { target: { value: "manual title" } });
    fireEvent.blur(titleInput);
    fireEvent.focus(titleInput);

    expect(titleInput).toHaveAttribute("placeholder", DEFAULT_TITLE_PLACEHOLDER);
  });

  it("treats generate click like title focus during the demo and does not start generation", async () => {
    const fetchMock = createFetchMockForGenerator();
    vi.stubGlobal("fetch", fetchMock);

    const fixture = {
      title: "Demo title click fixture",
      tags: {
        target: ["alpha", "beta"],
        discovery: ["gamma", "delta"],
      },
    };

    renderWithToasts(
      <Generator
        demoConfig={{
          timings: TEST_TIMINGS,
          fixtures: [fixture],
        }}
      />,
    );

    const titleInput = screen.getByPlaceholderText(DEFAULT_TITLE_PLACEHOLDER) as HTMLInputElement;
    await waitFor(() => expect(titleInput.value.length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole("button", { name: "Generate 13 tags" }));

    await waitFor(() => expect(titleInput.value).toBe(""));
    expect(titleInput).toHaveAttribute("placeholder", `e.g. ${fixture.title}`);
    expect(screen.getByText("Listing Description")).toBeInTheDocument();
    expect(countGenerateCalls(fetchMock)).toBe(0);
  });
});
