# Initial API plan

- `POST /api/rooms` — create a temporary or global room
- `POST /api/rooms/join` — join using room code and credential
- `GET /api/rooms/<room_code>` — get authorized room details
- `POST /api/rooms/<room_code>/files` — request upload / register file metadata
- `GET /api/rooms/<room_code>/files` — list files
- `DELETE /api/rooms/<room_code>/files/<file_id>` — delete a file
- `DELETE /api/rooms/<room_code>` — delete a room (owner only)

WebRTC signaling events (planned):
- `room:join`
- `webrtc:offer`
- `webrtc:answer`
- `webrtc:ice-candidate`
- `transfer:complete`
