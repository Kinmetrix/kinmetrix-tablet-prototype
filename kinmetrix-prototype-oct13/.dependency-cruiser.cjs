/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-cross-feature',
      severity: 'error',
      from: { path: '^src/features/([^/]+)/' },
      to: { path: '^src/features/([^/]+)/', pathNot: '^src/features/$1/' },
    },
    {
      name: 'features-not-app',
      severity: 'error',
      from: { path: '^src/features/' },
      to: { path: '^src/app/' },
    },
    {
      name: 'shared-not-product',
      severity: 'error',
      from: { path: '^src/shared/' },
      to: { path: '^src/(features|app)/' },
    },
    {
      name: 'hooks-not-ui',
      severity: 'error',
      from: { path: '^src/features/[^/]+/hooks/' },
      to: { path: '^src/features/[^/]+/ui/' },
    },
    {
      name: 'ui-not-services',
      severity: 'error',
      from: { path: '^src/features/[^/]+/ui/' },
      to: { path: '^src/features/[^/]+/services/' },
    },
    {
      name: 'ui-not-fixtures',
      severity: 'error',
      from: { path: '^src/features/[^/]+/ui/' },
      to: { path: 'Fixtures\\.ts$' },
    },
    {
      name: 'model-not-services',
      severity: 'error',
      from: { path: '^src/features/[^/]+/model/' },
      to: { path: '^src/features/[^/]+/services/' },
    },
    {
      name: 'model-not-react',
      severity: 'error',
      from: { path: '^src/features/[^/]+/model/' },
      to: { dependencyTypes: ['npm'], path: '^(react|react-dom|@tanstack/react-query)$' },
    },
    {
      name: 'services-not-react',
      severity: 'error',
      from: { path: '^src/features/[^/]+/services/' },
      to: { dependencyTypes: ['npm'], path: '^(react|react-dom|@tanstack/react-query)$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['module', 'main'],
    },
  },
}
