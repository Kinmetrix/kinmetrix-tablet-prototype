import fs from 'node:fs';
import path from 'node:path';

export function indexScreenFiles(appRoot) {
  const srcRoot = path.join(appRoot, 'src');
  const byBase = new Map();
  if (!fs.existsSync(srcRoot)) return byBase;

  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(full);
      else if (ent.name.endsWith('Screen.tsx')) {
        const base = ent.name.replace(/Screen\.tsx$/, '');
        const rel = path.relative(appRoot, full).split(path.sep).join('/');
        byBase.set(base, rel);
      }
    }
  }
  walk(srcRoot);
  return byBase;
}

const ROUTE_SCREEN_BASE = {
  TeamUser: 'TeamUserNavigator',
  TeamList: 'UserTeamList',
  TeamSettingsHome: 'TeamSettings',
};

const ROUTE_NAV_REFERENCE = {
  TeamView: 'src/navigation/TeamNavigator.tsx',
  UserView: 'src/navigation/UserNavigator.tsx',
};

export function sourceFileForRoute(appRoot, route, index) {
  const navRef = ROUTE_NAV_REFERENCE[route];
  if (navRef && fs.existsSync(path.join(appRoot, navRef))) return navRef;

  const alias = ROUTE_SCREEN_BASE[route];
  if (alias && index.has(alias)) return index.get(alias);

  const direct = index.get(route);
  if (direct) return direct;

  const withoutScreen = route.replace(/Screen$/, '');
  if (index.has(withoutScreen)) return index.get(withoutScreen);

  if (route === 'TeamHome') {
    const teamMembers = index.get('TeamMembers');
    if (teamMembers) return teamMembers;
  }

  if (route.startsWith('Onboarding')) {
    const step = route.slice('Onboarding'.length);
    const rel = `src/screens/onboarding/${step}Screen.tsx`;
    if (fs.existsSync(path.join(appRoot, rel))) return rel;
  }

  return null;
}
