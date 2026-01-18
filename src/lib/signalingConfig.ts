const SIGNALING_SERVER = import.meta.env.VITE_SIGNALING_SERVER || "ws://localhost:8000";
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

// Enhanced RTC configuration with TURN fallback for production NAT traversal
// STUN servers help discover public IP, but TURN provides relay when direct connection fails
export const rtcConfig: RTCConfiguration = {
  iceServers: [
    // Google STUN servers (free, reliable for simple NAT)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
<<<<<<< Updated upstream
    // OpenRelay (Free Tier) - reliable for demos
=======
    { urls: "stun:stun2.l.google.com:19302" },
    // OpenRelay TURN servers (free public TURN - for production use dedicated TURN)
    // These provide relay fallback when direct P2P connection fails (symmetric NAT, firewalls)
>>>>>>> Stashed changes
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  // More aggressive ICE gathering for faster connection
  iceCandidatePoolSize: 10,
  // Bundle all media on one connection
  bundlePolicy: "max-bundle",
  // Use all available candidates
  iceTransportPolicy: "all",
};
