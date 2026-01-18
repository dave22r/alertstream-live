"""
WebRTC Signaling Server for SafeStream
Handles WebSocket connections for WebRTC peer connection signaling.
Also handles video recording storage and retrieval.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import asyncio
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    gemini_model = genai.GenerativeModel("gemini-2.5-flash-lite")
else:
    print("WARNING: GEMINI_API_KEY not set. AI analysis will be disabled.")
    gemini_model = None

app = FastAPI(title="SafeStream Signaling Server")

# Create recordings directory
RECORDINGS_DIR = Path(__file__).parent / "recordings"
RECORDINGS_DIR.mkdir(exist_ok=True)

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve recordings as static files
app.mount("/recordings", StaticFiles(directory=str(RECORDINGS_DIR)), name="recordings")

@dataclass
class StreamInfo:
    id: str
    started_at: str
    latitude: float
    longitude: float
    notes: str
    is_active: bool = True

@dataclass 
class PastStreamInfo:
    id: str
    started_at: str
    ended_at: str
    latitude: float
    longitude: float
    notes: str
    duration_seconds: float
    video_filename: str
    video_url: str

# Store active streams and their broadcasters
active_streams: Dict[str, StreamInfo] = {}
# Store past streams metadata (in production, use a database)
past_streams: Dict[str, PastStreamInfo] = {}
# WebSocket connections: stream_id -> broadcaster WebSocket
broadcasters: Dict[str, WebSocket] = {}
# WebSocket connections: stream_id -> list of viewer WebSockets
viewers: Dict[str, List[WebSocket]] = {}
# Dashboard connections for stream list updates
dashboard_connections: List[WebSocket] = []


async def broadcast_stream_list():
    """Notify all dashboard connections of stream list changes."""
    stream_list = [asdict(s) for s in active_streams.values()]
    past_stream_list = [asdict(s) for s in past_streams.values()]
    message = json.dumps({
        "type": "stream_list", 
        "streams": stream_list,
        "past_streams": past_stream_list
    })
    
    disconnected = []
    for ws in dashboard_connections:
        try:
            await ws.send_text(message)
        except:
            disconnected.append(ws)
    
    for ws in disconnected:
        dashboard_connections.remove(ws)


@app.get("/")
async def root():
    return {"status": "ok", "service": "SafeStream Signaling Server"}


@app.get("/streams")
async def get_streams():
    """Get list of active streams."""
    return {"streams": [asdict(s) for s in active_streams.values()]}


@app.get("/past-streams")
async def get_past_streams():
    """Get list of past recorded streams."""
    return {"past_streams": [asdict(s) for s in past_streams.values()]}


@app.get("/past-streams/{stream_id}")
async def get_past_stream(stream_id: str):
    """Get a specific past stream."""
    if stream_id not in past_streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    return asdict(past_streams[stream_id])


@app.post("/upload-recording")
async def upload_recording(
    stream_id: str = Form(...),
    started_at: str = Form(...),
    ended_at: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    notes: str = Form(""),
    duration_seconds: float = Form(...),
    video: UploadFile = File(...)
):
    """Upload a recorded stream video."""
    # Generate unique filename
    video_filename = f"{stream_id}_{uuid.uuid4().hex[:8]}.webm"
    video_path = RECORDINGS_DIR / video_filename
    
    # Save the video file
    with open(video_path, "wb") as f:
        content = await video.read()
        f.write(content)
    
    # Store metadata
    past_stream = PastStreamInfo(
        id=stream_id,
        started_at=started_at,
        ended_at=ended_at,
        latitude=latitude,
        longitude=longitude,
        notes=notes,
        duration_seconds=duration_seconds,
        video_filename=video_filename,
        video_url=f"/recordings/{video_filename}"
    )
    past_streams[stream_id] = past_stream
    
    # Notify dashboards
    await broadcast_stream_list()
    
    return {"success": True, "stream": asdict(past_stream)}


@app.post("/analyze-frame")
async def analyze_frame(
    stream_id: str = Form(...),
    latitude: float = Form(0.0),
    longitude: float = Form(0.0),
    file: UploadFile = File(...)
):
    """AI Sentry: Analyze a video frame for threats using Gemini."""
    if not gemini_model:
        return {"threat_detected": False, "error": "Gemini not configured"}
    
    try:
        content = await file.read()
        
        # Prompt to detect phones/people for testing
        prompt = "Look at this image. Is there a firearm, weapon, toy gun, mobile phone, tablet, or human person visible? Answer exactly YES or NO."
        
        # Send to Gemini
        response = gemini_model.generate_content([
            {"mime_type": file.content_type or "image/jpeg", "data": content},
            prompt
        ])
        
        result_text = response.text.strip().upper()
        threat_detected = "YES" in result_text
        
        print(f"[AI Sentry] Stream {stream_id}: Gemini response = '{result_text}', Threat = {threat_detected}")
        
        if threat_detected:
            # Broadcast alert to all dashboards
            alert_message = json.dumps({
                "type": "alert",
                "stream_id": stream_id,
                "latitude": latitude,
                "longitude": longitude,
                "message": "THREAT DETECTED",
                "timestamp": datetime.now().isoformat()
            })
            
            disconnected = []
            for ws in dashboard_connections:
                try:
                    await ws.send_text(alert_message)
                except:
                    disconnected.append(ws)
            for ws in disconnected:
                dashboard_connections.remove(ws)
        
        return {"threat_detected": threat_detected}
    
    except Exception as e:
        print(f"[AI Sentry] Error: {e}")
        return {"threat_detected": False, "error": str(e)}


@app.delete("/past-streams/{stream_id}")
async def delete_past_stream(stream_id: str):
    """Delete a past stream recording."""
    if stream_id not in past_streams:
        raise HTTPException(status_code=404, detail="Stream not found")
    
    # Delete the video file
    video_path = RECORDINGS_DIR / past_streams[stream_id].video_filename
    if video_path.exists():
        video_path.unlink()
    
    # Remove from metadata
    del past_streams[stream_id]
    
    # Notify dashboards
    await broadcast_stream_list()
    
    return {"success": True}


@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket for dashboard to receive stream list updates."""
    await websocket.accept()
    dashboard_connections.append(websocket)
    
    # Send current stream list including past streams
    stream_list = [asdict(s) for s in active_streams.values()]
    past_stream_list = [asdict(s) for s in past_streams.values()]
    await websocket.send_text(json.dumps({
        "type": "stream_list", 
        "streams": stream_list,
        "past_streams": past_stream_list
    }))
    
    try:
        while True:
            # Keep connection alive, handle any incoming messages
            data = await websocket.receive_text()
            # Dashboard might send heartbeat or other messages
    except WebSocketDisconnect:
        if websocket in dashboard_connections:
            dashboard_connections.remove(websocket)


@app.websocket("/ws/broadcast/{stream_id}")
async def broadcast_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket for streamer to broadcast."""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "start_stream":
                # Register the stream
                stream_info = StreamInfo(
                    id=stream_id,
                    started_at=datetime.now().isoformat(),
                    latitude=message.get("latitude", 0),
                    longitude=message.get("longitude", 0),
                    notes=message.get("notes", ""),
                )
                active_streams[stream_id] = stream_info
                broadcasters[stream_id] = websocket
                viewers[stream_id] = []
                
                await websocket.send_text(json.dumps({"type": "stream_started", "stream_id": stream_id}))
                await broadcast_stream_list()
                
            elif message["type"] == "update_location":
                if stream_id in active_streams:
                    active_streams[stream_id].latitude = message.get("latitude", 0)
                    active_streams[stream_id].longitude = message.get("longitude", 0)
                    await broadcast_stream_list()
                    
            elif message["type"] == "offer":
                # Forward offer to specific viewer
                viewer_id = message.get("viewer_id")
                if stream_id in viewers:
                    for viewer_ws in viewers[stream_id]:
                        try:
                            await viewer_ws.send_text(json.dumps({
                                "type": "offer",
                                "sdp": message["sdp"],
                                "stream_id": stream_id
                            }))
                        except:
                            pass
                            
            elif message["type"] == "ice_candidate":
                # Forward ICE candidate to viewers
                if stream_id in viewers:
                    for viewer_ws in viewers[stream_id]:
                        try:
                            await viewer_ws.send_text(json.dumps({
                                "type": "ice_candidate",
                                "candidate": message["candidate"],
                                "stream_id": stream_id
                            }))
                        except:
                            pass
                            
            elif message["type"] == "stop_stream":
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        # Clean up
        if stream_id in active_streams:
            del active_streams[stream_id]
        if stream_id in broadcasters:
            del broadcasters[stream_id]
        if stream_id in viewers:
            # Notify viewers stream ended
            for viewer_ws in viewers[stream_id]:
                try:
                    await viewer_ws.send_text(json.dumps({"type": "stream_ended", "stream_id": stream_id}))
                except:
                    pass
            del viewers[stream_id]
        await broadcast_stream_list()


@app.websocket("/ws/view/{stream_id}")
async def view_websocket(websocket: WebSocket, stream_id: str):
    """WebSocket for viewer to receive stream."""
    await websocket.accept()
    
    if stream_id not in active_streams:
        await websocket.send_text(json.dumps({"type": "error", "message": "Stream not found"}))
        await websocket.close()
        return
    
    if stream_id not in viewers:
        viewers[stream_id] = []
    viewers[stream_id].append(websocket)
    
    # Request offer from broadcaster
    if stream_id in broadcasters:
        try:
            await broadcasters[stream_id].send_text(json.dumps({
                "type": "viewer_joined",
                "viewer_id": id(websocket)
            }))
        except:
            pass
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "answer":
                # Forward answer to broadcaster
                if stream_id in broadcasters:
                    await broadcasters[stream_id].send_text(json.dumps({
                        "type": "answer",
                        "sdp": message["sdp"],
                        "viewer_id": id(websocket)
                    }))
                    
            elif message["type"] == "ice_candidate":
                # Forward ICE candidate to broadcaster
                if stream_id in broadcasters:
                    await broadcasters[stream_id].send_text(json.dumps({
                        "type": "ice_candidate",
                        "candidate": message["candidate"],
                        "viewer_id": id(websocket)
                    }))
                    
    except WebSocketDisconnect:
        pass
    finally:
        if stream_id in viewers and websocket in viewers[stream_id]:
            viewers[stream_id].remove(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
