export interface RadioChannel {
  id: string;
  name: string;
  genre: string;
  description: string;
  streamUrl: string;
  emoji: string;
  color: string;
}

export const radioChannels: RadioChannel[] = [
  {
    id: "groove-salad",
    name: "Groove Salad",
    genre: "Ambient / Chill",
    description:
      "A nicely chilled plate of ambient/downtempo beats and grooves.",
    streamUrl: "https://ice1.somafm.com/groovesalad-256-mp3",
    emoji: "\u{1F33F}",
    color: "from-emerald-500 to-teal-600",
  },
  {
    id: "drone-zone",
    name: "Drone Zone",
    genre: "Deep Ambient",
    description:
      "Served best chilled, safe with most medications. Atmospheric textures with minimal beats.",
    streamUrl: "https://ice1.somafm.com/dronezone-256-mp3",
    emoji: "\u{1F30C}",
    color: "from-indigo-500 to-purple-700",
  },
  {
    id: "lounge",
    name: "Lush",
    genre: "Lounge / Electronica",
    description:
      "Sensuous and mellow vocals, mostly female, with loads of atmosphere.",
    streamUrl: "https://ice1.somafm.com/lush-128-mp3",
    emoji: "\u{1F378}",
    color: "from-pink-500 to-rose-600",
  },
  {
    id: "space-station",
    name: "Space Station Soma",
    genre: "Space / Ambient",
    description:
      "Spaced-out ambient and mid-tempo electronic music for the headphone crowd.",
    streamUrl: "https://ice1.somafm.com/spacestation-128-mp3",
    emoji: "\u{1F680}",
    color: "from-cyan-500 to-blue-700",
  },
  {
    id: "defcon-radio",
    name: "DEF CON Radio",
    genre: "Electronic / Hacker",
    description:
      "Music for Hackers. Live from DEF CON and year-round electronic overload.",
    streamUrl: "https://ice1.somafm.com/defcon-256-mp3",
    emoji: "\u{1F4BB}",
    color: "from-green-500 to-emerald-700",
  },
  {
    id: "boot-liquor",
    name: "Boot Liquor",
    genre: "Americana / Country",
    description:
      "Americana roots music for Cowhands, Cowpokes and Cowtippers.",
    streamUrl: "https://ice1.somafm.com/bootliquor-320-mp3",
    emoji: "\u{1F3B8}",
    color: "from-amber-500 to-orange-700",
  },
  {
    id: "fluid",
    name: "Fluid",
    genre: "Liquid DnB",
    description:
      "Drenched in sweet liquid drum and bass goodness. Intelligent ones.",
    streamUrl: "https://ice1.somafm.com/fluid-128-mp3",
    emoji: "\u{1F30A}",
    color: "from-violet-500 to-fuchsia-700",
  },
  {
    id: "groove-salad-classic",
    name: "Groove Salad Classic",
    genre: "Ambient / Downtempo",
    description:
      "The classic early sounds of Groove Salad from the first decade.",
    streamUrl: "https://ice1.somafm.com/gsclassic-128-mp3",
    emoji: "\u{1F343}",
    color: "from-lime-500 to-green-600",
  },
];
