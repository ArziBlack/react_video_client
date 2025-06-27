import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream;
  userName: string;
  isMainVideo?: boolean;
  isMuted?: boolean;
  isVideoOff?: boolean;
}

const VideoPlayer = ({ 
  stream, 
  userName, 
  isMainVideo = false, 
  isMuted = false,
  isVideoOff = false 
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className={`relative ${isMainVideo ? 'bg-black rounded-xl overflow-hidden w-full aspect-video' : 'bg-black rounded-lg overflow-hidden aspect-video'}`}>
      {isVideoOff ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-16 h-16 rounded-full bg-gray-600 flex items-center justify-center">
            <span className="text-white text-xl font-medium">{userName.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      ) : (
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover"
        />
      )}

      {/* User name label */}
      <div className="absolute bottom-3 left-3 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
        {userName}
      </div>

      {/* Video controls for main video */}
      {isMainVideo && (
        <div className="absolute top-3 right-3 flex space-x-2">
          <button className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
