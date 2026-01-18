// Auto-detect signaling server based on environment
const getSignalingServer = () => {
  // If explicitly set via env var, use it
  if (import.meta.env.VITE_SIGNALING_SERVER) {
    return import.meta.env.VITE_SIGNALING_SERVER;
  }
  
  // In production (not localhost), use the Render backend
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    return "wss://alertstream-live-backend.onrender.com";
  }
  
  // Default to localhost for development
  return "ws://localhost:8000";
};

const SIGNALING_SERVER = getSignalingServer();
const HTTP_BASE = SIGNALING_SERVER.replace("ws://", "http://").replace("wss://", "https://");

console.log("[Config] Signaling server:", SIGNALING_SERVER);

export const signalingConfig = {
  dashboardWs: `${SIGNALING_SERVER}/ws/dashboard`,
  broadcastWs: (streamId: string) => `${SIGNALING_SERVER}/ws/broadcast/${streamId}`,
  viewWs: (streamId: string) => `${SIGNALING_SERVER}/ws/view/${streamId}`,
  httpBase: HTTP_BASE,
  uploadUrl: `${HTTP_BASE}/upload-recording`,
  pastStreamsUrl: `${HTTP_BASE}/past-streams`,
  recordingsBaseUrl: `${HTTP_BASE}/recordings`,
};

// Enhanced RTC configuration with TURN fallback for production NAT traversal
// STUN servers help discover public IP, but TURN provides relay when direct connection fails
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (free, reliable)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Metered TURN servers (free tier - more reliable than OpenRelay)
    {
      urls: "turn:a.relay.metered.ca:80",
      username: "e8dd65ccdba2df346a1b9eac",
      credential: "VrjTnBB0+qCeeVTn",
    },
    {
      urls: "turn:a.relay.metered.ca:80?transport=tcp",
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
  iceCandidatePoolSize: 10,
  bundlePolicy: "max-bundle",
  iceTransportPolicy: "all",
};
