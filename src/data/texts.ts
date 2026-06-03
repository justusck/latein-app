import type { SeedBook } from './types';

/**
 * Starter library. The first two are graded readers written for this app
 * (CC0) using only early vocabulary, so coverage unlocks them quickly.
 * The third is a genuine public-domain classical text (Vulgata) that stays
 * locked until enough vocabulary is mastered — demonstrating the gating.
 */
export const SEED_TEXTS: SeedBook[] = [
  {
    id: 'prima-verba',
    title: 'Prīma Verba',
    author: 'Latina (graded reader)',
    source: 'Eigenproduktion',
    license: 'CC0',
    level: 'A0',
    levelScore: 1,
    body:
      'Puella in terrā est. Puella aquam amat. ' +
      'Amīcus quoque aquam amat. Puer et puella in oppidō sunt. ' +
      'Servus labōrat. Dominus servum videt. ' +
      'Puella laeta est, nam amīcus bonus est.',
  },
  {
    id: 'rex-et-regina',
    title: 'Rēx et Rēgīna',
    author: 'Latina (graded reader)',
    source: 'Eigenproduktion',
    license: 'CC0',
    level: 'A1',
    levelScore: 3,
    body:
      'In īnsulā magnā rēx et rēgīna habitant. ' +
      'Rēx bonus est et patriam amat. ' +
      'Mīlitēs in oppidum veniunt et rēgem vident. ' +
      'Rēgīna puerīs aquam dat; puerī laetī sunt. ' +
      'Rēx mīlitēs dūcit, nam bellum nōn bonum est. ' +
      'Hominēs rēgem bonum semper amant.',
  },
  {
    id: 'vulgata-genesis',
    title: 'In prīncipiō (Genesis 1)',
    author: 'Vulgata',
    source: 'Biblia Sacra Vulgata',
    license: 'Public Domain',
    level: 'B1',
    levelScore: 7,
    body:
      'In prīncipiō creāvit Deus caelum et terram. ' +
      'Terra autem erat inānis et vacua, et tenebrae erant super faciem abyssī; ' +
      'et spīritus Deī ferēbātur super aquās. ' +
      'Dīxitque Deus: Fīat lūx. Et facta est lūx.',
  },
];
