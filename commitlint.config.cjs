const COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

module.exports = {
  extends: ['@commitlint/config-conventional'],
  helpUrl: 'docs/agents/git/conventions.md',
  defaultIgnores: true,
  rules: {
    'type-empty': [2, 'never'],
    'type-enum': [2, 'always', COMMIT_TYPES],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
    'header-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
  },
  parserPreset: {
    parserOpts: {
      issuePrefixes: ["KMD-"],
    },
  },
};
