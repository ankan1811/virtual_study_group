import {
  createContext,
  useContext,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { radioChannels, type RadioChannel } from "../data/radioChannels";

interface RadioState {
  currentChannel: RadioChannel | null;
  isPlaying: boolean;
  volume: number;
  isMiniPlayerEnabled: boolean;
}

type RadioAction =
  | { type: "PLAY_CHANNEL"; channel: RadioChannel }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "STOP" }
  | { type: "SET_VOLUME"; volume: number }
  | { type: "TOGGLE_MINI_PLAYER" }
  | { type: "RESTORE"; state: Partial<RadioState> };

function radioReducer(state: RadioState, action: RadioAction): RadioState {
  switch (action.type) {
    case "PLAY_CHANNEL":
      return {
        ...state,
        currentChannel: action.channel,
        isPlaying: true,
      };
    case "PAUSE":
      return { ...state, isPlaying: false };
    case "RESUME":
      return { ...state, isPlaying: true };
    case "STOP":
      return { ...state, currentChannel: null, isPlaying: false };
    case "SET_VOLUME":
      return { ...state, volume: action.volume };
    case "TOGGLE_MINI_PLAYER":
      return { ...state, isMiniPlayerEnabled: !state.isMiniPlayerEnabled };
    case "RESTORE":
      return { ...state, ...action.state };
    default:
      return state;
  }
}

const initialState: RadioState = {
  currentChannel: null,
  isPlaying: false,
  volume: 0.7,
  isMiniPlayerEnabled: true,
};

interface RadioContextValue {
  state: RadioState;
  analyserRef: React.RefObject<AnalyserNode | null>;
  playChannel: (channel: RadioChannel) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleMiniPlayer: () => void;
}

const RadioContext = createContext<RadioContextValue | null>(null);

const STORAGE_KEY = "study-radio-state";

function loadSavedState(): Partial<RadioState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const saved = JSON.parse(raw);
    const result: Partial<RadioState> = {};
    if (typeof saved.volume === "number") result.volume = saved.volume;
    if (typeof saved.isMiniPlayerEnabled === "boolean")
      result.isMiniPlayerEnabled = saved.isMiniPlayerEnabled;
    if (saved.channelId) {
      const ch = radioChannels.find((c) => c.id === saved.channelId);
      if (ch) result.currentChannel = ch;
    }
    return result;
  } catch {
    return {};
  }
}

function saveState(state: RadioState) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: state.volume,
        isMiniPlayerEnabled: state.isMiniPlayerEnabled,
        channelId: state.currentChannel?.id ?? null,
      })
    );
  } catch {}
}

export function RadioProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(radioReducer, initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const restoredRef = useRef(false);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioContextRef.current?.close();
    };
  }, []);

  // Restore saved state on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const saved = loadSavedState();
    if (Object.keys(saved).length > 0) {
      dispatch({ type: "RESTORE", state: { ...saved, isPlaying: false } });
    }
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.volume;
  }, [state.volume]);

  // Persist state
  useEffect(() => {
    saveState(state);
  }, [state]);

  const initAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;

    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, []);

  const playChannel = useCallback(
    (channel: RadioChannel) => {
      const audio = audioRef.current;
      if (!audio) return;

      initAudioContext();

      if (audioContextRef.current?.state === "suspended") {
        audioContextRef.current.resume();
      }

      audio.src = channel.streamUrl;
      audio.play().catch(() => {});
      dispatch({ type: "PLAY_CHANNEL", channel });
    },
    [initAudioContext]
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    dispatch({ type: "PAUSE" });
  }, []);

  const resume = useCallback(() => {
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
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

  const toggleMiniPlayer = useCallback(() => {
    dispatch({ type: "TOGGLE_MINI_PLAYER" });
  }, []);

  return (
    <RadioContext.Provider
      value={{
        state,
        analyserRef,
        playChannel,
        pause,
        resume,
        stop,
        setVolume,
        toggleMiniPlayer,
      }}
    >
      {children}
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);
  if (!ctx) throw new Error("useRadio must be used within RadioProvider");
  return ctx;
}
