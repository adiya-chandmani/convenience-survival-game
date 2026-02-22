# Replace (교체) UI Flow — MVP v1

## Trigger
- Player selects a **NEW** Weapon/Passive card while the corresponding slot type is full.
  - Weapons full (6/6) and card is `weapon_new`
  - Passives full (6/6) and card is `passive_new`

## Flow (Vampire Survivors-style)
1) **Level Up Overlay** shows 3 cards.
2) Player selects a card.
3) If selection requires replace:
   - Transition to **Replace Step** (same overlay, new panel)
   - Show header: `교체할 항목을 선택하세요`
   - Show list/grid of currently owned items of that type (weapon OR passive), with:
     - icon + name + current level
     - small stats summary (optional MVP)
4) Player selects one owned item to discard.
5) Apply changes atomically:
   - Remove discarded item (and its effects)
   - Add new item at level 1
   - Close overlay and resume game

## UX Details
- ESC in Replace Step: goes back to card selection (does NOT cancel level-up fully)
- Mouse and keyboard:
  - Cards: 1/2/3
  - Replace list: 1..6
- Visual:
  - Discarded item highlights red on hover
  - New item card remains pinned on screen during Replace Step

## Rules
- No replacement when upgrading an owned item (upgrade never needs replace)
- Replacing removes the item entirely (levels lost)
- Evolved weapons are not eligible for replacement in MVP (optional rule); if player has evolved weapon, allow replacement only for non-evolved.

## Telemetry (optional)
- Log: `replace_selected` with {timeSec, type, newId, discardedId}
