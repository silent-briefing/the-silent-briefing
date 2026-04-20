/**
 * Silent Briefing — aligns Directus Studio with design/colors_and_type.css tokens.
 * Fonts: Newsreader (display/serif), Inter (UI). Surfaces: cream paper; nav: deep navy; accent: gold.
 */
export default {
  id: 'silent-briefing',
  name: 'Silent Briefing',
  appearance: 'light',
  rules: {
    borderRadius: '4px',
    borderWidth: '2px',

    foreground: '#1b1c1a',
    foregroundAccent: '#000f22',
    foregroundSubdued: '#74777e',

    background: '#fbf9f5',
    backgroundNormal: '#f5f3ef',
    backgroundAccent: '#efeeea',
    backgroundSubdued: '#ffffff',

    borderColor: 'rgba(0, 15, 34, 0.08)',
    borderColorAccent: 'rgba(0, 15, 34, 0.14)',
    borderColorSubdued: '#f0f4f9',

    primary: '#d4af37',
    primaryBackground: 'color-mix(in srgb, var(--theme--background), var(--theme--primary) 12%)',
    primarySubdued: 'color-mix(in srgb, var(--theme--background), var(--theme--primary) 45%)',
    primaryAccent: 'color-mix(in srgb, var(--theme--primary), #000f22 22%)',

    secondary: '#b6191a',
    secondaryBackground: 'color-mix(in srgb, var(--theme--background), var(--theme--secondary) 10%)',
    secondarySubdued: 'color-mix(in srgb, var(--theme--background), var(--theme--secondary) 50%)',
    secondaryAccent: 'color-mix(in srgb, var(--theme--secondary), #2e3c43 25%)',

    fonts: {
      display: {
        fontFamily: '"Newsreader", ui-serif, Georgia, "Times New Roman", serif',
        fontWeight: '600',
      },
      sans: {
        fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
        fontWeight: '500',
      },
      serif: {
        fontFamily: '"Newsreader", ui-serif, Georgia, "Times New Roman", serif',
        fontWeight: '500',
      },
      monospace: {
        fontFamily: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace',
        fontWeight: '500',
      },
    },

    navigation: {
      background: 'var(--theme--background-normal)',
      backgroundAccent: 'var(--theme--background-accent)',
      borderColor: 'transparent',
      borderWidth: '0px',

      project: {
        borderColor: 'transparent',
        borderWidth: '0px',
        background: 'var(--theme--navigation--background-accent)',
        foreground: 'var(--theme--foreground-accent)',
        fontFamily: 'var(--theme--font-family-sans-serif)',
      },

      modules: {
        background: '#000f22',
        borderColor: 'transparent',
        borderWidth: '0px',

        button: {
          foreground: 'rgba(251, 249, 245, 0.55)',
          foregroundHover: '#fbf9f5',
          foregroundActive: '#d4af37',

          background: 'transparent',
          backgroundHover: 'rgba(251, 249, 245, 0.06)',
          backgroundActive: '#0a2540',
        },
      },

      list: {
        icon: {
          foreground: 'var(--theme--primary)',
          foregroundHover: 'var(--theme--navigation--list--icon--foreground)',
          foregroundActive: 'var(--theme--navigation--list--icon--foreground)',
        },

        foreground: 'var(--theme--foreground-accent)',
        foregroundHover: 'var(--theme--navigation--list--foreground)',
        foregroundActive: 'var(--theme--navigation--list--foreground)',

        background: 'transparent',
        backgroundHover: 'var(--theme--navigation--background-accent)',
        backgroundActive: 'var(--theme--navigation--background-accent)',

        fontFamily: 'var(--theme--fonts--sans--font-family)',

        divider: {
          borderColor: 'var(--theme--border-color-accent)',
          borderWidth: 'var(--theme--border-width)',
        },
      },
    },

    header: {
      background: 'var(--theme--background)',
      borderColor: 'transparent',
      borderWidth: '0px',
      boxShadow: '0 4px 7px -4px rgb(0 0 0 / 0.12)',
      headline: {
        foreground: 'var(--theme--foreground-subdued)',
        fontFamily: 'var(--theme--fonts--sans--font-family)',
      },
      title: {
        foreground: 'var(--theme--foreground-accent)',
        fontFamily: 'var(--theme--fonts--display--font-family)',
        fontWeight: 'var(--theme--fonts--display--font-weight)',
      },
    },

    form: {
      columnGap: '1.8125rem',
      rowGap: '2.25rem',

      field: {
        label: {
          foreground: 'var(--theme--foreground-accent)',
          fontFamily: 'var(--theme--fonts--sans--font-family)',
          fontWeight: '600',
        },
        input: {
          background: 'var(--theme--background)',
          backgroundSubdued: 'var(--theme--background-subdued)',

          foreground: 'var(--theme--foreground)',
          foregroundSubdued: 'var(--theme--foreground-subdued)',

          borderColor: 'var(--theme--border-color)',
          borderColorHover: 'var(--theme--border-color-accent)',
          borderColorFocus: 'var(--theme--primary)',

          boxShadow: 'none',
          boxShadowHover: 'none',
          boxShadowFocus: '0 0 16px -8px var(--theme--primary)',

          height: '3.375rem',
          padding: '0.875rem',
        },
      },
    },

    sidebar: {
      background: 'var(--theme--background-normal)',
      foreground: 'var(--theme--foreground-subdued)',
      fontFamily: 'var(--theme--fonts--sans--font-family)',
      borderColor: 'transparent',
      borderWidth: '0px',
    },
  },
};
