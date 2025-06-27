import { useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import type { User, RTCPeerData } from '../App';
import VideoPlayer from './VideoPlayer';

interface VideoRoomProps {
  socket: Socket | null;
  username: string;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  localStream: MediaStream | null;
  peers: Record<string, RTCPeerData>;
  setPeers: React.Dispatch<React.SetStateAction<Record<string, RTCPeerData>>>;
}

const VideoRoom = ({
  socket,
  username,
  users,
  setUsers,
  localStream,
  peers,
  setPeers,
}: VideoRoomProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Set up local video stream
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Handle socket events
  useEffect(() => {
    if (!socket || !localStream) return;

    // Get the list of users already in the room
    socket.on('get-users', (userList: User[]) => {
      setUsers(userList);
    });

    // Handle new user connections
    socket.on('user-connected', (user: User) => {
      console.log('New user connected:', user.name);
      setUsers(prev => [...prev, user]);
      
      // Create a peer connection for the new user
      createPeerConnection(user.id);
    });

    // Handle user disconnections
    socket.on('user-disconnected', (userId: string) => {
      console.log('User disconnected:', userId);
      setUsers(prev => prev.filter(user => user.id !== userId));
      
      // Remove peer connection
      setPeers(prev => {
        const updated = { ...prev };
        if (updated[userId]) {
          updated[userId].peerConnection.close();
          delete updated[userId];
        }
        return updated;
      });
    });

    // Handle incoming WebRTC offers
    socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; caller: string; name: string }) => {
      console.log('Received offer from', data.name);
      
      // Create a peer connection if it doesn't exist
      if (!peers[data.caller]) {
        createPeerConnection(data.caller);
      }
      
      const pc = peers[data.caller].peerConnection;
      
      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Send the answer back
      socket.emit('answer', {
        answer,
        target: data.caller
      });
    });

    // Handle incoming WebRTC answers
    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit; caller: string }) => {
      console.log('Received answer from', data.caller);
      
      if (peers[data.caller]) {
        const pc = peers[data.caller].peerConnection;
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; caller: string }) => {
      console.log('Received ICE candidate from', data.caller);
      
      if (peers[data.caller]) {
        const pc = peers[data.caller].peerConnection;
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Clean up listeners on unmount
    return () => {
      socket.off('get-users');
      socket.off('user-connected');
      socket.off('user-disconnected');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, localStream, peers, setUsers, setPeers]);

  // Create a new WebRTC peer connection
  const createPeerConnection = async (userId: string) => {
    if (!socket || !localStream) return;
    
    // Configure ICE servers
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    };
    
    try {
      // Create new peer connection
      const pc = new RTCPeerConnection(configuration);
      
      // Add local tracks
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
      
      // Handle ICE candidate events
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice-candidate', {
            candidate: event.candidate,
            target: userId
          });
        }
      };
      
      // Handle remote tracks
      pc.ontrack = (event) => {
        console.log('Got remote track from', userId);
        setPeers(prev => ({
          ...prev,
          [userId]: {
            ...prev[userId],
            stream: event.streams[0]
          }
        }));
      };
      
      // Add peer to state
      setPeers(prev => ({
        ...prev,
        [userId]: { peerConnection: pc }
      }));
      
      // Create and send offer (if we are the initiator)
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('offer', {
        offer,
        target: userId
      });
    } catch (error) {
      console.error('Error creating peer connection:', error);
    }
  };

  return (
    <div className="video-room">
      <h2>Room: {username}'s Call</h2>
      
      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local-video">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
          />
          <div className="user-name">{username} (You)</div>
        </div>
        
        {/* Remote videos */}
        {Object.entries(peers).map(([userId, peerData]) => {
          const user = users.find(u => u.id === userId);
          if (user && peerData.stream) {
            return (
              <VideoPlayer
                key={userId}
                stream={peerData.stream}
                userName={user.name}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default VideoRoom;
