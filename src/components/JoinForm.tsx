import { useState } from 'react';

interface JoinFormProps {
  onJoin: (name: string) => void;
}

const JoinForm = ({ onJoin }: JoinFormProps) => {
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
    }
  };
  
  return (
    <div className="h-[800px] flex flex-col items-center justify-center bg-neutral-900 px-4 text-white rounded-4xl">
      <h1 className="text-2xl font-bold mb-2">Video Call App</h1>
      
      <div className="w-full max-w-md">
        <div className="mt-16 mb-8 text-center">
          <h2 className="text-2xl font-bold">Meeting Room</h2>
          <p className="mt-2 text-sm text-gray-400">Enter your name to join the video call</p>
        </div>
        
        {/* Join Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-transparent border-b border-gray-600 focus:outline-none focus:border-white"
            placeholder="Your Name"
            required
          />
          
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 bg-neutral-800 text-white font-medium rounded hover:bg-neutral-700"
          >
            Join Meeting
          </button>
          
          <div className="text-center text-xs text-gray-500 mt-2">
            By joining, you agree to our Terms of Service and Privacy Policy
          </div>
        </form>
      </div>
      
      {/* Recent Meetings */}
      <div className="w-full max-w-md mt-8">
        <h2 className="text-sm font-medium mb-4">Recent Meetings</h2>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-4 border-b border-neutral-800">
            <div className="flex items-center">
              <span className="text-white font-bold mr-2">P</span>
              <div>
                <h3 className="text-sm font-medium">Product Design</h3>
                <p className="text-xs text-gray-500">3 days ago • 6 participants</p>
              </div>
            </div>
            <button className="bg-neutral-800 text-white text-xs px-3 py-1 rounded hover:bg-neutral-700">
              Rejoin
            </button>
          </div>
          
          <div className="flex items-center justify-between py-4 border-b border-neutral-800">
            <div className="flex items-center">
              <span className="text-white font-bold mr-2">M</span>
              <div>
                <h3 className="text-sm font-medium">Marketing Team</h3>
                <p className="text-xs text-gray-500">1 week ago • 4 participants</p>
              </div>
            </div>
            <button className="bg-neutral-800 text-white text-xs px-3 py-1 rounded hover:bg-neutral-700">
              Rejoin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinForm;
