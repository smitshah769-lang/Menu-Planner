import type { Meal, MealKind, MealSection } from "@/types/meal";

type MealSeed = {
  id: string;
  name: string;
  overrides?: Partial<Meal>;
};

function defineMeals(
  section: MealSection,
  kind: MealKind,
  seeds: MealSeed[],
  sectionTags: string[] = [],
): Meal[] {
  return seeds.map(({ id, name, overrides }) => {
    const base: Meal = {
      id,
      name,
      kind,
      section,
      tags: sectionTags,
      lunchOnly: false,
      dinnerDefaultOk: true,
      lunchDefaultOk: true,
      active: true,
      vegetarian: true,
      excludePlainRice: false,
      isStaple: false,
      avoidAsDefault: false,
    };
    const merged = { ...base, ...overrides };
    if (overrides?.tags) {
      merged.tags = [...sectionTags, ...overrides.tags];
    }
    return merged;
  });
}

const gujaratiSabzis = defineMeals(
  "gujarati-sabzis",
  "subji",
  [
    { id: "sev-tameta-nu-shaak", name: "Sev Tameta nu Shaak" },
    { id: "ringan-bateta-nu-shaak", name: "Ringan Bateta nu Shaak" },
    { id: "ringan-bateta-nu-olo", name: "Ringan Bateta nu Olo" },
    { id: "doodhi-chana-dal", name: "Doodhi Chana Dal" },
    { id: "doodhi-bateta-nu-shaak", name: "Doodhi Bateta nu Shaak" },
    { id: "tuvar-lilva-nu-shaak", name: "Tuvar Lilva nu Shaak" },
    { id: "val-papdi-nu-shaak", name: "Val Papdi nu Shaak" },
    { id: "valor-bateta-nu-shaak", name: "Valor Bateta nu Shaak" },
    { id: "gavar-bateta-nu-shaak", name: "Gavar Bateta nu Shaak" },
    { id: "methi-bateta-nu-shaak", name: "Methi Bateta nu Shaak" },
    { id: "palak-bateta", name: "Palak Bateta" },
    { id: "tuvar-ringan-nu-shaak", name: "Tuvar Ringan nu Shaak" },
    { id: "ringan-nu-bharelu-shaak", name: "Ringan nu Bharelu Shaak" },
    {
      id: "bharwa-bhinda",
      name: "Bharwa Bhinda",
      overrides: { lunchOnly: true, isStaple: true },
    },
    { id: "bharwa-tindora", name: "Bharwa Tindora" },
    { id: "dudhi-muthiya-nu-shaak", name: "Dudhi Muthiya nu Shaak" },
    { id: "papdi-nu-shaak", name: "Papdi nu Shaak" },
    { id: "surti-papdi-nu-shaak", name: "Surti Papdi nu Shaak" },
    { id: "guvar-nu-shaak", name: "Guvar nu Shaak" },
    { id: "karela-bateta-nu-shaak", name: "Karela Bateta nu Shaak" },
    { id: "karela-sambhariya", name: "Karela Sambhariya" },
    {
      id: "choli-nu-shaak",
      name: "Choli nu Shaak (Choli subji)",
      overrides: { lunchOnly: true, isStaple: true },
    },
    {
      id: "bhinda-nu-shaak",
      name: "Bhinda nu Shaak",
      overrides: { lunchOnly: true, isStaple: true },
    },
    {
      id: "fansi-nu-shaak",
      name: "Fansi nu Shaak",
      overrides: {
        isStaple: true,
        lunchDefaultOk: false,
        dinnerDefaultOk: true,
      },
    },
    {
      id: "vatana-bateta-nu-shaak",
      name: "Vatana Bateta nu Shaak",
      overrides: { isStaple: true },
    },
    {
      id: "tindora-nu-shaak",
      name: "Tindora nu Shaak",
      overrides: { isStaple: true },
    },
    {
      id: "kobi-nu-shaak",
      name: "Kobi nu Shaak (Kobi subji)",
      overrides: { isStaple: true },
    },
  ],
  ["gujarati"],
);

const dalKadhi = defineMeals(
  "dal-kadhi",
  "dal",
  [
    {
      id: "turya-moong-dal",
      name: "Turya Moong Dal",
      overrides: { dalDefaultOk: false },
    },
    {
      id: "gujarati-dal",
      name: "Gujarati Dal",
      overrides: { dalDefaultOk: true, isStaple: true },
    },
    {
      id: "tuvar-dal",
      name: "Tuvar Dal",
      overrides: { dalDefaultOk: true, isStaple: true },
    },
    { id: "gujarati-kadhi", name: "Gujarati Kadhi" },
    { id: "dal-dhokli", name: "Dal Dhokli" },
    { id: "dal-palak", name: "Dal-Palak" },
    { id: "dal-lauki", name: "Dal-Lauki" },
    { id: "dal-with-dudhi", name: "Dal with Dudhi" },
    { id: "panchmel-dal", name: "Panchmel Dal" },
    { id: "khatti-meethi-dal", name: "Khatti-Meethi Dal" },
    { id: "mogar-dal", name: "Mogar Dal" },
  ],
  ["gujarati"],
);

const riceOnePot = defineMeals(
  "rice-one-pot",
  "other",
  [
    { id: "gujarati-khichdi", name: "Gujarati Khichdi" },
    { id: "vaghareli-khichdi", name: "Vaghareli Khichdi" },
    { id: "bajra-khichdi", name: "Bajra Khichdi" },
    { id: "moong-dal-khichdi", name: "Moong Dal Khichdi" },
    { id: "masala-khichdi", name: "Masala Khichdi" },
    { id: "tuvar-dal-khichdi", name: "Tuvar Dal Khichdi" },
    { id: "vegetable-pulao", name: "Vegetable Pulao" },
    {
      id: "gujarati-vagharelo-bhaat",
      name: "Gujarati Vagharelo Bhaat",
      overrides: { excludePlainRice: true },
    },
    { id: "kadhi-khichdi", name: "Kadhi-Khichdi" },
    {
      id: "dal-bhaat-shaak",
      name: "Dal-Bhaat-Shaak",
      overrides: { excludePlainRice: true },
    },
  ],
  ["gujarati"],
);

const rotliBreads = defineMeals(
  "rotli-breads",
  "roti",
  [
    {
      id: "roti-phulka",
      name: "Roti / Phulka",
      overrides: { isStaple: true },
    },
    { id: "bajra-rotla", name: "Bajra Rotla" },
    { id: "jowar-rotla", name: "Jowar Rotla" },
    { id: "bhakri", name: "Bhakri" },
    { id: "methi-thepla", name: "Methi Thepla" },
    { id: "dudhi-thepla", name: "Dudhi Thepla" },
    { id: "masala-thepla", name: "Masala Thepla" },
    { id: "dhebra", name: "Dhebra" },
    { id: "puri-shaak", name: "Puri-Shaak" },
  ],
  ["gujarati"],
);

const junkVariety = defineMeals(
  "junk-variety",
  "junk",
  [
    { id: "pav-bhaji", name: "Pav Bhaji" },
    { id: "frankie-kathi-roll", name: "Frankie / Kathi Roll" },
    { id: "veg-pizza", name: "Veg Pizza" },
    { id: "veg-burger", name: "Veg Burger" },
    { id: "veg-sandwich", name: "Veg Sandwich" },
    { id: "grilled-cheese-sandwich", name: "Grilled Cheese Sandwich" },
    { id: "veg-cheese-toast", name: "Veg Cheese Toast" },
    { id: "masala-pav", name: "Masala Pav" },
    { id: "vada-pav", name: "Vada Pav" },
    { id: "dabeli", name: "Dabeli" },
    { id: "ragda-pattice", name: "Ragda Pattice" },
    {
      id: "chole-bhature",
      name: "Chole Bhature",
      overrides: { avoidAsDefault: true },
    },
    {
      id: "chole-kulche",
      name: "Chole Kulche",
      overrides: { avoidAsDefault: true },
    },
    { id: "aloo-tikki-chaat", name: "Aloo Tikki Chaat" },
    { id: "bhel-puri", name: "Bhel Puri" },
    { id: "sev-puri", name: "Sev Puri" },
    { id: "dahi-puri", name: "Dahi Puri" },
    { id: "pani-puri", name: "Pani Puri" },
    { id: "chinese-bhel", name: "Chinese Bhel" },
    { id: "veg-hakka-noodles", name: "Veg Hakka Noodles" },
    {
      id: "veg-schezwan-fried-rice",
      name: "Veg Schezwan Fried Rice",
      overrides: { excludePlainRice: true },
    },
    {
      id: "manchurian-with-fried-rice",
      name: "Manchurian with Fried Rice",
      overrides: { excludePlainRice: true },
    },
    { id: "veg-momos", name: "Veg Momos" },
    { id: "white-sauce-pasta", name: "White Sauce Pasta" },
    { id: "masala-maggi", name: "Masala Maggi" },
    { id: "veg-quesadilla", name: "Veg Quesadilla" },
    { id: "veg-tacos", name: "Veg Tacos" },
    {
      id: "mexican-rice-and-beans",
      name: "Mexican Rice & Beans",
      overrides: { excludePlainRice: true },
    },
    { id: "cheese-garlic-bread", name: "Cheese Garlic Bread" },
    { id: "veg-schezwan-wrap", name: "Veg Schezwan Wrap" },
    { id: "paneer-kathi-roll", name: "Paneer Kathi Roll" },
    { id: "cheese-burst-sandwich", name: "Cheese Burst Sandwich" },
    { id: "misal-pav", name: "Misal Pav" },
    { id: "cheese-chilli-toast", name: "Cheese Chilli Toast" },
    { id: "dosa-with-sambar-chutney", name: "Dosa with Sambar & Chutney" },
  ],
  ["junk"],
);

export const MEALS: Meal[] = [
  ...gujaratiSabzis,
  ...dalKadhi,
  ...riceOnePot,
  ...rotliBreads,
  ...junkVariety,
];

export const MEAL_BY_ID: ReadonlyMap<string, Meal> = new Map(
  MEALS.map((meal) => [meal.id, meal]),
);
