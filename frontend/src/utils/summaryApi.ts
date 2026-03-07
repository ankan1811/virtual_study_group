import axios from "axios";

const API = import.meta.env.VITE_API_URL as string;

interface SaveParams {
  type: "room" | "dm" | "whiteboard";
  contextId: string;
  contextLabel?: string;
  title?: string;
}

export async function generateAndSaveSummary(
  genEndpoint: string,
  genPayload: Record<string, unknown>,
  saveParams: SaveParams
): Promise<{ summary: string; url?: string }> {
  const token = localStorage.getItem("token");
  const headers = { Authorization: token || "" };

  const genRes = await axios.post(`${API}${genEndpoint}`, genPayload, {
    headers,
  });
  const summary: string = genRes.data.summary || genRes.data.explanation;

  const saveRes = await axios.post(
    `${API}/ai/save-summary`,
    {
      summary,
      roomId: saveParams.contextId,
      ...saveParams,
    },
    { headers }
  );

  return { summary, url: saveRes.data.url };
}
