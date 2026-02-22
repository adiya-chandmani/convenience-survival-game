export type Lang = 'ko' | 'en';

const KEY = 'mvp_game.lang';
let _lang: Lang = 'ko';

export function getLang(): Lang {
  // lazy-load from localStorage when available
  try {
    const v = (globalThis as any)?.localStorage?.getItem?.(KEY);
    if (v === 'ko' || v === 'en') _lang = v;
  } catch {}
  return _lang;
}

export function setLang(lang: Lang) {
  _lang = lang;
  try {
    (globalThis as any)?.localStorage?.setItem?.(KEY, lang);
  } catch {}
}

const dict: Record<Lang, Record<string, string>> = {
  ko: {
    'menu.title': '편의점 나이트 서바이벌',
    'menu.subtitle': '10분 생존 · 무기 빌드 · 야간 알바 감성',
    'menu.start': '시작하기  [ENTER]',
    'menu.help': '조작법 / 목표',
    'menu.difficulty': '난이도',
    'menu.easy': '쉬움',
    'menu.normal': '보통',
    'menu.hard': '어려움',
    'menu.hint': 'WASD 이동 · Shift 대시 · 마우스 조준 · ESC 메뉴',

    'help.title': '조작법 / 목표',
    'help.body':
      '목표: 가능한 오래 버티고, 레벨업으로 무기를 빌드하세요.\n\n' +
      '- 이동: WASD / 방향키\n' +
      '- 대시: Shift\n' +
      '- 조준: 마우스(없으면 가장 가까운 적)\n' +
      '- 메뉴로: ESC\n\n' +
      '팁: 무기는 많이, 패시브는 가끔 — 빌드 맛을 살려보자.\n' +
      '난이도는 메뉴에서 선택할 수 있어요.',
    'help.close': '닫기  [ESC]',

    'settings.title': '설정',
    'settings.resume': '계속하기  [ESC]',
    'settings.restart': '재시작  [R]',
    'settings.quit': '홈으로  [Q]',
    'settings.hotkeys': 'ESC: 계속하기\nR: 재시작\nQ: 홈으로',
    'settings.language': '언어',
    'settings.lang.ko': '한국어',
    'settings.lang.en': 'English',

    'ui.weapon': '무기',
    'ui.passive': '패시브',
    'ui.get': '획득',
    'ui.upgrade': '강화',
    'ui.replace_weapon': '교체할 무기 선택',
    'ui.replace_passive': '교체할 패시브 선택',

    'stat.damage': '데미지',
    'stat.cooldown': '쿨다운',
    'stat.projectiles': '투사체',
    'stat.pellets': '탄환수',
    'stat.blades': '블레이드',
    'stat.pierce': '관통',
    'stat.width': '빔폭',
    'stat.radius': '범위',
    'stat.range': '사거리',
    'stat.move_speed': '이동속도',
    'stat.attack_speed': '공격속도',
    'stat.pickup_range': '획득범위',
    'stat.armor': '방어',
    'stat.luck': '운',
    'stat.gold': '코인',
    'stat.duration': '지속시간',
    'stat.tick': '틱간격',
    'stat.spread': '산탄각',
    'stat.angular_speed': '회전속도',
    'stat.beam_duration': '빔지속',
    'stat.slow': '슬로우',
    'stat.slow_duration': '슬로우지속',

    'ui.slot_full_replace': '(슬롯이 꽉 차면 교체)',
    'ui.generic_upgrade': '무기가 강화됩니다.',
    'ui.generic_upgrade_passive': '효과가 강화됩니다.',

    'gameover.restart': '재시작  [ENTER]',
    'gameover.quit': '홈으로  [ESC]',
    'gameover.kills': '처치',
    'gameover.difficulty.easy': '쉬움',
    'gameover.difficulty.normal': '보통',
    'gameover.difficulty.hard': '어려움',
  },
  en: {
    'menu.title': 'Convenience Night Survival',
    'menu.subtitle': '10-min survival · weapon builds · night shift vibes',
    'menu.start': 'Start  [ENTER]',
    'menu.help': 'How to Play / Goal',
    'menu.difficulty': 'Difficulty',
    'menu.easy': 'Easy',
    'menu.normal': 'Normal',
    'menu.hard': 'Hard',
    'menu.hint': 'WASD move · Shift dash · Mouse aim · ESC menu',

    'help.title': 'How to Play / Goal',
    'help.body':
      'Goal: survive as long as you can and build weapons via level-ups.\n\n' +
      '- Move: WASD / Arrow Keys\n' +
      '- Dash: Shift\n' +
      '- Aim: Mouse (or nearest enemy)\n' +
      '- Menu: ESC\n\n' +
      'Tip: more weapons, fewer passives — keep the build spicy.\n' +
      'You can pick difficulty in the menu.',
    'help.close': 'Close  [ESC]',

    'settings.title': 'Settings',
    'settings.resume': 'Resume  [ESC]',
    'settings.restart': 'Restart  [R]',
    'settings.quit': 'Quit to Menu  [Q]',
    'settings.hotkeys': 'ESC: Resume\nR: Restart\nQ: Quit',
    'settings.language': 'Language',
    'settings.lang.ko': '한국어',
    'settings.lang.en': 'English',

    'ui.weapon': 'Weapon',
    'ui.passive': 'Passive',
    'ui.get': 'Get',
    'ui.upgrade': 'Upgrade',
    'ui.replace_weapon': 'Choose a weapon to replace',
    'ui.replace_passive': 'Choose a passive to replace',

    'stat.damage': 'Damage',
    'stat.cooldown': 'Cooldown',
    'stat.projectiles': 'Projectiles',
    'stat.pellets': 'Pellets',
    'stat.blades': 'Blades',
    'stat.pierce': 'Pierce',
    'stat.width': 'Beam Width',
    'stat.radius': 'Radius',
    'stat.range': 'Range',
    'stat.move_speed': 'Move Speed',
    'stat.attack_speed': 'Attack Speed',
    'stat.pickup_range': 'Pickup Range',
    'stat.armor': 'Armor',
    'stat.luck': 'Luck',
    'stat.gold': 'Gold',
    'stat.duration': 'Duration',
    'stat.tick': 'Tick Interval',
    'stat.spread': 'Spread',
    'stat.angular_speed': 'Spin Speed',
    'stat.beam_duration': 'Beam Duration',
    'stat.slow': 'Slow',
    'stat.slow_duration': 'Slow Duration',

    'ui.slot_full_replace': '(Replace if slots are full)',
    'ui.generic_upgrade': 'Upgrades the weapon.',
    'ui.generic_upgrade_passive': 'Improves the effect.',

    'gameover.restart': 'Restart  [ENTER]',
    'gameover.quit': 'Quit to Menu  [ESC]',
    'gameover.kills': 'Kills',
    'gameover.difficulty.easy': 'Easy',
    'gameover.difficulty.normal': 'Normal',
    'gameover.difficulty.hard': 'Hard',
  },
};

export function t(key: string): string {
  const lang = getLang();
  return dict[lang]?.[key] ?? dict.ko[key] ?? key;
}

// ---- Names (weapons/passives) ----
const weaponNamesEn: Record<string, string> = {
  coffee_can_shot: 'Coffee Shot',
  receipt_blade: 'Receipt Blades',
  boxcutter_boomerang: 'Boxcutter Boomerang',
  barcode_laser: 'Barcode Laser',
  coin_shotgun: 'Coin Shotgun',
  ramen_steam_wave: 'Ramen Steam Wave',
  ice_cup_slow_field: 'Iced Cup Slow Field',
  detergent_splash: 'Detergent Splash',
  espresso_burst: 'Espresso Burst',
  premium_scan_laser: 'Premium Scan Laser',
  stapler_burst: 'Stapler Burst',
  mop_spin: 'Mop Spin',
  price_tag_bomb: 'Price Tag Bomb',
  receipt_printer_beam: 'Receipt Printer Beam',
  coupon_rain: 'Coupon Rain',
};

const passiveNamesEn: Record<string, string> = {
  gloves: 'Gloves',
  sneakers: 'Sneakers',
  energy_drink: 'Energy Drink',
  big_bag: 'Big Tote Bag',
  ice_pack: 'Ice Pack',
  protective_gloves: 'Protective Gloves',
  membership_card: 'Membership Card',
  night_contract: 'Night Shift Contract',
};

export function weaponName(id: string, fallback: string) {
  return getLang() === 'en' ? weaponNamesEn[id] ?? fallback : fallback;
}

export function passiveName(id: string, fallback: string) {
  return getLang() === 'en' ? passiveNamesEn[id] ?? fallback : fallback;
}
