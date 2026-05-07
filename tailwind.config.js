/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: "var(--color-surface)",
        "surface-higher": "var(--color-surface-higher)",
        "surface-lower": "var(--color-surface-lower)",
        "surface-hover": "var(--color-surface-hover)",
        ink: "var(--color-ink)",
        "ink-weak": "var(--color-ink-weak)",
        line: "var(--color-line)",
        "line-weak": "var(--color-line-weak)",
        "line-strong": "var(--color-line-strong)",
        primary: "var(--color-primary)",
        "primary-hover": "var(--color-primary-hover)",
        "primary-disabled": "var(--color-primary-disabled)",
        danger: "var(--color-danger)",
        warning: "var(--color-warning)",
        success: "var(--color-success)",
        info: "var(--color-info)",
      },
    },
  },
  plugins: [],
};
