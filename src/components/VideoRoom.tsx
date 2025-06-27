import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { User, RTCPeerData } from '../App';
import VideoPlayer from './VideoPlayer';
import ParticipantsList from './ParticipantsList';
import ChatPanel from './ChatPanel';

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

  const [activeTab, setActiveTab] = useState<'participants' | 'chat'>('participants');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const allUsers = [{id: 'local', name: username}, ...users];
  
  // Get the stream for the main video (either selected user or local)
  const getMainStream = () => {
    if (selectedUser && selectedUser !== 'local') {
      const peer = peers[selectedUser];
      return peer?.stream || null;
    }
    return localStream;
  };
  
  // Get the name for main video
  const getMainUserName = () => {
    if (selectedUser && selectedUser !== 'local') {
      const user = users.find(u => u.id === selectedUser);
      return user?.name || 'Unknown User';
    }
    return `${username} (You)`;
  };
  
  return (
    <div className="flex h-[calc(100vh-80px)] bg-white overflow-hidden">
      {/* Meeting Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center p-4 bg-white z-10">
        <button className="flex items-center text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        
        <div className="flex-1 ml-4">
          <h1 className="text-xl font-semibold">Product Design Meeting</h1>
          <p className="text-sm text-gray-500">{allUsers.length} Participant{allUsers.length !== 1 ? 's' : ''}</p>
        </div>
        
        <div className="rounded-md bg-red-500 text-white px-4 py-2 flex items-center">
          <span className="mr-2">Recording</span>
          <div className="h-2 w-2 rounded-full bg-white"></div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 pt-20 pb-24 px-4 relative">
        {/* Main Video */}
        {getMainStream() ? (
          <VideoPlayer
            stream={getMainStream()!}
            userName={getMainUserName()}
            isMainVideo={true}
            isMuted={selectedUser === null || selectedUser === 'local'}
          />
        ) : (
          <div className="w-full aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
            <p className="text-white text-xl">No video available</p>
          </div>
        )}
        
        {/* Video Controls */}
        <div className="absolute left-1/2 bottom-8 -translate-x-1/2 flex items-center space-x-4 bg-white shadow-lg rounded-full py-3 px-6">
          <button className="p-3 rounded-full text-gray-500 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button className="p-3 rounded-full text-gray-500 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button className="p-3 rounded-full text-gray-500 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
          <button className="p-3 rounded-full text-gray-500 hover:bg-gray-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>
        </div>
        
        {/* Bottom Participant Carousel */}
        <div className="absolute left-0 right-0 bottom-28 px-4">
          <div className="flex space-x-3 overflow-x-auto pb-3">
            {/* Local video thumbnail */}
            <div 
              onClick={() => setSelectedUser('local')}
              className={`flex-shrink-0 w-40 ${selectedUser === 'local' ? 'ring-4 ring-blue-500' : ''} cursor-pointer`}
            >
              {localStream && (
                <VideoPlayer
                  stream={localStream}
                  userName={`${username} (You)`}
                  isMuted={true}
                />
              )}
            </div>
            
            {/* Remote video thumbnails */}
            {Object.entries(peers).map(([userId, peerData]) => {
              const user = users.find(u => u.id === userId);
              if (user && peerData.stream) {
                return (
                  <div 
                    key={userId}
                    onClick={() => setSelectedUser(userId)}
                    className={`flex-shrink-0 w-40 ${selectedUser === userId ? 'ring-4 ring-blue-500' : ''} cursor-pointer`}
                  >
                    <VideoPlayer
                      stream={peerData.stream}
                      userName={user.name}
                    />
                  </div>
                );
              }
              return null;
            })}
            
            {/* Add fake participants to match the image */}
            {allUsers.length < 4 && (
              <>
                <div className="flex-shrink-0 w-40">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white font-medium">GS</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                      George Situmoran
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-40">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white font-medium">YC</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                      Yen Chupun
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-40">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <div className="w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white font-medium">AL</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                      Andy Lawcheng
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* More participants button */}
            <div className="flex-shrink-0 w-40">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="bg-gray-200 rounded-full h-12 w-12 flex items-center justify-center mx-auto">
                    <span className="text-gray-600 font-medium">+12</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Right Sidebar */}
      <div className="w-80 border-l border-gray-200 flex flex-col">
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-4 text-center font-medium ${activeTab === 'participants' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('participants')}
          >
            Participants
          </button>
          <button 
            className={`flex-1 py-4 text-center font-medium ${activeTab === 'chat' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
            onClick={() => setActiveTab('chat')}
          >
            Chats
          </button>
        </div>
        
        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'participants' ? (
            <ParticipantsList 
              users={allUsers} 
              currentUserId="local" 
            />
          ) : (
            <ChatPanel 
              socket={socket} 
              userId="local" 
              userName={username} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoRoom;
