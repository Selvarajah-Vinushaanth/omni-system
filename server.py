from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import json
from typing import Dict, List

app = FastAPI()

# Allow React app or any client to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Connection Manager ---
class ConnectionManager:
    def __init__(self):
        # Active connections: device_id -> WebSocket
        self.active_agents: Dict[str, WebSocket] = {}
        # Dashboard connections (React apps)
        self.active_dashboards: List[WebSocket] = []

    async def connect_agent(self, websocket: WebSocket, device_id: str):
        # Accept is done in endpoint, not here
        self.active_agents[device_id] = websocket
        print(f"Agent connected: {device_id}")
        await self.broadcast_agent_list()

    async def connect_dashboard(self, websocket: WebSocket):
        await websocket.accept()  # Dashboards can accept here
        self.active_dashboards.append(websocket)
        print("Dashboard connected")

    def disconnect_agent(self, device_id: str):
        if device_id in self.active_agents:
            del self.active_agents[device_id]
            print(f"Agent disconnected: {device_id}")

    def disconnect_dashboard(self, websocket: WebSocket):
        if websocket in self.active_dashboards:
            self.active_dashboards.remove(websocket)

    async def broadcast_to_dashboards(self, message: dict):
        """Send live stats to all open web dashboards"""
        for connection in self.active_dashboards:
            try:
                await connection.send_json(message)
            except:
                pass

    async def send_command(self, device_id: str, command: str):
        """Send a shell command to a specific agent"""
        if device_id in self.active_agents:
            ws = self.active_agents[device_id]
            try:
                await ws.send_json({"type": "execute", "cmd": command})
                print(f"Command sent to {device_id}: {command}")
                return True
            except Exception as e:
                print(f"Failed to send command to {device_id}: {e}")
                return False
        else:
            print(f"Device {device_id} not found in active agents: {list(self.active_agents.keys())}")
            return False

    async def send_command_with_id(self, device_id: str, command: str, request_id: int):
        """Send a shell command with request ID tracking"""
        if device_id in self.active_agents:
            ws = self.active_agents[device_id]
            try:
                await ws.send_json({
                    "type": "execute", 
                    "cmd": command, 
                    "request_id": request_id
                })
                print(f"Command sent to {device_id}: {command} (ID: {request_id})")
                return True
            except Exception as e:
                print(f"Failed to send command to {device_id}: {e}")
                return False
        else:
            print(f"Device {device_id} not found in active agents: {list(self.active_agents.keys())}")
            return False

    async def send_direct_request(self, device_id: str, request_data: dict):
        """Send a direct request to a specific agent"""
        if device_id in self.active_agents:
            ws = self.active_agents[device_id]
            try:
                await ws.send_json(request_data)
                print(f"Direct request sent to {device_id}: {request_data.get('type')}")
                return True
            except Exception as e:
                print(f"Failed to send direct request to {device_id}: {e}")
                return False
        else:
            print(f"Device {device_id} not found for direct request")
            return False

    async def broadcast_agent_list(self):
        """Update dashboards with list of currently connected devices"""
        agents_online = list(self.active_agents.keys())
        await self.broadcast_to_dashboards({
            "type": "device_list",
            "devices": agents_online
        })

manager = ConnectionManager()

# --- WebSocket endpoints ---

@app.websocket("/ws/agent")
async def websocket_agent_endpoint(websocket: WebSocket):
    device_id = None
    try:
        # Accept the WebSocket connection here
        await websocket.accept()

        # Receive initial handshake from agent
        data = await websocket.receive_text()
        init_data = json.loads(data)
        
        # Handle registration message from agent
        if init_data.get("type") == "register":
            device_id = init_data.get("device_id", "unknown")
            print(f"Agent {device_id} registered with platform: {init_data.get('platform', 'unknown')}")
        else:
            # Fallback for direct device_id
            device_id = init_data.get("device_id", "unknown")

        await manager.connect_agent(websocket, device_id)

        try:
            while True:
                # Listen for stats or command results
                data = await websocket.receive_text()
                msg = json.loads(data)
                
                print(f"Received from {device_id}: {msg.get('type', 'unknown')}")

                # Forward everything to the dashboard for viewing
                await manager.broadcast_to_dashboards(msg)

        except WebSocketDisconnect:
            print(f"Agent {device_id} disconnected normally")
            if device_id:
                manager.disconnect_agent(device_id)
                await manager.broadcast_agent_list()

    except Exception as e:
        print(f"Agent Error: {e}")
        if device_id:
            manager.disconnect_agent(device_id)
            await manager.broadcast_agent_list()


@app.websocket("/ws/dashboard")
async def websocket_dashboard_endpoint(websocket: WebSocket):
    try:
        await manager.connect_dashboard(websocket)

        # Send initial list of agents
        await manager.broadcast_agent_list()

        while True:
            # Listen for commands from the frontend dashboard
            data = await websocket.receive_text()
            cmd_data = json.loads(data)
            
            print(f"Dashboard command received: {cmd_data}")

            if cmd_data.get("type") == "command":
                target_id = cmd_data.get("target")
                cmd = cmd_data.get("cmd")
                req_id = cmd_data.get("request_id")
                
                if target_id and cmd:
                    success = await manager.send_command_with_id(target_id, cmd, req_id)
                    if not success:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Failed to send command to {target_id}",
                            "target": target_id
                        })
                else:
                    print("Invalid command data - missing target or cmd")
                    
            elif cmd_data.get("type") == "request":
                target_id = cmd_data.get("target")
                req_type = cmd_data.get("request_type")
                req_id = cmd_data.get("request_id")
                
                if target_id and req_type:
                    # Forward the request directly to the agent
                    request_msg = {
                        "type": req_type,
                        "request_id": req_id
                    }
                    # Include any additional parameters
                    for key, value in cmd_data.items():
                        if key not in ["type", "target", "request_type", "request_id"]:
                            request_msg[key] = value
                    
                    success = await manager.send_direct_request(target_id, request_msg)
                    if not success:
                        await websocket.send_json({
                            "type": "error",
                            "message": f"Failed to send request to {target_id}",
                            "target": target_id
                        })

    except WebSocketDisconnect:
        print("Dashboard disconnected")
        manager.disconnect_dashboard(websocket)
    except Exception as e:
        print(f"Dashboard error: {e}")
        manager.disconnect_dashboard(websocket)


@app.get("/")
def home():
    return {"status": "System Online", "agents": list(manager.active_agents.keys())}
