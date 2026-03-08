export const DEFAULT_AVATARS = [
  {
    id: "avatar_1",
    label: "Cool Guy",
    gradient: "from-blue-500 to-cyan-400",
    emoji: "\u{1F60E}",
    bg: "#3B82F6",
  },
  {
    id: "avatar_2",
    label: "Scholar",
    gradient: "from-violet-500 to-purple-400",
    emoji: "\u{1F9D1}\u200D\u{1F393}",
    bg: "#8B5CF6",
  },
  {
    id: "avatar_3",
    label: "Scientist",
    gradient: "from-emerald-500 to-teal-400",
    emoji: "\u{1F9D1}\u200D\u{1F52C}",
    bg: "#10B981",
  },
  {
    id: "avatar_4",
    label: "Artist",
    gradient: "from-pink-500 to-rose-400",
    emoji: "\u{1F9D1}\u200D\u{1F3A8}",
    bg: "#EC4899",
  },
  {
    id: "avatar_5",
    label: "Astronaut",
    gradient: "from-amber-500 to-orange-400",
    emoji: "\u{1F9D1}\u200D\u{1F680}",
    bg: "#F59E0B",
  },
];

export const getAvatarById = (id: string) =>
  DEFAULT_AVATARS.find((a) => a.id === id) || null;
