import { type PlantCareSchedule } from './models';
import { SHEET_HEADERS } from './sheet_parser';

interface PlantCatalogEntry {
  keywords: readonly string[];
  schedule: PlantCareSchedule;
}

export const PLANT_CATALOG: readonly PlantCatalogEntry[] = [
  {
    keywords: ['hortensia', 'hydrangea', 'annabelle', 'paniculata', 'macrophylla'],
    schedule: {
      species: 'Hydrangea arborescens / macrophylla',
      wateringDaysSummer: 3,
      wateringDaysWinter: 14,
      pruningMonths: [3],
      trimmingMonths: [8, 9],
      fertilizingMonths: [4, 6],
      careNotes:
        'Snoei pluim- en sneeuwbalhortensia in maart terug tot ca. 30 cm boven de grond; knip uitgebloeide bloemen in de nazomer weg en houd de grond vochtig.',
    },
  },
  {
    keywords: ['lavendel', 'lavender', 'lavandula'],
    schedule: {
      species: 'Lavandula angustifolia',
      wateringDaysSummer: 7,
      wateringDaysWinter: 0,
      pruningMonths: [4, 8],
      trimmingMonths: [7, 8],
      fertilizingMonths: [4],
      careNotes:
        'Hoofdsnoei begin april en vormsnoei in augustus na de bloei; knip nooit diep terug in het kale oude hout.',
    },
  },
  {
    keywords: ['roos', 'rozen', 'klimroos', 'struikroos', 'rose', 'rosa'],
    schedule: {
      species: 'Rosa cultivars',
      wateringDaysSummer: 4,
      wateringDaysWinter: 0,
      pruningMonths: [2, 3],
      trimmingMonths: [6, 7, 8],
      fertilizingMonths: [3, 6],
      careNotes:
        'Snoei in februari/maart terug tot op een naar buiten wijzend oog. Knip in de zomer uitgebloeide rozen weg voor doorbloei.',
    },
  },
  {
    keywords: ['buxus', 'buxushaag', 'boxwood'],
    schedule: {
      species: 'Buxus sempervirens',
      wateringDaysSummer: 7,
      wateringDaysWinter: 0,
      pruningMonths: [5],
      trimmingMonths: [6, 9],
      fertilizingMonths: [4, 6],
      careNotes:
        'Knip hagen op een bewolkte dag in juni en september om bladverbranding te voorkomen; geef organische mest in het voorjaar.',
    },
  },
  {
    keywords: ['japanse esdoorn', 'esdoorn', 'acer', 'palmatum', 'japanese maple'],
    schedule: {
      species: 'Acer palmatum',
      wateringDaysSummer: 5,
      wateringDaysWinter: 0,
      pruningMonths: [11, 12],
      trimmingMonths: [6],
      fertilizingMonths: [4],
      careNotes:
        'Voer vormsnoei uitsluitend uit in volledige winterrust (november-december) om bloeden van de sapstroom te voorkomen.',
    },
  },
  {
    keywords: ['olijf', 'olijfboom', 'olive', 'olea'],
    schedule: {
      species: 'Olea europaea',
      wateringDaysSummer: 7,
      wateringDaysWinter: 21,
      pruningMonths: [3, 4],
      trimmingMonths: [7],
      fertilizingMonths: [4, 6, 8],
      careNotes:
        'Snoei de kroon in het voorjaar (maart-april) open zodat zonlicht het hart bereikt; zorg voor goed doorlatende grond.',
    },
  },
  {
    keywords: ['tomaat', 'tomaten', 'tomato', 'solanum', 'roma', 'cherrytomaat'],
    schedule: {
      species: 'Solanum lycopersicum',
      wateringDaysSummer: 2,
      wateringDaysWinter: 0,
      pruningMonths: [6, 7, 8],
      trimmingMonths: [7, 8, 9],
      fertilizingMonths: [5, 6, 7, 8],
      careNotes: 'Verwijder wekelijks de okselscheuten (dieven) in de zomer en geef direct bij de wortels water.',
    },
  },
  {
    keywords: ['rozemarijn', 'rosemary', 'salvia rosmarinus', 'rosmarinus'],
    schedule: {
      species: 'Salvia rosmarinus',
      wateringDaysSummer: 7,
      wateringDaysWinter: 21,
      pruningMonths: [4],
      trimmingMonths: [5, 6, 7, 8],
      fertilizingMonths: [4],
      careNotes: 'Snoei na de voorjaarsbloei licht terug om de struik compact te houden; staat graag zonnig en droog.',
    },
  },
  {
    keywords: ['blauwe regen', 'wisteria'],
    schedule: {
      species: 'Wisteria sinensis / floribunda',
      wateringDaysSummer: 5,
      wateringDaysWinter: 0,
      pruningMonths: [2, 8],
      trimmingMonths: [7, 8],
      fertilizingMonths: [3, 5],
      careNotes:
        'Tweemaal per jaar snoeien: lange zomerlot-twijgen in augustus terugsnoeien op 5-6 knoppen, en in februari inkorten tot op 2-3 knoppen.',
    },
  },
  {
    keywords: ['clematis', 'bosrank'],
    schedule: {
      species: 'Clematis viticella / jackmanii',
      wateringDaysSummer: 4,
      wateringDaysWinter: 0,
      pruningMonths: [2, 3],
      trimmingMonths: [7],
      fertilizingMonths: [3, 5],
      careNotes:
        'Houd de voet koel in de schaduw terwijl de ranken in de zon klimmen; zomerbloeiers in februari/maart laag terugsnoeien.',
    },
  },
  {
    keywords: ['gazon', 'gras', 'grasmat', 'lawn', 'grass'],
    schedule: {
      species: 'Lolium / Festuca Gazon',
      wateringDaysSummer: 5,
      wateringDaysWinter: 0,
      pruningMonths: [3, 9],
      trimmingMonths: [4, 5, 6, 7, 8, 9, 10],
      fertilizingMonths: [4, 6, 9],
      careNotes:
        'Verticuteer en belucht in maart en september; maai wekelijks van april t/m oktober en strooi najaarsmest voor de winter.',
    },
  },
  {
    keywords: ['appelboom', 'perenboom', 'fruitboom', 'apple', 'malus', 'pear', 'pyrus'],
    schedule: {
      species: 'Malus domestica / Pyrus communis',
      wateringDaysSummer: 7,
      wateringDaysWinter: 0,
      pruningMonths: [1, 2, 8],
      trimmingMonths: [6, 8],
      fertilizingMonths: [3, 4],
      careNotes:
        'Wintersnoei in januari-februari voor vorm en lucht; zomersnoei van waterloten in augustus voor betere vruchtzetting.',
    },
  },
  {
    keywords: ['bamboe', 'bamboo', 'fargesia', 'phyllostachys'],
    schedule: {
      species: 'Fargesia murielae',
      wateringDaysSummer: 4,
      wateringDaysWinter: 14,
      pruningMonths: [3, 4],
      trimmingMonths: [7, 8],
      fertilizingMonths: [4, 6],
      careNotes: 'Knip de oudste halmen in het voorjaar vlak boven de grond weg en top de haag in de zomer bij.',
    },
  },
  {
    keywords: ['rhododendron', 'rododendron', 'azalea'],
    schedule: {
      species: 'Rhododendron simsii / ponticum',
      wateringDaysSummer: 4,
      wateringDaysWinter: 14,
      pruningMonths: [6],
      trimmingMonths: [5, 6],
      fertilizingMonths: [3, 6],
      careNotes:
        'Breek uitgebloeide bloemtrossen in mei-juni voorzichtig uit boven de nieuwe knoppen; houdt van zure turfgrond.',
    },
  },
  {
    keywords: ['varen', 'varens', 'fern', 'dryopteris', 'athyrium'],
    schedule: {
      species: 'Dryopteris filix-mas',
      wateringDaysSummer: 3,
      wateringDaysWinter: 14,
      pruningMonths: [3],
      trimmingMonths: [3],
      fertilizingMonths: [4],
      careNotes:
        'Knip oude bruine veren begin maart weg vlak voordat de nieuwe veren zich ontrollen; houd de bodem humusrijk en vochtig.',
    },
  },
];

export function lookupBuiltInCareSchedule(name: string, speciesHint = ''): PlantCareSchedule {
  const haystack = `${name} ${speciesHint}`.toLowerCase();

  for (const entry of PLANT_CATALOG) {
    if (entry.keywords.some(kw => haystack.includes(kw))) {
      return {
        ...entry.schedule,
        species: speciesHint.trim() || entry.schedule.species,
      };
    }
  }

  if (
    haystack.includes('haag') ||
    haystack.includes('hedge') ||
    haystack.includes('taxus') ||
    haystack.includes('liguster') ||
    haystack.includes('beuk')
  ) {
    return {
      species: speciesHint.trim() || 'Haagplant',
      wateringDaysSummer: 7,
      wateringDaysWinter: 0,
      pruningMonths: [3],
      trimmingMonths: [6, 9],
      fertilizingMonths: [4],
      careNotes:
        'Scheer de haag iets taps toe (onder breder dan boven) in juni en rond de langste dag en opnieuw in september.',
    };
  }

  if (haystack.includes('boom') || haystack.includes('tree') || haystack.includes('berk')) {
    return {
      species: speciesHint.trim() || 'Sierboom',
      wateringDaysSummer: 7,
      wateringDaysWinter: 0,
      pruningMonths: [2, 11],
      trimmingMonths: [7],
      fertilizingMonths: [3],
      careNotes: 'Verwijder kruisende, beschadigde of dode takken tijdens de rustperiode.',
    };
  }

  if (
    haystack.includes('kruid') ||
    haystack.includes('munt') ||
    haystack.includes('basilicum') ||
    haystack.includes('tijm') ||
    haystack.includes('salie') ||
    haystack.includes('herb')
  ) {
    return {
      species: speciesHint.trim() || 'Keukenkruid',
      wateringDaysSummer: 3,
      wateringDaysWinter: 14,
      pruningMonths: [4],
      trimmingMonths: [5, 6, 7, 8, 9],
      fertilizingMonths: [4, 6],
      careNotes: 'Oogst en top de stengels regelmatig van mei t/m september om bossige bladgroei te stimuleren.',
    };
  }

  return {
    species: speciesHint.trim() || 'Vaste Tuinplant / Heester',
    wateringDaysSummer: 4,
    wateringDaysWinter: 14,
    pruningMonths: [3],
    trimmingMonths: [7, 9],
    fertilizingMonths: [4, 6],
    careNotes:
      'Snoei afgestorven plantdelen in het vroege voorjaar (maart) terug, top uitgebloeide stengels in de zomer en bemest in het groeiseizoen.',
  };
}

export const DEMO_SHEET_ROWS: readonly (readonly string[])[] = [
  SHEET_HEADERS,
  [
    "Hortensia 'Annabelle'",
    'Hydrangea arborescens',
    'Voortuin border',
    '3',
    '14',
    'Mrt',
    'Aug, Sep',
    'Apr, Jun',
    'Snoei in maart terug tot ca. 30 cm boven de grond; houd de grond in de zomer gelijkmatig vochtig.',
    '2026-11-01',
  ],
  [
    'Engelse Lavendel',
    'Lavandula angustifolia',
    'Zonnig terras',
    '7',
    '0',
    'Apr, Aug',
    'Jul, Aug',
    'Apr',
    'Hoofdsnoei begin april en vormsnoei in augustus na de bloei; snoei nooit in het kale oude hout.',
    '2026-11-01',
  ],
  [
    'Japanse Esdoorn',
    'Acer palmatum',
    'Oostelijke patiotuin',
    '5',
    '0',
    'Nov, Dec',
    'Jun',
    'Apr',
    'Voer vormsnoei uitsluitend uit in volledige winterrust (nov-dec) om bloeden van sap te voorkomen.',
    '2026-11-01',
  ],
  [
    'Klimroos',
    'Rosa New Dawn',
    'Pergola zuidzijde',
    '4',
    '0',
    'Feb, Mrt',
    'Jun, Jul, Aug',
    'Mrt, Jun',
    'Leid hoofdtakken horizontaal en snoei zijscheuten in feb-mrt; knip uitgebloeide rozen in de zomer weg.',
    '2026-11-01',
  ],
  [
    'Buxushaag',
    'Buxus sempervirens',
    'Oprit pad',
    '7',
    '0',
    'Mei',
    'Jun, Sep',
    'Apr, Jun',
    'Knip strak op een bewolkte dag in juni en september; geef voeding in het voorjaar.',
    '2026-11-01',
  ],
  ['Olijfboom', 'Olea europaea', 'Terraspot', '', '', '', '', '', '', ''],
];
