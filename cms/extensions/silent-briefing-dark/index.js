/**
 * Silent Briefing — dark appearance. Directus registers one appearance per theme
 * extension; pair with `silent-briefing-theme` (light) in Settings → Appearance.
 */
export default {
  id: 'silent-briefing-dark',
  name: 'Silent Briefing (Dark)',
  appearance: 'dark',
  rules: {
    borderRadius: '4px',
    borderWidth: '2px',

    foreground: '#e8e6e1',
    foregroundAccent: '#fbf9f5',
    foregroundSubdued: '#9a9ea8',

    background: '#13161d',
    backgroundNormal: '#181c24',
    backgroundAccent: '#1e2430',
    backgroundSubdued: '#0c0f14',

    borderColor: 'rgba(251, 249, 245, 0.1)',
    borderColorAccent: 'rgba(251, 249, 245, 0.16)',
    borderColorSubdued: '#252a35',

    primary: '#d4af37',
    primaryBackground: 'color-mix(in srgb, var(--theme--background), var(--theme--primary) 14%)',
    primarySubdued: 'color-mix(in srgb, var(--theme--background), var(--theme--primary) 40%)',
    primaryAccent: 'color-mix(in srgb, var(--theme--primary), #fbf9f5 18%)',

    secondary: '#e85a5c',
    secondaryBackground: 'color-mix(in srgb, var(--theme--background), var(--theme--secondary) 12%)',
    secondarySubdued: 'color-mix(in srgb, var(--theme--background), var(--theme--secondary) 45%)',
    secondaryAccent: 'color-mix(in srgb, var(--theme--secondary), #1b1c1a 28%)',

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
          backgroundHover: 'rgba(251, 249, 245, 0.08)',
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
      boxShadow: '0 4px 7px -4px rgb(0 0 0 / 0.35)',
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
