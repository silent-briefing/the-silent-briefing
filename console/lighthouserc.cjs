/** Phase A: soft budgets — tighten toward findings.md §8 once CI baselines exist. */
module.exports = {
  ci: {
    collect: {
      url: [
        "http://127.0.0.1:3000/",
        "http://127.0.0.1:3000/judicial/supreme-court",
        "http://127.0.0.1:3000/admin",
      ],
      numberOfRuns: 1,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.65 }],
        "categories:accessibility": ["warn", { minScore: 0.85 }],
      },
    },
  },
};
