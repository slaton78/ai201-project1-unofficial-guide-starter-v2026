/**
 * Fictional campus fan identities. These are ORIGINAL placeholders: they do not represent any
 * real school, team, conference, or mascot. Selection is purely cosmetic.
 *
 * To add or rename a campus, edit this file only — screens read everything from here.
 */
export type EmblemKind = 'fox' | 'comet' | 'owl' | 'spark' | 'pilot';

export interface Campus {
  id: string;
  name: string;
  /** Short chant shown on the trail header. */
  rallyCry: string;
  description: string;
  emblem: EmblemKind;
  colors: {
    primary: string;
    secondary: string;
    /** Text/icon color that meets contrast on `primary`. */
    onPrimary: string;
  };
}

export const CAMPUSES: readonly Campus[] = [
  {
    id: 'aurora-foxes',
    name: 'Aurora Foxes',
    rallyCry: 'Glow up, Foxes!',
    description: 'Quick-witted night owls who cheer under shimmering skies.',
    emblem: 'fox',
    colors: { primary: '#6B3FA0', secondary: '#1FB5AC', onPrimary: '#FFFFFF' },
  },
  {
    id: 'harbor-comets',
    name: 'Harbor Comets',
    rallyCry: 'Light the harbor!',
    description: 'Coastal crowd known for streaking banners and booming horns.',
    emblem: 'comet',
    colors: { primary: '#1D2F5E', secondary: '#FF7A68', onPrimary: '#FFFFFF' },
  },
  {
    id: 'granite-owls',
    name: 'Granite Owls',
    rallyCry: 'Steady and wise!',
    description: 'Mountain-town fans who never miss a play — or a puzzle.',
    emblem: 'owl',
    colors: { primary: '#1F5C3A', secondary: '#E8B931', onPrimary: '#FFFFFF' },
  },
  {
    id: 'solstice-sparks',
    name: 'Solstice Sparks',
    rallyCry: 'Spark the season!',
    description: 'Sunrise-to-sunset energy with the loudest drumline on the trail.',
    emblem: 'spark',
    colors: { primary: '#3A2C7A', secondary: '#FF8A1F', onPrimary: '#FFFFFF' },
  },
  {
    id: 'redwood-pilots',
    name: 'Redwood Pilots',
    rallyCry: 'Fly the forest!',
    description: 'High-flying fans who plan every rally like a flight path.',
    emblem: 'pilot',
    colors: { primary: '#7A1F35', secondary: '#7CC4F0', onPrimary: '#FFFFFF' },
  },
];

export const DEFAULT_CAMPUS_ID = 'aurora-foxes';

export function getCampus(id: string | null | undefined): Campus {
  return CAMPUSES.find((c) => c.id === id) ?? (CAMPUSES[0] as Campus);
}
