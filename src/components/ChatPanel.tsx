import { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

interface ChatPanelProps {
  socket: Socket | null;
  userId: string;
  userName: string;
}

const ChatPanel = ({ socket, userId, userName }: ChatPanelProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      senderId: 'user1',
      senderName: 'Maddison Beer',
      content: 'Hello Guys!😊',
      timestamp: new Date()
    },
    {
      id: '2',
      senderId: 'user1',
      senderName: 'Maddison Beer',
      content: 'Glad to see you again!',
      timestamp: new Date()
    },
    {
      id: '3',
      senderId: 'user2',
      senderName: 'Nanda Pradipto',
      content: 'Hai maddison',
      timestamp: new Date()
    },
    {
      id: '4',
      senderId: 'user2',
      senderName: 'Nanda Pradipto',
      content: 'How are you?',
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const message = {
      id: Date.now().toString(),
      senderId: userId,
      senderName: userName,
      content: newMessage,
      timestamp: new Date()
    };

    // Add to local state
    setMessages(prev => [...prev, message]);
    
    // Send to socket server
    socket.emit('chat-message', message);
    
    // Clear input
    setNewMessage('');
  };

  // Listen for incoming messages
  useEffect(() => {
    if (!socket) return;

    socket.on('chat-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      socket.off('chat-message');
    };
  }, [socket]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium">Chats</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => {
          // Group consecutive messages from the same sender
          const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId;
          
          return (
            <div key={message.id} className="flex items-start">
              {showAvatar && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-gray-600">
                    {message.senderName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className={`flex-1 ${!showAvatar ? 'ml-11' : ''}`}>
                {showAvatar && (
                  <div className="flex items-center mb-1">
                    <span className="font-medium text-sm">{message.senderName}</span>
                  </div>
                )}
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      <form onSubmit={handleSendMessage} className="relative flex items-center">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="w-full pr-12 py-2 px-4 rounded-full bg-gray-100 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Type a Message"
        />
        <button 
          type="submit" 
          className="absolute right-2 rounded-full bg-blue-500 p-1.5 text-white"
          disabled={!newMessage.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
