"""
WebRTC Signaling Server for SafeStream
Handles WebSocket connections for WebRTC peer connection signaling.
Also handles video recording storage and retrieval.
Includes AI Sentry for threat detection using Gemini.
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
import base64
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Gemini - with graceful fallback if not available
genai = None
model = None
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

if GEMINI_API_KEY:
    try:
        from google import genai as genai_module
        client = genai_module.Client(api_key=GEMINI_API_KEY)
        genai = genai_module
        model = client.models
        print("[AI Sentry] Gemini AI initialized successfully")
    except ImportError:
        print("[AI Sentry] WARNING: google-genai package not installed")
    except Exception as e:
        print(f"[AI Sentry] WARNING: Failed to initialize Gemini: {e}")

if not model and OPENROUTER_API_KEY:
    print("[AI Sentry] OpenRouter API key found - will use as fallback")
elif not model and not OPENROUTER_API_KEY:
    print("[AI Sentry] No AI provider configured - AI features disabled")

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


async def broadcast_alert(stream_id: str, latitude: float, longitude: float, threat_type: str):
    """Send threat alert to all dashboard connections."""
    print(f"[AI Sentry] Broadcasting alert: {threat_type} at ({latitude}, {longitude})")
    
    message = json.dumps({
        "type": "alert",
        "stream_id": stream_id,
        "latitude": latitude,
        "longitude": longitude,
        "threat_type": threat_type,
        "timestamp": datetime.now().isoformat()
    })
    
    disconnected = []
    for ws in dashboard_connections:
        try:
            await ws.send_text(message)
            print(f"[AI Sentry] Alert sent to dashboard connection")
        except Exception as e:
            print(f"[AI Sentry] Failed to send alert: {e}")
            disconnected.append(ws)
    
    for ws in disconnected:
        dashboard_connections.remove(ws)


async def analyze_with_openrouter(image_data: bytes, content_type: str) -> str:
    """Analyze image using OpenRouter API with Gemini model."""
    import httpx
    
    image_base64 = base64.b64encode(image_data).decode('utf-8')
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "google/gemini-2.0-flash-exp:free",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze this image. List ALL that are visible: 1) GUN - NERF toy blaster (teal/slate blue body, orange NERF logo, TRIO ELITE 2.0, three orange barrels), 2) PHONE - mobile phone/smartphone, 3) SUSPECT - CRITICAL: Person MUST be wearing a GREY colored hoodie/jacket. If clothing is NOT grey (black, blue, white, any other color) then DO NOT mark as SUSPECT. Also requires transparent/clear rectangular glasses. Do NOT classify anyone as SUSPECT unless their hoodie/jacket is clearly GREY colored. Reply with comma-separated list (e.g. 'GUN,SUSPECT' or 'PHONE' or 'NONE' if nothing detected)."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{content_type or 'image/jpeg'};base64,{image_base64}"
                                }
                            }
                        ]
                    }
                ]
            },
            timeout=30.0
        )
        
        if response.status_code == 200:
            result = response.json()
            return result['choices'][0]['message']['content'].strip().upper()
        else:
            raise Exception(f"OpenRouter API error: {response.status_code} - {response.text}")


@app.post("/analyze-frame")
async def analyze_frame(
    stream_id: str = Form(...),
    latitude: float = Form(0),
    longitude: float = Form(0),
    frame: UploadFile = File(...)
):
    """Analyze a video frame for threats using Gemini AI (with OpenRouter fallback)."""
    print(f"[AI Sentry] Received frame analysis request for stream: {stream_id}")
    
    if not model and not OPENROUTER_API_KEY:
        print("[AI Sentry] ERROR: No AI provider available")
        raise HTTPException(status_code=503, detail="No AI provider configured")
    
    try:
        # Read the image data
        image_data = await frame.read()
        print(f"[AI Sentry] Frame size: {len(image_data)} bytes, type: {frame.content_type}")
        
        answer = None
        
        # Try Gemini first
        if model:
            try:
                print("[AI Sentry] Sending to Gemini for analysis...")
                response = model.generate_content(
                    model='gemini-2.0-flash-exp',
                    contents={
                        'parts': [
                            {'text': 'Analyze this image. List ALL that are visible: 1) GUN - NERF toy blaster (teal/slate blue body, orange NERF logo, TRIO ELITE 2.0, three orange barrels), 2) PHONE - mobile phone/smartphone, 3) SUSPECT - CRITICAL: Person MUST be wearing a GREY colored hoodie/jacket. If clothing is NOT grey (black, blue, white, any other color) then DO NOT mark as SUSPECT. Also requires transparent/clear rectangular glasses. Do NOT classify anyone as SUSPECT unless their hoodie/jacket is clearly GREY colored. Reply with comma-separated list (e.g. GUN,SUSPECT or PHONE or NONE if nothing detected).'},
                            {
                                'inline_data': {
                                    'mime_type': frame.content_type or 'image/jpeg',
                                    'data': base64.b64encode(image_data).decode('utf-8')
                                }
                            }
                        ]
                    }
                )
                answer = response.text.strip().upper()
                print(f"[AI Sentry] Gemini response: '{answer}'")
            except Exception as e:
                print(f"[AI Sentry] Gemini failed: {e}, trying OpenRouter fallback...")
        
        # Fallback to OpenRouter
        if answer is None and OPENROUTER_API_KEY:
            print("[AI Sentry] Using OpenRouter fallback...")
            answer = await analyze_with_openrouter(image_data, frame.content_type)
            print(f"[AI Sentry] OpenRouter response: '{answer}'")
        
        if answer is None:
            raise Exception("All AI providers failed")
        
        # Determine what was detected (can be multiple)
        gun_detected = "GUN" in answer
        phone_detected = "PHONE" in answer
        suspect_detected = "SUSPECT" in answer
        threat_detected = gun_detected or phone_detected or suspect_detected
        
        # Build list of detected items
        detections = []
        detection_types = []
        if suspect_detected:
            detections.append("Suspect Detected")
            detection_types.append("suspect")
        if gun_detected:
            detections.append("NERF Toy Blaster Detected")
            detection_types.append("gun")
        if phone_detected:
            detections.append("Mobile Phone Detected")
            detection_types.append("phone")
        
        # Combined alert message
        alert_message = " + ".join(detections) if detections else None
        
        print(f"[AI Sentry] Detection result: gun={gun_detected}, phone={phone_detected}, suspect={suspect_detected}")
        
        if threat_detected and alert_message:
            # Send alert to all dashboards
            print(f"[AI Sentry] Broadcasting alert: {alert_message} to {len(dashboard_connections)} dashboard connections")
            await broadcast_alert(stream_id, latitude, longitude, alert_message)
        
        return {
            "success": True,
            "threat_detected": threat_detected,
            "detection_types": detection_types,
            "analysis": answer,
            "stream_id": stream_id
        }
        
    except Exception as e:
        print(f"[AI Sentry] Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


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
