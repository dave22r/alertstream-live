import { StreamData } from "@/components/StreamCard";

const STORAGE_KEY = "alertstream_active_streams";

export const streamStore = {
  getStreams: (): StreamData[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return parsed.map((s: any) => ({
        ...s,
        startedAt: new Date(s.startedAt as string)
      }));
    } catch (e) {
      console.error("Failed to parse streams", e);
      return [];
    }
  },

  addStream: (stream: StreamData) => {
    const streams = streamStore.getStreams();
    // Prevent duplicates
    if (streams.some(s => s.id === stream.id)) return;
    
    const newStreams = [...streams, stream];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStreams));
    window.dispatchEvent(new Event("stream-update"));
  },

  removeStream: (id: string) => {
    const streams = streamStore.getStreams();
    const newStreams = streams.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newStreams));
    window.dispatchEvent(new Event("stream-update"));
  },
  
  updateStreamLocation: (id: string, lat: number, lng: number) => {
      const streams = streamStore.getStreams();
      const newStreams = streams.map(s => s.id === id ? { ...s, latitude: lat, longitude: lng } : s);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newStreams));
      window.dispatchEvent(new Event("stream-update"));
  },
  
  clearAll: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("stream-update"));
  }
};
