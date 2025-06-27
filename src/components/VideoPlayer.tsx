import { useEffect, useRef } from 'react';

interface VideoPlayerProps {
  stream: MediaStream;
  userName: string;
}

const VideoPlayer = ({ stream, userName }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  
  return (
    <div className="video-container">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline
      />
      <div className="user-name">{userName}</div>
    </div>
  );
};

export default VideoPlayer;
