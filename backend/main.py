"""
WebRTC Signaling Server for SafeStream
Handles WebSocket connections for WebRTC peer connection signaling.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List, Optional
from dataclasses import dataclass, field, asdict
from datetime import datetime
import json
import asyncio

app = FastAPI(title="SafeStream Signaling Server")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class StreamInfo:
    id: str
    started_at: str
    latitude: float
    longitude: float
    notes: str
    is_active: bool = True

# Store active streams and their broadcasters
active_streams: Dict[str, StreamInfo] = {}
# WebSocket connections: stream_id -> broadcaster WebSocket
broadcasters: Dict[str, WebSocket] = {}
# WebSocket connections: stream_id -> list of viewer WebSockets
viewers: Dict[str, List[WebSocket]] = {}
# Dashboard connections for stream list updates
dashboard_connections: List[WebSocket] = []


async def broadcast_stream_list():
    """Notify all dashboard connections of stream list changes."""
    stream_list = [asdict(s) for s in active_streams.values()]
    message = json.dumps({"type": "stream_list", "streams": stream_list})
    
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


@app.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket for dashboard to receive stream list updates."""
    await websocket.accept()
    dashboard_connections.append(websocket)
    
    # Send current stream list
    stream_list = [asdict(s) for s in active_streams.values()]
    await websocket.send_text(json.dumps({"type": "stream_list", "streams": stream_list}))
    
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
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
