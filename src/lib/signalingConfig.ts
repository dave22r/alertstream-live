// Auto-detect signaling server based on environment
const getSignalingServer = () => {
  if (import.meta.env.VITE_SIGNALING_SERVER) {
    return import.meta.env.VITE_SIGNALING_SERVER;
  }
  
  // In production, use the Render backend
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return "wss://alertstream-live-backend.onrender.com";
  }
  
  return "ws://localhost:8000";
};

const SIGNALING_SERVER = getSignalingServer();
const HTTP_BASE = SIGNALING_SERVER.replace("ws://", "http://").replace("wss://", "https://");

export const signalingConfig = {
  dashboardWs: `${SIGNALING_SERVER}/ws/dashboard`,
  broadcastWs: (streamId: string) => `${SIGNALING_SERVER}/ws/broadcast/${streamId}`,
  viewWs: (streamId: string) => `${SIGNALING_SERVER}/ws/view/${streamId}`,
  httpBase: HTTP_BASE,
  uploadUrl: `${HTTP_BASE}/upload-recording`,
  pastStreamsUrl: `${HTTP_BASE}/past-streams`,
  recordingsBaseUrl: `${HTTP_BASE}/recordings`,
};

export const rtcConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    // TURN servers for production (relay when direct P2P fails)
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8dd65ccdba2df346a1b9eac",
      credential: "VrjTnBB0+qCeeVTn",
    },
    {
      urls: "turn:a.relay.metered.ca:443",
      username: "e8dd65ccdba2df346a1b9eac",
      credential: "VrjTnBB0+qCeeVTn",
    },
    {
      urls: "turn:a.relay.metered.ca:443?transport=tcp",
      username: "e8dd65ccdba2df346a1b9eac",
      credential: "VrjTnBB0+qCeeVTn",
    },
  ],
};
