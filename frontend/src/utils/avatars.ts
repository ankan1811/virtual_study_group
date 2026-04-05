import { Glasses, GraduationCap, FlaskConical, Palette, Rocket } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Avatar {
  id: string;
  label: string;
  gradient: string;
  Icon: LucideIcon;
  bg: string;
}

export const DEFAULT_AVATARS: Avatar[] = [
  {
    id: "avatar_1",
    label: "Cool Guy",
    gradient: "from-blue-500 to-cyan-400",
    Icon: Glasses,
    bg: "#3B82F6",
  },
  {
    id: "avatar_2",
    label: "Scholar",
    gradient: "from-violet-500 to-purple-400",
    Icon: GraduationCap,
    bg: "#8B5CF6",
  },
  {
    id: "avatar_3",
    label: "Scientist",
    gradient: "from-emerald-500 to-teal-400",
    Icon: FlaskConical,
    bg: "#10B981",
  },
  {
    id: "avatar_4",
    label: "Artist",
    gradient: "from-pink-500 to-rose-400",
    Icon: Palette,
    bg: "#EC4899",
  },
  {
    id: "avatar_5",
    label: "Astronaut",
    gradient: "from-amber-500 to-orange-400",
    Icon: Rocket,
    bg: "#F59E0B",
  },
];

export const getAvatarById = (id: string) =>
  DEFAULT_AVATARS.find((a) => a.id === id) || null;
