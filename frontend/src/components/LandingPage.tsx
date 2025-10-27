import { useTheme } from '../App';
import { useApp } from '../App';
import { useAuth } from '../App';
import { Switch } from './ui/switch';
import { Moon, Sun, ArrowRight, Shield, Users, Zap } from 'lucide-react';
import { Button } from './ui/button';

export function LandingPage() {
  const { isDark, toggleTheme } = useTheme();
  const { setCurrentPage } = useApp();
  const { isLoggedIn } = useAuth();

  const handleGetStarted = () => {
    setCurrentPage('auth');
  };

  const handleGoToDashboard = () => {
    setCurrentPage('dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/landingpage.jpg')`,
        }}
      />
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/70" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12">
        {/* Theme Toggle */}
        <div className="flex justify-end mb-8">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2 border border-white/20">
            {isDark ? <Moon className="w-4 h-4 text-white" /> : <Sun className="w-4 h-4 text-white" />}
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </div>

        {/* Hero Section */}
        <div className="text-center text-white">
          {/* Logo */}
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl mb-6 shadow-2xl">
            <span className="text-white font-bold text-3xl">BM</span>
          </div>

          {/* Main Heading with float and glow animation */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent animate-float animate-glow">
            BloxMarket
          </h1>
          
          {/* Subtitle with fade-in and slight movement */}
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-3xl mx-auto leading-relaxed animate-fadeInUp">
            The ultimate Roblox trading community. Buy, sell, and trade your favorite Roblox items with confidence in a secure, verified marketplace.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {!isLoggedIn ? (
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 text-lg"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleGoToDashboard}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 text-lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Features Section with animated titles */}
        <div className="mt-16 grid md:grid-cols-3 gap-8 text-white">
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Shield className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold mb-2 animate-scale-in">Secure Trading</h3>
            <p className="text-gray-300">
              Advanced security measures and verified users ensure safe transactions for all your Roblox trades.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Users className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold mb-2 animate-scale-in">Community Driven</h3>
            <p className="text-gray-300">
              Join thousands of active traders in our vibrant community with forums, events, and reputation system.
            </p>
          </div>
          
          <div className="text-center p-6 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
            <Zap className="w-12 h-12 mx-auto mb-4 text-green-400" />
            <h3 className="text-xl font-semibold mb-2 animate-scale-in">Instant Trades</h3>
            <p className="text-gray-300">
              Fast and efficient trading system with real-time notifications and wishlist management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}