import React, { useState, useEffect, useRef } from 'react';
import { useAuth, useApp } from '../../App';

interface MascotProps {
  className?: string;
}

const BloxMascot: React.FC<MascotProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { currentPage } = useApp();
  const [isVisible, setIsVisible] = useState(true);
  const [currentState, setCurrentState] = useState<'idle' | 'talking' | 'celebrating' | 'thinking' | 'waving'>('idle');
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const messageTimeoutRef = useRef<number | null>(null);
  const stateTimeoutRef = useRef<number | null>(null);

  // Messages for different scenarios
  const welcomeMessages = React.useMemo(() => [
    "Welcome to BloxMarket! 🎉",
    "Ready to make some epic trades? 💫",
    "Let's find you some awesome items! ✨",
    "Time to explore the marketplace! 🚀"
  ], []);

  const randomMessages = React.useMemo(() => [
    "Looking for rare items? Check the trading hub! 💎",
    "Don't forget to leave vouches for good traders! ⭐",
    "New forum posts might have trading tips! 📚",
    "Events section has giveaways! 🎁",
    "Keep your wishlist updated! 📝",
    "Safety first - use verified middlemen! 🛡️",
    "Check your notifications! 🔔",
    "Happy trading! 😊"
  ], []);

  const pageSpecificMessages = React.useMemo(() => ({
    'trading-hub': [
      "Great choice! This is where the magic happens! ✨",
      "Tip: Use filters to find exactly what you need! 🔍",
      "Remember to check seller reputation! 🌟"
    ],
    'forums': [
      "Welcome to the community! 💬",
      "Share your trading stories here! 📝",
      "Help others and they'll help you! 🤝"
    ],
    'events': [
      "Exciting giveaways await! 🎉",
      "Enter events for free items! 🆓",
      "Check back regularly for new events! 🔄"
    ],
    'wishlist': [
      "Organize your dream items here! 💭",
      "Set priorities to get what you want most! ⭐",
      "Share your wishlist with friends! 👥"
    ],
    'messenger': [
      "Stay connected with other traders! 💬",
      "Always be respectful in conversations! 😊",
      "Screenshots can help with trade disputes! 📸"
    ],
    'profile': [
      "Looking good! Keep your profile updated! ✨",
      "Good reputation opens more doors! 🚪",
      "Showcase your best trades! 🏆"
    ],
    'admin': [
      "Welcome back, admin! 👑",
      "Keep the platform safe and fair! 🛡️",
      "Thank you for maintaining order! 🙏"
    ]
  }), []);



  // Show welcome message when user logs in
  useEffect(() => {
    if (user) {
      const welcomeMsg = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
      showMascotMessage(welcomeMsg, 'waving');
    }
  }, [user, welcomeMessages]);

  // Show page-specific message when page changes
  useEffect(() => {
    if (currentPage && pageSpecificMessages[currentPage as keyof typeof pageSpecificMessages]) {
      const messages = pageSpecificMessages[currentPage as keyof typeof pageSpecificMessages];
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setTimeout(() => {
        showMascotMessage(randomMsg, 'thinking');
      }, 1000); // Small delay to let page load
    }
  }, [currentPage, pageSpecificMessages]);

  // Random messages and animations
  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) { // 30% chance every interval
        const randomMsg = randomMessages[Math.floor(Math.random() * randomMessages.length)];
        const states: Array<'talking' | 'thinking' | 'celebrating'> = ['talking', 'thinking', 'celebrating'];
        const randomState = states[Math.floor(Math.random() * states.length)];
        showMascotMessage(randomMsg, randomState);
      }
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, [randomMessages]);

  // Add event listeners for drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      dragRef.current = null;
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const showMascotMessage = (msg: string, state: 'idle' | 'talking' | 'celebrating' | 'thinking' | 'waving' = 'talking') => {
    setMessage(msg);
    setCurrentState(state);
    setShowMessage(true);

    // Clear existing timeouts
    if (messageTimeoutRef.current) clearTimeout(messageTimeoutRef.current);
    if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);

    // Hide message after 4 seconds
    messageTimeoutRef.current = window.setTimeout(() => {
      setShowMessage(false);
    }, 4000);

    // Return to idle after 5 seconds
    stateTimeoutRef.current = window.setTimeout(() => {
      setCurrentState('idle');
    }, 5000);
  };

  // Custom messages for specific user actions (can be called from other components)
  useEffect(() => {
    const handleCustomMessage = (event: CustomEvent<{ message: string; type?: string }>) => {
      const { message, type = 'talking' } = event.detail;
      showMascotMessage(message, type as 'idle' | 'talking' | 'celebrating' | 'thinking' | 'waving');
    };

    window.addEventListener('mascot-message', handleCustomMessage as EventListener);
    return () => {
      window.removeEventListener('mascot-message', handleCustomMessage as EventListener);
    };
  }, []);

  const getMascotAnimation = () => {
    switch (currentState) {
      case 'talking':
        return 'animate-bounce';
      case 'celebrating':
        return 'animate-spin';
      case 'thinking':
        return 'animate-pulse';
      case 'waving':
        return 'animate-pulse';
      default:
        return 'animate-float';
    }
  };

  const getMascotExpression = () => {
    switch (currentState) {
      case 'talking':
        return '😄';
      case 'celebrating':
        return '🎉';
      case 'thinking':
        return '🤔';
      case 'waving':
        return '👋';
      default:
        return '😊';
    }
  };

  if (!isVisible) return null;

  // Add drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragRef.current) {
      const newX = e.clientX - dragRef.current.x;
      const newY = e.clientY - dragRef.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragRef.current = null;
  };

  return (
    <>
      {/* Mascot Character */}
      <div 
        className={`fixed z-40 ${className}`}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="relative">
          {/* Message Bubble */}
          {showMessage && message && (
            <div className="absolute left-full ml-4 top-0 animate-fadeInUp">
              <div className="relative bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-6 py-3 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 w-96 max-w-[400px] min-w-[320px]">
                <p className="text-sm font-medium leading-snug whitespace-nowrap overflow-hidden text-ellipsis">{message}</p>
                {/* Speech bubble tail */}
                <div className="absolute left-0 top-1/2 -translate-x-2 -translate-y-1/2">
                  <div className="border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white dark:border-r-gray-800"></div>
                </div>
              </div>
            </div>
          )}

          {/* Mascot Body */}
          <div className={`relative ${getMascotAnimation()}`}>
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-600 rounded-full blur-lg opacity-30 animate-pulse"></div>
            
            {/* Main Character */}
            <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full shadow-2xl border-4 border-white dark:border-gray-800 overflow-hidden cursor-pointer hover:scale-110 transition-all duration-300"
                 onClick={() => showMascotMessage("Hi there! Need any help? 👋", 'waving')}>
              
              {/* Character Face */}
              <div className="absolute inset-0 flex items-center justify-center text-2xl">
                {getMascotExpression()}
              </div>

              {/* Sparkle Effects */}
              <div className="absolute top-1 left-1 w-1 h-1 bg-white rounded-full animate-twinkle"></div>
              <div className="absolute top-3 right-2 w-1 h-1 bg-white rounded-full animate-twinkle delay-500"></div>
              <div className="absolute bottom-2 left-3 w-1 h-1 bg-white rounded-full animate-twinkle delay-1000"></div>
            </div>
          </div>

          {/* Minimize/Close Button */}
          <button
            onClick={() => setIsVisible(false)}
            className="absolute -top-2 -right-2 w-6 h-6 bg-gray-600 hover:bg-gray-700 text-white rounded-full flex items-center justify-center text-xs transition-colors duration-200"
            title="Hide mascot"
          >
            ×
          </button>
        </div>
      </div>

      {/* Restore Button (when hidden) */}
      {!isVisible && (
        <div
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
          }}
          className="fixed z-40"
        >
          <button
            onClick={() => setIsVisible(true)}
            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg flex items-center justify-center text-xl transition-all duration-300 hover:scale-110"
            title="Show BloxBot"
          >
            🤖
          </button>
        </div>
      )}
    </>
  );
};

export default BloxMascot;