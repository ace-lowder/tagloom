# Generation Benchmark

This is a manual paid OpenAI benchmark for generation output quality checks.

It is not part of `npm run test`, `npm run build`, or CI.

Run it only after meaningful changes to generation logic such as:
- generation prompt changes
- model changes
- parsing changes
- normalization changes
- fallback behavior changes

Do not run it for:
- UI changes
- CSS changes
- admin changes
- auth changes
- billing changes
- refactors that do not change generation logic

## Input

- File: `benchmarks/listings.csv`
- Columns: `id,category,title,description`
- Source listings: `benchmarks/source-listings/`

`benchmarks/listings.csv` is the benchmark input dataset.
`benchmarks/source-listings/` stores the original manually collected listing descriptions for audit and rebuild purposes.
Do not delete source listings unless intentionally replacing the benchmark dataset.

## Run

```bash
npm run benchmark
```

## Output

The script writes JSON and CSV results in `benchmarks/results/`.

## Review

Automated metrics only catch mechanical issues.

You should manually compare output files between generation logic versions.
