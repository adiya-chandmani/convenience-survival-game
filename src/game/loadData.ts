export type Registries = {
  weaponsById: Map<string, any>;
  passivesById: Map<string, any>;
  evolutions: any[];
  enemiesById: Map<string, any>;
  spawnTablesById: Map<string, any>;
  stagesById: Map<string, any>;
  metaUpgradesById: Map<string, any>;
  drops: any;
  levelupRules: any;
  combatRules: any;
  progression: any;
  events: any;
  bossSkills: any;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

function toMapById<T extends { id: string }>(items: T[], label: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const it of items) {
    if (!it?.id) throw new Error(`${label}: item missing id`);
    if (map.has(it.id)) throw new Error(`${label}: duplicate id '${it.id}'`);
    map.set(it.id, it);
  }
  return map;
}

export async function loadAllFromUrl(baseUrl: string): Promise<Registries> {
  const p = (name: string) => `${baseUrl.replace(/\/$/, '')}/${name}`;

  const weapons = await fetchJson<any[]>(p('weapons.json'));
  const passives = await fetchJson<any[]>(p('passives.json'));
  const evolutions = await fetchJson<any[]>(p('evolutions.json'));
  const enemies = await fetchJson<any[]>(p('enemies.json'));
  const spawnTables = await fetchJson<any[]>(p('spawn_tables.json'));
  const stages = await fetchJson<any[]>(p('stages.json'));

  const drops = await fetchJson<any>(p('drops.json'));
  const levelupRules = await fetchJson<any>(p('levelup_rules.json'));
  const combatRules = await fetchJson<any>(p('combat_rules.json'));
  const progression = await fetchJson<any>(p('progression.json'));
  const upgradesMeta = await fetchJson<any[]>(p('upgrades_meta.json'));
  const events = await fetchJson<any>(p('events.json'));
  const bossSkills = await fetchJson<any>(p('boss_skills.json'));

  return {
    weaponsById: toMapById(weapons, 'weapons'),
    passivesById: toMapById(passives, 'passives'),
    evolutions,
    enemiesById: toMapById(enemies, 'enemies'),
    spawnTablesById: toMapById(spawnTables, 'spawn_tables'),
    stagesById: toMapById(stages, 'stages'),
    metaUpgradesById: toMapById(upgradesMeta, 'upgrades_meta'),
    drops,
    levelupRules,
    combatRules,
    progression,
    events,
    bossSkills,
  };
}
