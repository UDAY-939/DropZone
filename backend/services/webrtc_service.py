from flask_socketio import emit, join_room, leave_room
from services.room_service import RoomService

# Map socket session id to peer info
CONNECTED_PEERS = {}

def register_socket_events(socketio):
    @socketio.on("connect")
    def handle_connect():
        pass

    @socketio.on("disconnect")
    def handle_disconnect():
        from flask import request
        sid = request.sid
        if sid in CONNECTED_PEERS:
            peer_info = CONNECTED_PEERS.pop(sid)
            room_code = peer_info.get("room_code")
            device = peer_info.get("device", "A device")
            leave_room(room_code)
            emit("peer_left", {"sid": sid, "device": device}, to=room_code)

    @socketio.on("join_room")
    def handle_join(data):
        from flask import request
        room_code = data.get("room_code", "").strip().upper()
        device_name = data.get("device_name", "Device")
        device_type = data.get("device_type", "browser")

        room = RoomService.get_room(room_code)
        if not room:
            emit("error", {"message": "Room not found or expired"})
            return

        join_room(room_code)
        CONNECTED_PEERS[request.sid] = {
            "room_code": room_code,
            "device": device_name,
            "device_type": device_type
        }

        # Tell other peers in this room that a new peer joined
        emit("peer_joined", {
            "sid": request.sid,
            "device_name": device_name,
            "device_type": device_type
        }, to=room_code, include_self=False)

        # Send current connected peer list to the joining peer
        peers_in_room = [
            {"sid": s, "device_name": p["device"], "device_type": p["device_type"]}
            for s, p in CONNECTED_PEERS.items()
            if p["room_code"] == room_code and s != request.sid
        ]
        emit("room_joined", {
            "room_code": room_code,
            "room_type": room.room_type,
            "peers": peers_in_room
        })

    @socketio.on("leave_room")
    def handle_leave(data):
        from flask import request
        room_code = data.get("room_code", "").strip().upper()
        sid = request.sid
        if sid in CONNECTED_PEERS:
            peer_info = CONNECTED_PEERS.pop(sid)
            leave_room(room_code)
            emit("peer_left", {"sid": sid, "device": peer_info.get("device")}, to=room_code)

    # WebRTC Signaling handlers
    @socketio.on("signal_offer")
    def handle_offer(data):
        target_sid = data.get("target_sid")
        from flask import request
        emit("signal_offer", {
            "from_sid": request.sid,
            "offer": data.get("offer")
        }, to=target_sid)

    @socketio.on("signal_answer")
    def handle_answer(data):
        target_sid = data.get("target_sid")
        from flask import request
        emit("signal_answer", {
            "from_sid": request.sid,
            "answer": data.get("answer")
        }, to=target_sid)

    @socketio.on("signal_ice")
    def handle_ice(data):
        target_sid = data.get("target_sid")
        from flask import request
        emit("signal_ice", {
            "from_sid": request.sid,
            "candidate": data.get("candidate")
        }, to=target_sid)
