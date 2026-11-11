import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import {
  Smartphone,
  Globe,
  Share2,
  Upload,
  Download,
  Trash2,
  Copy,
  Check,
  Send,
  QrCode,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  X,
  ArrowRight,
  Eye,
  Archive,
  Volume2,
  MessageSquare,
  Sparkles,
  Zap,
  Radio
} from 'lucide-react';

// Backend API Base URL (uses relative /api in dev with proxy, or VITE_API_URL in production)
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function App() {
  const [view, setView] = useState('home'); // 'home' | 'room'
  const [mode, setMode] = useState(null); // 'personal' | 'global'
  const [globalAction, setGlobalAction] = useState('join'); // 'join' | 'create'
  const [mobileTab, setMobileTab] = useState('files'); // 'files' | 'chat'

  // Form states
  const [joinCode, setJoinCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [createCustomCode, setCreateCustomCode] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Active room state
  const [roomData, setRoomData] = useState(null);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [peers, setPeers] = useState([]);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Media preview modal
  const [previewFile, setPreviewFile] = useState(null);

  // Chat message input
  const [chatInput, setChatInput] = useState('');
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isZipping, setIsZipping] = useState(false);

  // Poll timer ref
  const pollTimerRef = useRef(null);
  const socketRef = useRef(null);
  const chatLogRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMessageCountRef = useRef(0);

  // Device detection
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const deviceType = isMobile ? 'mobile' : 'laptop';
  const deviceName = `${isMobile ? 'Mobile' : 'Laptop'} (${navigator.platform?.slice(0, 5) || 'Device'})`;

  // Auto-join from URL parameter (e.g. Scanned QR code)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('room');
    if (codeParam) {
      autoJoinFromUrl(codeParam);
    }
  }, []);

  const triggerCelebration = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6']
      });
    } catch (e) { }
  };

  const autoJoinFromUrl = async (code) => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_code: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.require_password) {
          setMode('global');
          setGlobalAction('join');
          setJoinCode(code);
          setErrorMessage('This room requires a password.');
        } else {
          setErrorMessage(data.error || 'Failed to join room');
        }
        setLoading(false);
        return;
      }
      enterRoom(data);
    } catch (err) {
      setErrorMessage('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code for pairing
  const generateQR = async (code) => {
    try {
      const joinUrl = `${window.location.origin}/?room=${code}`;
      const url = await QRCode.toDataURL(joinUrl, {
        width: 260,
        margin: 1,
        color: { dark: '#050609', light: '#ffffff' },
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR generation error:', err);
    }
  };

  // Setup Socket.IO connection
  const initSocket = (roomCode) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }

    const socket = API_BASE ? io(API_BASE) : io();
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', {
        room_code: roomCode,
        device_name: deviceName,
        device_type: deviceType,
      });
    });

    socket.on('room_joined', (data) => {
      setPeers(data.peers || []);
    });

    socket.on('peer_joined', (peer) => {
      setPeers((prev) => [...prev.filter((p) => p.sid !== peer.sid), peer]);
      triggerCelebration();
    });

    socket.on('peer_left', (peer) => {
      setPeers((prev) => prev.filter((p) => p.sid !== peer.sid));
    });

    socket.on('new_file', (newFile) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === newFile.id)) return prev;
        return [newFile, ...prev];
      });
      triggerCelebration();
    });

    socket.on('file_deleted', ({ file_id }) => {
      setFiles((prev) => prev.filter((f) => f.id !== file_id));
    });

    socket.on('new_message', (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    // Fallback sync polling every 2.5s
    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/rooms/${roomCode}`);
        if (res.ok) {
          const details = await res.json();
          setFiles(details.files || []);
          setMessages(details.messages || []);
        }
      } catch (e) { }
    }, 2500);
  };

  const enterRoom = async (room) => {
    setRoomData(room);
    setView('room');
    await generateQR(room.room_code);
    initSocket(room.room_code);
    triggerCelebration();

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${room.room_code}`);
      if (res.ok) {
        const details = await res.json();
        setFiles(details.files || []);
        setMessages(details.messages || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Personal Room (Share Within You)
  const handleCreatePersonalRoom = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_type: 'personal' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create room');
      enterRoom(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create Global Room
  const handleCreateGlobalRoom = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_type: 'global',
          custom_code: createCustomCode || undefined,
          password: createPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create global room');
      enterRoom(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Join Room by Code
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    if (!joinCode) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/rooms/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: joinCode,
          password: joinPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Room not found or incorrect password');
      enterRoom(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Leave / Delete Room
  const handleLeaveRoom = async () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit('leave_room', { room_code: roomData.room_code });
      socketRef.current.disconnect();
    }
    if (roomData?.room_type === 'personal') {
      try {
        await fetch(`${API_BASE}/api/rooms/${roomData.room_code}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Owner-Token': roomData.owner_token || '',
          },
        });
      } catch (err) { }
    }
    setRoomData(null);
    setFiles([]);
    setMessages([]);
    setPeers([]);
    setView('home');
    setMode(null);
    window.history.replaceState({}, document.title, '/');
  };

  // Manual Delete Room
  const handleDeleteRoom = async () => {
    if (!confirm('Delete this room and all its files permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomData.room_code}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Owner-Token': roomData.owner_token || '',
        },
      });
      if (res.ok) {
        handleLeaveRoom();
      }
    } catch (err) { }
  };

  // File Upload
  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      formData.append('uploaded_by', deviceName);

      setUploadProgress(`Uploading ${file.name}...`);
      try {
        const res = await fetch(`${API_BASE}/api/rooms/${roomData.room_code}/files`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          alert(err.error || 'Failed to upload');
        } else {
          const uploaded = await res.json();
          setFiles((prev) => {
            if (prev.some((f) => f.id === uploaded.id)) return prev;
            return [uploaded, ...prev];
          });
          triggerCelebration();
        }
      } catch (err) {
        alert('File upload failed');
      }
    }
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // File Deletion
  const handleDeleteFile = async (fileId) => {
    try {
      await fetch(`${API_BASE}/api/rooms/files/${fileId}`, { method: 'DELETE' });
    } catch (err) { }
  };

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    if (files.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const f of files) {
        const fileUrl = f.download_url.startsWith('http') ? f.download_url : `${API_BASE}${f.download_url}`;
        const resp = await fetch(fileUrl);
        const blob = await resp.blob();
        zip.file(f.file_name, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `DropZone-${roomData.room_code}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert('Failed to generate ZIP archive.');
    } finally {
      setIsZipping(false);
    }
  };

  // Send Chat Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/rooms/${roomData.room_code}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: chatInput.trim(),
          sender: deviceName,
          sender_device: deviceType,
        }),
      });
      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });
      }
      setChatInput('');
    } catch (err) { }
  };

  // Internal chat log auto-scroll (does NOT scroll parent page)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current && chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const copyCodeToClipboard = () => {
    if (roomData?.room_code) {
      navigator.clipboard.writeText(roomData.room_code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyDirectUrlToClipboard = () => {
    if (roomData?.room_code) {
      const url = `${window.location.origin}/?room=${roomData.room_code}`;
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const getFileIcon = (contentType) => {
    if (contentType?.startsWith('image/')) return <ImageIcon size={18} />;
    if (contentType?.startsWith('video/')) return <Video size={18} />;
    if (contentType?.startsWith('audio/')) return <Volume2 size={18} />;
    if (contentType?.includes('pdf') || contentType?.includes('text') || contentType?.includes('document'))
      return <FileText size={18} />;
    return <File size={18} />;
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="app-wrapper">
      {/* Ambient Moving Orbs */}
      <div className="bg-ambient">
        <div className="ambient-orb ambient-orb-1"></div>
        <div className="ambient-orb ambient-orb-2"></div>
        <div className="ambient-orb ambient-orb-3"></div>
      </div>
      <div className="bg-grid-overlay"></div>

      {/* Futuristic Navbar */}
      <header className="nav-header">
        <a
          className="logo-wrap"
          href="/"
          onClick={(e) => {
            if (view === 'room') {
              e.preventDefault();
              handleLeaveRoom();
            }
          }}
        >
          <div className="logo-badge">
            <Radio size={20} color="#fff" />
          </div>
          <div className="logo-text">Drop<span>Zone</span></div>
        </a>

        <div className="nav-pill">
          <span className="pulse-indicator"></span>
          <span>Zero-Login Sync</span>
        </div>
      </header>

      {/* Main Content Router */}
      <main style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'home' ? (
          <div className="hero-layout">
            <div className="hero-glow-pill">
              <Sparkles size={14} />
              <span>Next-Gen Direct File Transfer</span>
            </div>

            <h1 className="hero-heading">
              Transfer anything.<br />
              <span className="gradient-shimmer">In the blink of an eye.</span>
            </h1>

            <p className="hero-description">
              Scan with your phone to pair your devices instantly with zero login, or spin up an encrypted persistent room to collaborate anywhere on earth.
            </p>

            {/* Selection Cards */}
            <div className="cards-container">
              {/* Option 1: Share Within You */}
              <div
                className={`mode-option-card card-personal ${mode === 'personal' ? 'selected' : ''}`}
                onClick={() => { setMode('personal'); setErrorMessage(''); }}
              >
                <div className="card-top-row">
                  <div className="card-glowing-icon">
                    <Smartphone size={26} />
                  </div>
                  <span className="badge-tag-glow temp">⚡ Ephemeral</span>
                </div>
                <h2 className="card-header-title">Share Within You</h2>
                <p className="card-body-text">
                  Fast QR code pairing between phone and laptop. Instant sync, pure speed, and automatically vanishes forever when you exit.
                </p>
                <div className="card-launch-row">
                  <span>Start temporary session</span>
                  <ArrowRight size={16} />
                </div>
              </div>

              {/* Option 2: Global Sharing */}
              <div
                className={`mode-option-card card-global ${mode === 'global' ? 'selected' : ''}`}
                onClick={() => { setMode('global'); setErrorMessage(''); }}
              >
                <div className="card-top-row">
                  <div className="card-glowing-icon">
                    <Globe size={26} />
                  </div>
                  <span className="badge-tag-glow perm">☁ Persistent</span>
                </div>
                <h2 className="card-header-title">Global Sharing</h2>
                <p className="card-body-text">
                  Host files, videos & notes in a room accessible from any network with a code or password. Persists until manually deleted.
                </p>
                <div className="card-launch-row">
                  <span>Open or join room</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.4)',
                color: '#fb7185',
                padding: '0.75rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.9rem',
                marginBottom: '1.5rem',
                width: '100%',
                maxWidth: '540px'
              }}>
                {errorMessage}
              </div>
            )}

            {/* Action Box: Personal */}
            {mode === 'personal' && (
              <div className="action-box-glow">
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>Device-to-Device Pairing</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.75rem' }}>
                  Generate a temporary room QR on this screen and scan it with your phone's camera to pair.
                </p>

                <button
                  className="btn-neon-action btn-cyan"
                  onClick={handleCreatePersonalRoom}
                  disabled={loading}
                >
                  <QrCode size={18} />
                  <span>{loading ? 'Creating Room...' : 'Start Temporary Room'}</span>
                  <ArrowRight size={18} />
                </button>

                <div style={{ marginTop: '1.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.4rem' }}>
                  <span style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 600 }}>
                    OR ENTER 6-DIGIT ROOM PIN:
                  </span>
                  <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="e.g. 714593"
                      className="glow-input mono"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, ''))}
                    />
                    <button type="submit" className="btn-glow-control" style={{ padding: '0.85rem 1.4rem' }} disabled={loading || joinCode.length < 6}>
                      Join
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* Action Box: Global */}
            {mode === 'global' && (
              <div className="action-box-glow">
                <div className="action-tabs-neon">
                  <button
                    type="button"
                    className={globalAction === 'join' ? 'active' : ''}
                    onClick={() => setGlobalAction('join')}
                  >
                    Join with Code
                  </button>
                  <button
                    type="button"
                    className={globalAction === 'create' ? 'active' : ''}
                    onClick={() => setGlobalAction('create')}
                  >
                    Create New Room
                  </button>
                </div>

                {globalAction === 'join' ? (
                  <form onSubmit={handleJoinRoom}>
                    <div className="form-group-glow">
                      <label>Room Code</label>
                      <input
                        type="text"
                        className="glow-input mono"
                        placeholder="e.g. DZ-TEAM"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>

                    <div className="form-group-glow">
                      <label>Password (if protected)</label>
                      <input
                        type="password"
                        className="glow-input"
                        placeholder="Optional room password"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-neon-action btn-purple" disabled={loading || !joinCode}>
                      <span>{loading ? 'Connecting...' : 'Enter Global Room'}</span>
                      <ArrowRight size={18} />
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCreateGlobalRoom}>
                    <div className="form-group-glow">
                      <label>Custom Code (Optional)</label>
                      <input
                        type="text"
                        className="glow-input mono"
                        placeholder="Leave blank for auto-code"
                        value={createCustomCode}
                        onChange={(e) => setCreateCustomCode(e.target.value.toUpperCase())}
                      />
                    </div>

                    <div className="form-group-glow">
                      <label>Password Protection (Optional)</label>
                      <input
                        type="password"
                        className="glow-input"
                        placeholder="Add password protection if needed"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn-neon-action btn-purple" disabled={loading}>
                      <Globe size={18} />
                      <span>{loading ? 'Creating...' : 'Create Global Room'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ACTIVE ROOM WORKSPACE */
          <div className="room-workspace">
            {/* Control Bar */}
            <div className="room-topbar-glow">
              <div className="room-pin-display">
                <div className="pin-chip">
                  <span>{roomData?.room_code}</span>
                  <button onClick={copyCodeToClipboard} className="btn-chip-copy" title="Copy code">
                    {copiedCode ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
                  </button>
                </div>

                <div>
                  <div className="room-type-tag">
                    {roomData?.room_type === 'personal' ? 'Temporary Room' : 'Global Room'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {peers.length + 1} connected
                  </div>
                </div>
              </div>

              <div className="topbar-actions-wrap">
                <button className="btn-glow-control" onClick={() => setShowQrModal(true)}>
                  <QrCode size={16} />
                  <span>Show QR</span>
                </button>

                <button className="btn-glow-control" onClick={copyDirectUrlToClipboard}>
                  {copiedUrl ? <Check size={16} color="#34d399" /> : <Share2 size={16} />}
                  <span>{copiedUrl ? 'Copied' : 'Share Link'}</span>
                </button>

                {roomData?.room_type === 'global' ? (
                  <button className="btn-glow-control danger" onClick={handleDeleteRoom} title="Delete Room">
                    <Trash2 size={16} />
                    <span>Delete</span>
                  </button>
                ) : null}

                <button className="btn-glow-control" onClick={handleLeaveRoom}>
                  <X size={16} />
                  <span>Exit</span>
                </button>
              </div>
            </div>

            {/* Mobile Segment Tabs */}
            <div className="mobile-segment-tabs">
              <button
                className={`mobile-segment-tab ${mobileTab === 'files' ? 'is-active' : ''}`}
                onClick={() => setMobileTab('files')}
              >
                <Upload size={16} />
                <span>Files ({files.length})</span>
              </button>
              <button
                className={`mobile-segment-tab ${mobileTab === 'chat' ? 'is-active' : ''}`}
                onClick={() => setMobileTab('chat')}
              >
                <MessageSquare size={16} />
                <span>Live Notes ({messages.length})</span>
              </button>
            </div>

            {/* QR Modal */}
            {showQrModal && qrCodeUrl && (
              <div className="modal-blur-overlay" onClick={() => setShowQrModal(false)}>
                <div className="qr-dialog-box" onClick={(e) => e.stopPropagation()}>
                  <button
                    style={{ position: 'absolute', top: '16px', right: '16px', color: '#94a3b8' }}
                    onClick={() => setShowQrModal(false)}
                  >
                    <X size={20} />
                  </button>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem' }}>Scan with Phone</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    Point camera to join without typing pins or codes.
                  </p>
                  <div className="qr-canvas-card">
                    <img src={qrCodeUrl} alt="Room QR Code" />
                  </div>
                  <div style={{ fontFamily: 'var(--font-code)', fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
                    PIN: {roomData.room_code}
                  </div>
                </div>
              </div>
            )}

            {/* Media Preview Modal */}
            {previewFile && (
              <div className="modal-blur-overlay" onClick={() => setPreviewFile(null)}>
                <div style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    style={{ position: 'absolute', top: '-38px', right: 0, color: '#fff' }}
                    onClick={() => setPreviewFile(null)}
                  >
                    <X size={24} />
                  </button>
                  {previewFile.content_type?.startsWith('image/') ? (
                    <img
                      src={previewFile.download_url.startsWith('http') ? previewFile.download_url : `${API_BASE}${previewFile.download_url}`}
                      alt={previewFile.file_name}
                      style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-md)', objectFit: 'contain' }}
                    />
                  ) : (
                    <video
                      src={previewFile.download_url.startsWith('http') ? previewFile.download_url : `${API_BASE}${previewFile.download_url}`}
                      controls
                      autoPlay
                      style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 'var(--radius-md)' }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* 2-Column Responsive Workspace */}
            <div className="room-grid-2col">
              {/* Files Hub */}
              <div className={`room-glass-panel ${mobileTab !== 'files' ? 'mobile-hidden' : ''}`}>
                <div className="panel-header-line">
                  <div className="panel-title-text">
                    <span>Shared Files</span>
                    <span className="counter-glow-chip">{files.length}</span>
                  </div>

                  {files.length > 1 && (
                    <button
                      className="btn-glow-control"
                      style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                      onClick={handleDownloadAllZip}
                      disabled={isZipping}
                    >
                      <Archive size={14} />
                      <span>{isZipping ? 'Archiving...' : 'Download All (.zip)'}</span>
                    </button>
                  )}
                </div>

                {/* Upload Zone */}
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <div
                  className="interactive-drop-zone"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
                  onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-active'); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove('drag-active');
                    if (e.dataTransfer.files?.length) {
                      handleFileUpload({ target: { files: e.dataTransfer.files } });
                    }
                  }}
                >
                  <div className="upload-orb-icon">
                    <Upload size={22} />
                  </div>
                  <div className="upload-primary-text">Click or drag files here to upload</div>
                  <div className="upload-secondary-text">Supports docs, PDFs, videos, photos, code up to 100MB</div>
                </div>

                {uploadProgress && (
                  <div style={{
                    padding: '0.6rem 0.9rem',
                    background: 'rgba(6, 182, 212, 0.1)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: '#38bdf8'
                  }}>
                    {uploadProgress}
                  </div>
                )}

                {/* File Cards List */}
                <div className="file-cards-list">
                  {files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      No files uploaded to this room yet.
                    </div>
                  ) : (
                    files.map((file) => (
                      <div className="file-row-item" key={file.id}>
                        <div className="file-main-info">
                          <div className="file-type-icon">
                            {getFileIcon(file.content_type)}
                          </div>
                          <div className="file-text-col">
                            <div className="file-title-str" title={file.file_name}>{file.file_name}</div>
                            <div className="file-sub-str">
                              {formatBytes(file.size_bytes)} · {file.uploaded_by || 'Device'}
                            </div>
                          </div>
                        </div>

                        <div className="file-buttons-set">
                          {(file.content_type?.startsWith('image/') || file.content_type?.startsWith('video/')) && (
                            <button
                              className="btn-icon-square"
                              onClick={() => setPreviewFile(file)}
                              title="Preview"
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          <a
                            className="btn-icon-square"
                            href={file.download_url.startsWith('http') ? file.download_url : `${API_BASE}${file.download_url}`}
                            download={file.file_name}
                            title="Download"
                          >
                            <Download size={15} />
                          </a>
                          <button
                            className="btn-icon-square delete"
                            onClick={() => handleDeleteFile(file.id)}
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat & Notes Panel */}
              <div className={`room-glass-panel chat-container-wrap ${mobileTab !== 'chat' ? 'mobile-hidden' : ''}`}>
                <div className="panel-header-line">
                  <div className="panel-title-text">
                    <span>Live Notes & Board</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 600 }}>LIVE SYNC</span>
                </div>

                <div className="chat-log-scrollable" ref={chatLogRef}>
                  {messages.length === 0 ? (
                    <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Share links, texts, or code snippets across devices.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender === deviceName;
                      return (
                        <div className={`chat-bubble-card ${isMine ? 'mine' : ''}`} key={m.id}>
                          <div className="chat-bubble-meta">
                            <span className="chat-author-name">{m.sender}</span>
                            <span>
                              {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <div>{m.content}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                <form onSubmit={handleSendMessage} className="chat-input-bar-wrap">
                  <input
                    type="text"
                    className="chat-glow-input"
                    placeholder="Share a note, link or text..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                  />
                  <button type="submit" className="btn-chat-send-glow" disabled={!chatInput.trim()}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Global Interactive Footer with Social Links */}
      <footer className="epic-footer">
        <div className="footer-inner-content">
          <div className="footer-social-links">
            <a
              href="https://github.com/UDAY-939"
              target="_blank"
              rel="noopener noreferrer"
              className="social-pill-btn github"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
              <span>GitHub</span>
            </a>

            <a
              href="https://www.linkedin.com/in/uday-sonawane-9244a1404"
              target="_blank"
              rel="noopener noreferrer"
              className="social-pill-btn linkedin"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" y="9" width="4" height="12"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
              <span>LinkedIn</span>
            </a>

            <a
              href="https://www.instagram.com/uday._.369"
              target="_blank"
              rel="noopener noreferrer"
              className="social-pill-btn instagram"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>Instagram</span>
            </a>
          </div>

          <div className="footer-text-block">
            <div className="footer-brand-sig">
              © 2026 <span>U//DEV</span>
            </div>
            <div className="footer-creator-line">
              Designed &amp; Developed by <strong>Uday</strong>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
