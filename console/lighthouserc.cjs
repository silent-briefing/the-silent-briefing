/** Phase B.13: budgets aligned with docs/plans/findings.md §8; LCP warn threshold allows CI cold-start variance. */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/judicial/supreme-court",
        "http://127.0.0.1:3000/judicial/justice-hagen",
        "http://127.0.0.1:3000/officials",
        "http://127.0.0.1:3000/search",
        "http://127.0.0.1:3000/graph",
        "http://127.0.0.1:3000/compare",
        "http://127.0.0.1:3000/admin",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.92 }],
        "categories:best-practices": ["warn", { minScore: 0.88 }],
        "categories:performance": ["warn", { minScore: 0.72 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
      },
    },
  },
};
