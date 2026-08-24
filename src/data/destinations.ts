/**
 * Destination data system. Structured data only — UI components render
 * generically so new destinations can be added without touching components.
 *
 * Content policy: concise, widely documented facts (elevations are
 * approximate where sources vary). No invented specifics.
 */

export interface Experience {
  title: string
  note: string
}

export interface ImageVariant {
  /** Larger display source (~1280px wide). */
  src: string
  /** Small-screen source (~640px wide). */
  small: string
  alt: string
}

const img = (slug: string, alt: string): ImageVariant => ({
  // Single local size (1280px) — srcSet de-duplicates when small === src.
  src: `/assets/images/destinations/${slug}-1280.jpg`,
  small: `/assets/images/destinations/${slug}-1280.jpg`,
  alt,
})

export interface Destination {
  id: string
  slug: string
  name: string
  coords: { lat: number; lon: number }
  /** Approximate elevation in metres above sea level. */
  elevationM: number
  tagline: string
  description: string
  experiences: Experience[]
  meta: {
    region: 'East Sikkim' | 'West Sikkim' | 'North Sikkim'
    bestTime: string
    /** Practical access note when relevant (permits, roads). */
    access?: string
  }
  hero: ImageVariant | null
  gallery: ImageVariant[]
}

export const DESTINATIONS: Destination[] = [
  {
    id: 'gangtok',
    slug: 'gangtok',
    name: 'Gangtok',
    coords: { lat: 27.3325, lon: 88.6146 },
    elevationM: 1650,
    tagline: 'The capital beneath the ridge',
    description:
      'Sikkim’s hillside capital spreads along a forested ridge in the east of the state, ' +
      'pairing monasteries and markets with long views toward the Kanchenjunga massif.',
    experiences: [
      { title: 'MG Marg', note: 'The pedestrian heart of town — cafés, bookshops, evening strolls.' },
      { title: 'Rumtek Monastery', note: 'One of the largest monasteries in Sikkim, a short drive from the city.' },
      { title: 'Ropeway', note: 'An aerial crossing over the valley with rooftop views of the hills.' },
      { title: 'Tsomgo Lake day trip', note: 'A glacial lake at ~3,750 m on the old trade route towards Nathu La.' },
    ],
    meta: { region: 'East Sikkim', bestTime: 'March–May · October–December' },
    hero: img('gangtok', 'Hillside view across Gangtok, Sikkim'),
    gallery: [img('rumtek', 'Rumtek Monastery near Gangtok'), img('tsomgo', 'Tsomgo Lake, East Sikkim')],
  },
  {
    id: 'pelling',
    slug: 'pelling',
    name: 'Pelling',
    coords: { lat: 27.3033, lon: 88.2403 },
    elevationM: 2150,
    tagline: 'Face to face with the mountain',
    description:
      'A quiet ridge settlement in West Sikkim famous for its close-up panorama of the ' +
      'Kanchenjunga range, with some of the oldest monasteries of the former kingdom nearby.',
    experiences: [
      { title: 'Kanchenjunga viewpoint', note: 'Dawn light on the world’s third-highest mountain, straight from town.' },
      { title: 'Pemayangtse Monastery', note: 'A 17th-century Nyingma monastery overlooking the valley.' },
      { title: 'Skywalk & Chenrab monastery', note: 'A glass walkway beside the hilltop monastery complex.' },
      { title: 'Village walks', note: 'Cardamom farms and forest trails between the settlements.' },
    ],
    meta: { region: 'West Sikkim', bestTime: 'October–April for mountain views' },
    hero: img('pelling', 'Mountain scenery around Pelling, West Sikkim'),
    gallery: [img('kanchenjunga', 'The Kanchenjunga massif'), img('sikkim', 'Landscape of Sikkim')],
  },

  {
    id: 'lachung',
    slug: 'lachung',
    name: 'Lachung',
    coords: { lat: 27.6877, lon: 88.7353 },
    elevationM: 2900,
    tagline: 'Valley village of the high north',
    description:
      'A Lepcha village in the Lachung river valley of North Sikkim, gateway to the high-alpine ' +
      'meadows of Yumthang and the dramatic road beyond towards Zero Point.',
    experiences: [
      { title: 'Yumthang Valley', note: 'The “valley of flowers” — meadows ringed by snow peaks.' },
      { title: 'Zero Point (Yumesamdong)', note: 'Where the road ends among permanent snow at ~4,700 m.' },
      { title: 'Lachung monastery', note: 'A small village gompa above the river.' },
      { title: 'River walks', note: 'Bridges and paths along the glacial Lachung Chu.' },
    ],
    meta: {
      region: 'North Sikkim',
      bestTime: 'March–June · October–November',
      access: 'North Sikkim requires protected-area permits; travel is usually arranged through registered operators.',
    },
    hero: img('lachung', 'The mountain village of Lachung, North Sikkim'),
    gallery: [img('sikkim', 'High valleys of North Sikkim'), img('tsomgo', 'Alpine lake country')],
  },
  {
    id: 'yuksom',
    slug: 'yuksom',
    name: 'Yuksom',
    coords: { lat: 27.3793, lon: 88.2264 },
    elevationM: 1780,
    tagline: 'Where Sikkim began',
    description:
      'The first capital of Sikkim and the trailhead for Khangchendzonga National Park — ' +
      'a heritage village of coronation sites, forests and multi-day treks.',
    experiences: [
      { title: 'Norbugang Coronation Throne', note: 'The stone throne where the first Chogyal was consecrated in 1642.' },
      { title: 'Dzongri & Goecha La treks', note: 'Classic routes deep into Khangchendzonga National Park.' },
      { title: 'Kathok Wodsall Gompa', note: 'A lakeside monastery at the entrance of the village.' },
      { title: 'Dubdi Monastery', note: 'A forest climb to one of Sikkim’s oldest gompas.' },
    ],
    meta: { region: 'West Sikkim', bestTime: 'March–May · October–November' },
    hero: img('yuksom', 'Forests around Yuksom, West Sikkim'),
    gallery: [img('kanchenjunga', 'Peaks of the Khangchendzonga massif'), img('sikkim', 'Sikkim Himalaya')],
  },
  {
    id: 'nathula',
    slug: 'nathula',
    name: 'Nathu La',
    coords: { lat: 27.3866, lon: 88.8306 },
    elevationM: 4310,
    tagline: 'The pass on the roof of the old silk route',
    description:
      'A high mountain pass on the border ridge between India and China, once part of the ' +
      'Silk Route — today a windswept viewpoint over plateau country at 4,310 m.',
    experiences: [
      { title: 'Border ridge viewpoint', note: 'Stand at the pass itself on a clear day.' },
      { title: 'Old Silk Route drive', note: 'A historic trade corridor through East Sikkim’s high country.' },
      { title: 'Baba Mandir', note: 'A soldiers’ shrine on the route beyond Tsomgo Lake.' },
    ],
    meta: {
      region: 'East Sikkim',
      bestTime: 'May–June · October–November',
      access: 'Open to Indian nationals with a protected-area permit arranged in advance; closed certain weekdays.',
    },
    hero: img('nathula', 'Nathu La pass, East Sikkim'),
    gallery: [img('tsomgo', 'Tsomgo Lake en route to Nathu La'), img('sikkim', 'Eastern Sikkim highlands')],
  },
]

export const getDestination = (slug: string): Destination | undefined =>
  DESTINATIONS.find((d) => d.slug === slug)

/** Aggregate experience list for the Experiences page. */
export interface ExperienceEntry extends Experience {
  destinationSlug: string
  destinationName: string
}

export const ALL_EXPERIENCES: ExperienceEntry[] = DESTINATIONS.flatMap((d) =>
  d.experiences.map((e) => ({ ...e, destinationSlug: d.slug, destinationName: d.name })),
)
