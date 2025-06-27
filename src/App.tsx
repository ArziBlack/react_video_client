import { useState, useEffect } from 'react';
import JoinForm from './components/JoinForm';
import VideoRoom from './components/VideoRoom';
import { io, Socket } from 'socket.io-client';

// Types for our application
export interface User {
  id: string;
  name: string;
}

export interface RTCPeerData {
  peerConnection: RTCPeerConnection;
  stream?: MediaStream;
}

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [joined, setJoined] = useState(false);
  const [username, setUsername] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, RTCPeerData>>({});

  // Initialize Socket.io connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Handle user joining the room
  const handleJoin = async (name: string) => {
    if (!socket) return;

    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      setLocalStream(stream);
      setUsername(name);
      
      // Send join event to server
      socket.emit('join', { name });
      setJoined(true);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera or microphone. Please check permissions.');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-b from-blue-500 to-stone-900 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-8">Video Call App</h1>
        
        {!joined ? (
          <JoinForm onJoin={handleJoin} />
        ) : (
          <VideoRoom
            socket={socket}
            username={username}
            users={users}
            setUsers={setUsers}
            localStream={localStream}
            peers={peers}
            setPeers={setPeers}
          />
        )}
      </div>
    </div>
  );
}

export default App;
