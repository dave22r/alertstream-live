const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8080";
const HTTP_BASE = SIGNALING_SERVER.replace("ws://", "http://").replace("wss://", "https://");

export const signalingConfig = {
  dashboardWs: `${SIGNALING_SERVER}/ws/dashboard`,
  broadcastWs: (streamId: string) => `${SIGNALING_SERVER}/ws/broadcast/${streamId}`,
  viewWs: (streamId: string) => `${SIGNALING_SERVER}/ws/view/${streamId}`,
  httpBase: HTTP_BASE,
  uploadUrl: `${HTTP_BASE}/upload-recording`,
  pastStreamsUrl: `${HTTP_BASE}/past-streams`,
  recordingsBaseUrl: `${HTTP_BASE}/recordings`,
  analyzeFrameUrl: `${HTTP_BASE}/analyze-frame`,
};

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};
