import { 
  faArrowRight,
  faShield,
  faTrophy,
  faChevronDown,
  faShoppingBag,
  faUsers,
  faBriefcase,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '../ui/button';
import { GlassCard } from '../ui/card-container';
import { useInView } from 'react-intersection-observer';
import { 
  TypingAnimation, 
  FadeInAnimation, 
  ShimmerText, 
  TextWave,
  FlipWords,
  StaggeredAnimation 
} from '../ui/text-animations';

interface HeroSectionProps {
  isLoggedIn: boolean;
  onGetStarted: () => void;
  onGoToDashboard: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export function HeroSection({ 
  isLoggedIn, 
  onGetStarted, 
  onGoToDashboard, 
  onScrollToSection 
}: HeroSectionProps) {
  const { ref: heroRef, inView: heroInView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Hero section content will use the background from parent LandingPage */}
      
      {/* Animated Background Orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-pink-500/20 to-red-500/20 rounded-full blur-3xl animate-bounce-slow" />
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full blur-2xl animate-pulse" />

      {/* Content Container */}
      <div className={`relative z-20 container mx-auto px-6 text-center transition-all duration-1000 ${heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        {/* Enhanced Floating Badge */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF] to-[#FF2D2D] rounded-full blur-md opacity-50 animate-pulse" />
          <GlassCard className="relative inline-flex items-center gap-3 border-2 border-[#00B2FF] rounded-full px-8 py-3 backdrop-blur-xl shadow-2xl" opacity={95} blur="xl">
            <FontAwesomeIcon icon={faShield} className="w-5 h-5 text-[#00B2FF] animate-pulse drop-shadow-lg" />
            <span className="text-[#00B2FF] font-black text-sm tracking-wider drop-shadow-lg" style={{ textShadow: '0 2px 8px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 178, 255, 0.5)' }}>TRUSTED TRADING PLATFORM</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-ping drop-shadow-lg" />
          </GlassCard>
        </div>

        {/* Enhanced Logo with Floating Animation */}
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#00B2FF] via-[#FF2D2D] to-[#FFD700] rounded-3xl blur-2xl opacity-40 animate-pulse-slow" />
          <div className="relative inline-flex items-center justify-center w-40 h-40 rounded-3xl shadow-2xl overflow-hidden transform hover:scale-110 transition-transform duration-500 animate-float">
            <div className="w-full h-full bg-gradient-to-br from-[#00B2FF] via-[#8A2BE2] to-[#FF2D2D] flex items-center justify-center">
              <img 
                src="/NEWLOGO1.gif" 
                alt="BloxMarket Logo" 
                className="w-200 h-200 object-contain rounded-2xl"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Main Title with Text Animations and 3D Effect */}
        <div className="relative mb-10">
          <div className="absolute inset-0 transform translate-x-3 translate-y-3">
            <h1
              className="text-5xl md:text-6xl lg:text-8xl uppercase tracking-tight"
              style={{
                fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                color: "rgba(0, 0, 0, 0.6)",
                textShadow: '0 0 20px rgba(0, 0, 0, 0.8)'
              }}
            >
              <TextWave text="TRADE SAFE" delay={50} />
            </h1>
          </div>
          <h1
            className="relative text-5xl md:text-6xl lg:text-8xl uppercase tracking-tight z-10 animate-title-glow"
            style={{
              fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
              background: "linear-gradient(45deg, #00B2FF 0%, #FFD700 25%, #FF2D2D 50%, #00FF88 75%, #8A2BE2 100%)",
              backgroundSize: "400% 400%",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 8px 40px rgba(0, 178, 255, 0.8)) drop-shadow(0 0 60px rgba(0, 0, 0, 0.9))",
              animation: "gradient-shift 3s ease-in-out infinite",
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 0 40px rgba(255, 255, 255, 0.3)'
            }}
          >
            <FadeInAnimation delay={500} direction="up">
              <ShimmerText text="TRADE SAFE" shimmerColor="rgba(255, 255, 255, 0.9)" />
            </FadeInAnimation>
          </h1>
        </div>

        {/* Enhanced Subtitle with Text Animations */}
        <div className="relative mb-14">
          <FadeInAnimation delay={1000} direction="up">
            <p className="text-xl md:text-3xl text-white max-w-4xl mx-auto leading-relaxed" 
               style={{ 
                 textShadow: '0 4px 20px rgba(0, 0, 0, 0.9), 0 2px 10px rgba(0, 0, 0, 0.8)', 
                 filter: 'drop-shadow(0 0 30px rgba(0, 0, 0, 0.7))' 
               }}>
              The <span className="text-[#00B2FF] font-bold" style={{ textShadow: '0 0 20px rgba(0, 178, 255, 0.8), 0 2px 10px rgba(0, 0, 0, 0.9)' }}>
                <FlipWords words={['ultimate social marketplace', 'safest trading platform', 'premier community hub']} />
              </span> for Roblox items. 
              <br />
              <TypingAnimation 
                text="Showcase your collection, trade safely with trusted middlemen," 
                speed={30} 
                delay={2000}
                showCursor={false}
              />
              <br />
              and join a <span className="text-[#FF2D2D] font-bold" style={{ textShadow: '0 0 20px rgba(255, 45, 45, 0.8), 0 2px 10px rgba(0, 0, 0, 0.9)' }}>
                <TextWave text="thriving community" delay={80} />
              </span> of collectors.
            </p>
          </FadeInAnimation>
        </div>

        {/* Enhanced CTA Buttons with Hover Effects */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
          {!isLoggedIn ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF] via-[#0088CC] to-[#00B2FF] rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
              <Button
                onClick={onGetStarted}
                size="lg"
                className="relative bg-gradient-to-r from-[#00B2FF] via-[#0088CC] to-[#00B2FF] hover:from-[#0099DD] hover:to-[#0077BB] text-white px-12 py-8 text-lg uppercase tracking-wider shadow-2xl transform hover:scale-110 hover:rotate-1 transition-all duration-300 border-4 border-white/40"
                style={{
                  fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 178, 255, 0.5)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 178, 255, 0.3)'
                }}
              >
                <FontAwesomeIcon icon={faShoppingBag} className="mr-3 h-6 w-6 animate-bounce drop-shadow-lg" />
                JOIN COMMUNITY
                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 hover:opacity-100 transition-opacity" />
              </Button>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition-opacity animate-pulse" />
              <Button
                onClick={onGoToDashboard}
                size="lg"
                className="relative bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 hover:from-green-700 hover:to-purple-700 text-white font-black px-16 py-8 rounded-2xl shadow-2xl transform hover:scale-110 hover:-rotate-1 transition-all duration-300 text-xl group border-4 border-white/40"
                style={{
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 255, 0, 0.3)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), 0 0 60px rgba(0, 255, 136, 0.3)'
                }}
              >
                <FontAwesomeIcon icon={faTrophy} className="mr-4 w-7 h-7 group-hover:animate-spin drop-shadow-lg" />
                GO TO DASHBOARD
                <FontAwesomeIcon icon={faArrowRight} className="ml-4 w-7 h-7 group-hover:translate-x-2 transition-transform drop-shadow-lg" />
                <div className="absolute inset-0 bg-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </div>
          )}
        </div>

        {/* Enhanced Stats with Staggered Text Animations and 3D Cards */}
        <StaggeredAnimation staggerDelay={200} className="grid grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
          {[
            { value: "50K+", label: "MEMBERS", color: "#00B2FF", icon: faUsers },
            { value: "100K+", label: "TRADES", color: "#FFD700", icon: faBriefcase },
            { value: "24/7", label: "SUPPORT", color: "#FF2D2D", icon: faLock }
          ].map((stat, index) => (
            <div key={index} className="relative group transform hover:scale-110 transition-all duration-500" style={{ animationDelay: `${index * 200}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-br opacity-50 rounded-3xl blur-xl transition-all duration-500 group-hover:blur-2xl group-hover:scale-110`} 
                   style={{ background: `linear-gradient(135deg, ${stat.color}40, ${stat.color}20)` }} />
              <div className="absolute inset-0 transform translate-x-2 translate-y-2 bg-black/60 rounded-3xl shadow-2xl" />
              <GlassCard className={`relative border-2 p-8 rounded-3xl transform hover:rotate-3 transition-all duration-500 backdrop-blur-xl`} 
                         opacity={95} blur="xl">
                <div className="absolute inset-0 border-2 rounded-3xl pointer-events-none" 
                     style={{ 
                       borderColor: stat.color,
                       boxShadow: `0 10px 40px rgba(0, 0, 0, 0.7), 0 0 30px ${stat.color}30`
                     }} />
                <div className="text-4xl mb-3 drop-shadow-lg">
                  <FontAwesomeIcon icon={stat.icon} style={{ color: stat.color }} />
                </div>
                <div
                  className="text-4xl md:text-5xl mb-3 animate-pulse font-black"
                  style={{
                    fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: stat.color,
                    textShadow: `0 0 30px ${stat.color}80, 0 4px 20px rgba(0, 0, 0, 0.9)`,
                    filter: `drop-shadow(0 2px 15px ${stat.color}50)`
                  }}
                >
                  <ShimmerText text={stat.value} shimmerColor={stat.color} />
                </div>
                <div className="text-xs text-white uppercase tracking-wider font-bold" style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)' }}>
                  <TextWave text={stat.label} delay={100} />
                </div>
                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full animate-ping`} 
                     style={{ backgroundColor: stat.color, boxShadow: `0 0 20px ${stat.color}` }} />
              </GlassCard>
            </div>
          ))}
        </StaggeredAnimation>

        {/* Enhanced Scroll Indicator with Animation */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/5 to-transparent rounded-full blur-md" />
          <button
            onClick={() => onScrollToSection('features')}
            className="relative text-white hover:text-white transition-all duration-500 group transform hover:scale-110"
            style={{ 
              textShadow: '0 2px 15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 255, 255, 0.3)',
              filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.6))'
            }}
          >
            <div className="relative">
              <FontAwesomeIcon icon={faChevronDown} className="w-10 h-10 mx-auto animate-bounce group-hover:animate-bounce-slow drop-shadow-2xl" 
                           style={{ filter: 'drop-shadow(0 0 20px rgba(255, 255, 255, 0.5))' }} />
              <div className="absolute inset-0 bg-white/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-sm mt-3 uppercase tracking-wider font-bold group-hover:tracking-widest transition-all"
               style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)' }}>
              SCROLL TO EXPLORE
            </p>
            <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto mt-2 group-hover:w-24 transition-all shadow-lg" 
                 style={{ filter: 'drop-shadow(0 0 10px rgba(255, 255, 255, 0.5))' }} />
          </button>
        </div>
      </div>

      {/* Enhanced Bottom Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10" />

      {/* Custom CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes gradient-shift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          @keyframes title-glow {
            0%, 100% { filter: drop-shadow(0 8px 40px rgba(0, 178, 255, 0.8)); }
            50% { filter: drop-shadow(0 12px 60px rgba(255, 45, 45, 0.9)); }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
          
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          .animate-float { animation: float 6s ease-in-out infinite; }
          .animate-title-glow { animation: title-glow 4s ease-in-out infinite; }
          .animate-fade-in-up { animation: fade-in-up 1s ease-out 0.5s both; }
          .animate-pulse-slow { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
          .animate-bounce-slow { animation: bounce 3s infinite; }
        `
      }} />
    </section>
  );
}