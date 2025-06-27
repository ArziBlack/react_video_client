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
    <div className="join-form-container">
      <form onSubmit={handleSubmit}>
        <h2>Enter your name to join</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          required
        />
        <button type="submit" disabled={!name.trim()}>
          Join Call
        </button>
      </form>
    </div>
  );
};

export default JoinForm;
