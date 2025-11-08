import { useApp } from '../App';
import { useAuth } from '../App';
import { 
  ArrowRight, 
  Shield, 
  Users, 
  TrendingUp,
  Trophy,
  ChevronDown,
  UserPlus,
  ShoppingBag,
  Image
} from 'lucide-react';
import { Button } from './ui/button';
import { GlassCard, PremiumCard } from './ui/card-container';
import { useInView } from 'react-intersection-observer';

export function LandingPage() {
  const { setCurrentPage } = useApp();
  const { isLoggedIn } = useAuth();

  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.1, triggerOnce: true });
  const { ref: featuresRef, inView: featuresInView } = useInView({ threshold: 0.1, triggerOnce: true });
  const { ref: ctaRef, inView: ctaInView } = useInView({ threshold: 0.1, triggerOnce: true });

  const handleGetStarted = () => {
    setCurrentPage('auth');
  };

  const handleGoToDashboard = () => {
    setCurrentPage('dashboard');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const features = [
    {
      icon: Shield,
      title: "SAFE",
      subtitle: "Trusted Middleman",
      description: "Our verified middleman service ensures every trade is secure. Trade with confidence knowing your items are protected.",
      color: "#00B2FF",
      bgGradient: "from-[#00B2FF]/20 to-[#0088CC]/20"
    },
    {
      icon: Image,
      title: "SHOWCASE",
      subtitle: "Display Your Collection",
      description: "Create stunning showcases of your Roblox items. Share your inventory and attract potential traders with style.",
      color: "#FFD700",
      bgGradient: "from-[#FFD700]/20 to-[#FFA500]/20"
    },
    {
      icon: Users,
      title: "COMMUNITY",
      subtitle: "Connect & Trade",
      description: "Join thousands of active traders. Network, negotiate, and build your reputation in our vibrant community.",
      color: "#FF2D2D",
      bgGradient: "from-[#FF2D2D]/20 to-[#CC0000]/20"
    },
    {
      icon: TrendingUp,
      title: "MARKET",
      subtitle: "Real-Time Pricing",
      description: "Stay updated with market trends and item values. Make informed trading decisions with our price tracking tools.",
      color: "#00FF88",
      bgGradient: "from-[#00FF88]/20 to-[#00CC66]/20"
    }
  ];

  return (
    <div 
      className="min-h-screen overflow-x-hidden relative"
      style={{
        backgroundImage: 'url(/landingpage.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Background Overlay for Better Text Readability */}
      <div className="absolute inset-0 bg-black/0 z-0" />
      
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Additional Gradient Overlay for Hero Section */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/50 z-5" />

        {/* Content Container */}
        <div className={`relative z-20 container mx-auto px-6 text-center transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Badge */}
          <GlassCard className="inline-flex items-center gap-2 border-[#00B2FF] rounded-full px-6 py-2 mb-8" opacity={100} blur="xl">
            <Shield className="w-4 h-4 text-[#00B2FF]" />
            <span className="text-[#00B2FF] font-bold">TRUSTED TRADING PLATFORM</span>
          </GlassCard>

          {/* Logo */}
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-3xl mb-8 shadow-2xl overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-[#00B2FF] to-[#FF2D2D] flex items-center justify-center">
              <img 
                src="/NEWLOGO1.gif" 
                alt="BloxMarket Logo" 
                className="w-28 h-28 object-contain rounded-2xl"
              />
            </div>
          </div>


          {/* Second Line */}
          <div className="relative mb-8">
            <h1
              className="text-5xl md:text-6xl lg:text-7xl uppercase tracking-tight relative z-10"
              style={{
                fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                background: "linear-gradient(180deg, #00B2FF 0%, #0088CC 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 4px 20px rgba(255, 45, 45, 0.5))"
              }}
            >
              TRADE SAFE
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto">
            The ultimate social marketplace for Roblox items. Showcase your collection, trade safely with trusted middlemen, and join a thriving community of collectors.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            {!isLoggedIn ? (
              <>
                <Button
                  onClick={handleGetStarted}
                  size="lg"
                  className="bg-[#00B2FF] hover:bg-[#0099DD] text-white px-8 py-6 uppercase tracking-wider shadow-lg shadow-[#00B2FF]/50 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[#00B2FF]/70"
                  style={{
                    fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif"
                  }}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  JOIN COMMUNITY
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGoToDashboard}
                size="lg"
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-bold px-12 py-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg group"
              >
                <Trophy className="mr-3 w-6 h-6 group-hover:animate-bounce" />
                GO TO DASHBOARD
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </Button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-3xl mx-auto">
            {[
              { value: "50K+", label: "MEMBERS" },
              { value: "100K+", label: "TRADES" },
              { value: "24/7", label: "SUPPORT" }
            ].map((stat, index) => (
              <div key={index} className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00B2FF]/20 to-[#FF2D2D]/20 rounded-2xl blur-xl" />
                <GlassCard className="relative border-[#00B2FF] p-6" opacity={100} blur="xl">
                  <div
                    className="text-3xl md:text-4xl mb-2"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-400 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </GlassCard>
              </div>
            ))}
          </div>

          {/* Scroll Indicator */}
          <div className="animate-bounce-slow mt-16">
            <button
              onClick={() => scrollToSection('features')}
              className="text-white/70 hover:text-white transition-colors"
            >
              <ChevronDown className="w-8 h-8 mx-auto" />
              <p className="text-sm mt-2 uppercase tracking-wide">SCROLL TO EXPLORE</p>
            </button>
          </div>
        </div>

        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent z-10" />
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="relative py-32 overflow-hidden">
        {/* Background Layer with Semi-transparent Overlay */}
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-0 w-64 h-64 bg-[#00B2FF] opacity-10 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-0 w-64 h-64 bg-[#FF2D2D] opacity-10 rounded-full blur-3xl animate-bounce-slow" />

        <div className="relative z-10 container mx-auto px-6">
          {/* Section Title */}
          <div className={`text-center mb-20 transition-all duration-1000 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="relative inline-block">
              <h2
                className="text-5xl md:text-7xl uppercase tracking-tight mb-4"
                style={{
                  fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                  background: "linear-gradient(180deg, #FFFFFF 0%, #888888 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 4px 20px rgba(0, 1, 2, 0.3))"
                }}
              >
                WHY BLOXMARKET
              </h2>
              <div className={`h-2 bg-gradient-to-r from-[#00B2FF] via-[#FFD700] to-[#FF2D2D] mx-auto transition-all duration-1000 ${featuresInView ? 'w-full' : 'w-0'}`} />
            </div>
            <p className="text-xl text-gray-400 mt-6 uppercase tracking-wide">
              THE MOST TRUSTED TRADING PLATFORM
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`relative group transition-all duration-700 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  {/* Glow Effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  
                  {/* Card */}
                  <GlassCard className="relative border-[#404448] rounded-3xl p-8 h-full transition-all duration-300 group-hover:border-[#00B2FF] group-hover:scale-105" opacity={100} blur="xl">
                    {/* Icon */}
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:rotate-12"
                      style={{
                        background: `linear-gradient(135deg, ${feature.color}40, ${feature.color}20)`,
                        border: `2px solid ${feature.color}`
                      }}
                    >
                      <Icon style={{ color: feature.color }} className="w-8 h-8" />
                    </div>

                    {/* Title */}
                    <h3
                      className="text-3xl mb-2 uppercase tracking-tight"
                      style={{
                        fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                        color: feature.color
                      }}
                    >
                      {feature.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="text-white mb-4 uppercase tracking-wide">
                      {feature.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-gray-400">
                      {feature.description}
                    </p>

                    {/* Corner Accent */}
                    <div
                      className="absolute top-4 right-4 w-3 h-3 rounded-full"
                      style={{ backgroundColor: feature.color }}
                    />
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section ref={ctaRef} className="relative py-32 overflow-hidden">
        {/* Background Layer with Semi-transparent Overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Animated Background Elements */}
        <div
          className="absolute top-0 left-0 w-full h-full animate-pulse-slow"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(0, 178, 255, 0.15) 100%, transparent 10%),
                             radial-gradient(circle at 80% 50%, rgba(255, 45, 45, 0.15) 100%, transparent 10%)`
          }}
        />

        <div className="relative z-10 container mx-auto px-6">
          <div className={`max-w-5xl mx-auto transition-all duration-1000 ${ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Card Container with Layers */}
            <div className="relative">
              {/* Shadow Layer */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#00B2FF] to-[#FF2D2D] rounded-[3rem] blur-2xl opacity-30" />
              <div className="absolute inset-0 translate-x-4 translate-y-4 bg-[#1a1c1e] rounded-[3rem]" />

              {/* Main Card */}
              <PremiumCard className="relative border-4 rounded-[3rem] p-12 md:p-16 overflow-hidden" opacity={100} blur="xl">
                {/* Decorative Corner Elements */}
                <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-[#00B2FF] rounded-tl-[3rem]" />
                <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-[#FF2D2D] rounded-br-[3rem]" />

                {/* Icon */}
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 bg-gradient-to-br from-[#00B2FF] to-[#0088CC] rounded-3xl flex items-center justify-center shadow-2xl shadow-[#00B2FF]/50 animate-bounce-slow">
                    <UserPlus className="w-12 h-12 text-white" />
                  </div>
                </div>

                {/* Main Headlines */}
                <div className="text-center mb-6">
                  <h2
                    className="text-5xl md:text-7xl uppercase tracking-tight relative mb-4"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      background: "linear-gradient(180deg, #ffffffff 0%, #000000ff 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent"
                    }}
                  >
                    JOIN THE
                  </h2>
                  <h2
                    className="text-5xl md:text-7xl uppercase tracking-tight relative"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      background: "linear-gradient(180deg, #00B2FF 0%, #0088CC 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 4px 30px rgba(0, 178, 255, 0.6))"
                    }}
                  >
                    COMMUNITY
                  </h2>
                </div>

                {/* Description */}
                <p className="text-xl md:text-2xl text-gray-300 text-center mb-12 max-w-3xl mx-auto">
                  Start trading safely today. Showcase your items, connect with trusted traders, and grow your collection with BloxMarket's secure platform.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
                  {!isLoggedIn ? (
                    <>
                      <Button
                        onClick={handleGetStarted}
                        size="lg"
                        className="bg-gradient-to-r from-[#00B2FF] to-[#0088CC] hover:from-[#0099DD] hover:to-[#0077BB] text-white px-10 py-7 uppercase tracking-wider shadow-2xl shadow-[#00B2FF]/50 transition-all hover:scale-110 hover:shadow-[#00B2FF]/70 border-2 border-[#00B2FF]"
                        style={{
                          fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif"
                        }}
                      >
                        CREATE ACCOUNT
                        <ArrowRight className="ml-2 h-6 w-6" />
                      </Button>
                      
                    </>
                  ) : (
                    <Button
                      onClick={handleGoToDashboard}
                      size="lg"
                      className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-bold px-12 py-6 rounded-2xl shadow-2xl transform hover:scale-105 transition-all duration-300 text-lg group"
                    >
                      <Trophy className="mr-3 w-6 h-6 group-hover:animate-bounce" />
                      CONTINUE TRADING
                      <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="flex flex-col sm:flex-row gap-8 justify-center items-center pt-12 border-t-2 border-[#404448]">
                  {[
                    { label: "VERIFIED TRADES", value: "100K+" },
                    { label: "ACTIVE USERS", value: "50K+" },
                    { label: "TRUST RATING", value: "4.9★" }
                  ].map((stat, index) => (
                    <div key={index} className="text-center">
                      <div
                        className="text-3xl mb-1"
                        style={{
                          fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                          background: "linear-gradient(180deg, #FFD700 0%, #FFA500 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent"
                        }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-sm text-gray-400 uppercase tracking-wider">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>
              </PremiumCard>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}