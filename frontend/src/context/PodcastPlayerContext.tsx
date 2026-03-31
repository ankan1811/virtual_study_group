import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRadio } from "./RadioContext";

export interface PodcastTrack {
  id: string;
  title: string;
  publisher: string;
  thumbnail: string;
  audioUrl: string;
  durationSec: number;
}

interface PodcastPlayerState {
  currentTrack: PodcastTrack | null;
  isPlaying: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
}

type PodcastPlayerAction =
  | { type: "PLAY_TRACK"; track: PodcastTrack }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "SET_CURRENT_TIME"; time: number }
  | { type: "SET_DURATION"; duration: number }
  | { type: "SET_LOADING"; loading: boolean };

function reducer(
  state: PodcastPlayerState,
  action: PodcastPlayerAction
): PodcastPlayerState {
  switch (action.type) {
    case "PLAY_TRACK":
      return {
        ...state,
        currentTrack: action.track,
        isPlaying: true,
        currentTime: 0,
        duration: action.track.durationSec || 0,
        isLoading: true,
      };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "RESUME":
      return { ...state, isPlaying: true };
    case "STOP":
      return {
        ...state,
        currentTrack: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isLoading: false,
      };
    case "SET_VOLUME":
      return { ...state, volume: action.volume };
    case "SET_CURRENT_TIME":
      return { ...state, currentTime: action.time };
    case "SET_DURATION":
      return { ...state, duration: action.duration };
    case "SET_LOADING":
      return { ...state, isLoading: action.loading };
    default:
      return state;
  }
}

const initialState: PodcastPlayerState = {
  currentTrack: null,
  isPlaying: false,
  volume: 0.7,
  currentTime: 0,
  duration: 0,
  isLoading: false,
};

interface PodcastPlayerContextValue {
  state: PodcastPlayerState;
  playTrack: (track: PodcastTrack) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  seekTo: (time: number) => void;
}

const PodcastPlayerContext = createContext<PodcastPlayerContextValue | null>(
  null
);

const STORAGE_KEY = "study-podcast-player";

export function PodcastPlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const radio = useRadio();

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    const onTimeUpdate = () =>
      dispatch({ type: "SET_CURRENT_TIME", time: audio.currentTime });
    const onLoadedMetadata = () =>
      dispatch({ type: "SET_DURATION", duration: audio.duration });
    const onEnded = () => dispatch({ type: "STOP" });
    const onWaiting = () => dispatch({ type: "SET_LOADING", loading: true });
    const onCanPlay = () => dispatch({ type: "SET_LOADING", loading: false });

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("canplay", onCanPlay);

    // Restore volume
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.volume === "number") {
          dispatch({ type: "SET_VOLUME", volume: saved.volume });
          audio.volume = saved.volume;
        }
      }
    } catch {}

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.volume;
  }, [state.volume]);

  // Persist volume
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: state.volume }));
    } catch {}
  }, [state.volume]);

  const playTrack = useCallback(
    (track: PodcastTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      // Stop radio if playing
      radio.stop();

      audio.src = track.audioUrl;
      audio.play().catch(() => {});
      dispatch({ type: "PLAY_TRACK", track });
    },
    [radio]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
    dispatch({ type: "RESUME" });
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    dispatch({ type: "STOP" });
  }, []);

  const setVolume = useCallback((v: number) => {
    dispatch({ type: "SET_VOLUME", volume: Math.max(0, Math.min(1, v)) });
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      dispatch({ type: "SET_CURRENT_TIME", time });
    }
  }, []);

  return (
    <PodcastPlayerContext.Provider
      value={{ state, playTrack, pause, resume, stop, setVolume, seekTo }}
    >
      {children}
    </PodcastPlayerContext.Provider>
  );
}

export function usePodcastPlayer() {
  const ctx = useContext(PodcastPlayerContext);
  if (!ctx)
    throw new Error(
      "usePodcastPlayer must be used within PodcastPlayerProvider"
    );
  return ctx;
}
