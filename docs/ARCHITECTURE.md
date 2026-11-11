# DropZone architecture notes

## Share Within You
1. A device requests a temporary room.
2. Backend creates a short-lived room and returns pairing information.
3. Devices exchange WebRTC offer/answer and ICE candidates through Socket.IO.
4. Files travel over WebRTC DataChannels where direct connectivity is possible.
5. Use STUN and, where needed, TURN. A TURN relay may carry data if peer-to-peer connectivity fails.
6. Close or expire the room after completion/inactivity.

## Global Sharing
1. Backend creates a persistent room and generates a high-entropy access credential.
2. Files are uploaded to private object storage (Cloudflare R2).
3. PostgreSQL stores room data, permissions and file metadata.
4. Downloads are authorized by the backend and delivered using short-lived signed URLs.
5. Owner can delete the room and its stored objects.

## Important
A room code is an identifier, not sufficient authorization by itself. Use a separate secret token or password, rate-limit attempts, validate uploads, enforce size limits, and use HTTPS.
