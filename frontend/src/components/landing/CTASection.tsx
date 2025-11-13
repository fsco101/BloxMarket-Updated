import { 
  faArrowRight,
  faUserPlus, 
  faTrophy,
  faStar,
  faCrown,
  faGem,
  faLock,
  faUsers
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button } from '../ui/button';
import { PremiumCard } from '../ui/card-container';
import { useInView } from 'react-intersection-observer';
import { 
  TypingAnimation, 
  FadeInAnimation, 
  ShimmerText, 
  TextWave,
  FlipWords 
} from '../ui/text-animations';

interface CTASectionProps {
  isLoggedIn: boolean;
  onGetStarted: () => void;
  onGoToDashboard: () => void;
}

export function CTASection({ 
  isLoggedIn, 
  onGetStarted, 
  onGoToDashboard 
}: CTASectionProps) {
  const { ref: ctaRef, inView: ctaInView } = useInView({ threshold: 0.1, triggerOnce: true });

  return (
    <section ref={ctaRef} className="relative py-40 overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-950">
      {/* Beautified Dark Background Base Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      
      {/* Enhanced Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[length:50px_50px] opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />
      
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,_transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] opacity-30" />
      
      {/* Dynamic Animated Background Elements */}
      <div className="absolute inset-0">
        <div
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 30%, rgba(0, 178, 255, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 85% 70%, rgba(255, 45, 45, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.1) 0%, transparent 50%)
            `,
            animation: "gradient-move 8s ease-in-out infinite"
          }}
        />
        
        {/* Floating Orbs */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-full blur-xl animate-float-1" />
        <div className="absolute top-40 right-20 w-28 h-28 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-xl animate-float-2" />
        <div className="absolute bottom-20 left-1/3 w-24 h-24 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-full blur-xl animate-float-3" />
        <div className="absolute bottom-40 right-1/3 w-36 h-36 bg-gradient-to-r from-green-500/20 to-teal-500/20 rounded-full blur-xl animate-float-4" />
      </div>

      {/* Sparkling Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <FontAwesomeIcon
            key={i}
            icon={faStar}
            className="absolute text-white/20 animate-twinkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              fontSize: `${0.5 + Math.random() * 1}rem`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6">
        <div className={`max-w-6xl mx-auto transition-all duration-1000 ${ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          {/* Enhanced Card Container with Multi-layer Design */}
          <div className="relative">
            {/* Outer Glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-[#00B2FF] via-[#8A2BE2] to-[#FF2D2D] rounded-[4rem] blur-3xl opacity-30 animate-pulse-glow" />
            
            {/* Shadow Layer */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00B2FF]/20 to-[#FF2D2D]/20 rounded-[3.5rem] blur-2xl opacity-40" />
            <div className="absolute inset-0 translate-x-6 translate-y-6 bg-black/60 rounded-[3.5rem] backdrop-blur-sm" />

            {/* Main Card Container */}
            <PremiumCard 
              className="relative border-4 rounded-[3.5rem] p-16 md:p-20 overflow-hidden backdrop-blur-xl" 
              opacity={98} 
              blur="xl"
            >
              {/* Enhanced Decorative Corner Elements */}
              <div className="absolute top-0 left-0 w-40 h-40 border-l-4 border-t-4 border-[#00B2FF] rounded-tl-[3.5rem] opacity-80" />
              <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-[#00B2FF]/20 to-transparent rounded-tl-[3.5rem]" />
              
              <div className="absolute bottom-0 right-0 w-40 h-40 border-r-4 border-b-4 border-[#FF2D2D] rounded-br-[3.5rem] opacity-80" />
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[#FF2D2D]/20 to-transparent rounded-br-[3.5rem]" />

              {/* Floating Accent Elements */}
              <div className="absolute top-8 right-8 flex items-center gap-2">
                <FontAwesomeIcon icon={faCrown} className="w-6 h-6 text-[#FFD700] animate-spin-slow" />
                <FontAwesomeIcon icon={faGem} className="w-5 h-5 text-[#00B2FF] animate-pulse" />
              </div>

              {/* Enhanced Icon with Particle Effects */}
              <div className="flex justify-center mb-12 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF] via-[#8A2BE2] to-[#FF2D2D] rounded-full blur-2xl opacity-50 animate-pulse-glow" />
                <div className="relative w-32 h-32 bg-gradient-to-br from-[#00B2FF] via-[#0088CC] to-[#006699] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-[#00B2FF]/60 transform hover:scale-110 hover:rotate-6 transition-all duration-500 group">
                  <FontAwesomeIcon icon={faUserPlus} className="w-16 h-16 text-white group-hover:animate-bounce" />
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Particle Ring */}
                  <div className="absolute inset-0 rounded-full">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-2 h-2 bg-white/60 rounded-full animate-orbit"
                        style={{
                          top: '50%',
                          left: '50%',
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px)`,
                          animationDelay: `${i * 0.125}s`
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Enhanced Main Headlines with Text Animations and 3D Effect */}
              <div className="text-center mb-8 relative">
                <div className="absolute inset-0 transform translate-x-2 translate-y-2 opacity-20">
                  <h2
                    className="text-6xl md:text-8xl lg:text-9xl uppercase tracking-tight"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#000000"
                    }}
                  >
                    <TextWave text="JOIN THE" delay={50} />
                  </h2>
                  <h2
                    className="text-6xl md:text-8xl lg:text-9xl uppercase tracking-tight"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      color: "#000000"
                    }}
                  >
                    <TextWave text="COMMUNITY" delay={50} />
                  </h2>
                </div>
                
                <div className="relative z-10">
                  <h2
                    className="text-6xl md:text-8xl lg:text-9xl uppercase tracking-tight mb-4"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      background: "linear-gradient(45deg, #FFFFFF 0%, #F8F8F8 25%, #FFFFFF 50%, #F0F0F0 75%, #FFFFFF 100%)",
                      backgroundSize: "400% 400%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      animation: "title-shimmer 4s ease-in-out infinite",
                      filter: "drop-shadow(0 4px 20px rgba(255, 255, 255, 0.5))"
                    }}
                  >
                    <FadeInAnimation delay={300} direction="up">
                      <ShimmerText text="JOIN THE" shimmerColor="rgba(255, 255, 255, 0.9)" />
                    </FadeInAnimation>
                  </h2>
                  <h2
                    className="text-6xl md:text-8xl lg:text-9xl uppercase tracking-tight"
                    style={{
                      fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                      background: "linear-gradient(45deg, #00B2FF 0%, #33C3FF 25%, #00AAFF 50%, #0099DD 75%, #00B2FF 100%)",
                      backgroundSize: "400% 400%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 8px 40px rgba(0, 178, 255, 1.0))",
                      animation: "community-glow 3s ease-in-out infinite"
                    }}
                  >
                    <FadeInAnimation delay={600} direction="up">
                      <ShimmerText text="COMMUNITY" shimmerColor="rgba(0, 178, 255, 0.9)" />
                    </FadeInAnimation>
                  </h2>
                </div>
              </div>

              {/* Enhanced Description with Text Animations */}
              <div className="text-center mb-16 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl blur-sm" />
                <FadeInAnimation delay={900} direction="up">
                  <p className="relative text-2xl md:text-3xl text-white max-w-4xl mx-auto leading-relaxed">
                    <TypingAnimation text="Start trading safely today." speed={40} delay={1000} showCursor={false} />
                    <br />
                    <span className="text-[#00B2FF] font-bold">
                      <FlipWords words={['Showcase your items', 'Display your collection', 'Share your inventory']} />
                    </span>, 
                    connect with <span className="text-[#FFD700] font-bold">
                      <TextWave text="trusted traders" delay={80} />
                    </span>, 
                    <br />
                    and grow your collection with <span className="text-[#FF2D2D] font-bold">BloxMarket's secure platform</span>.
                  </p>
                </FadeInAnimation>
                <FadeInAnimation delay={1400} direction="up">
                  <div className="mt-6 flex items-center justify-center gap-4 text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-ping" />
                      <span>Live Support</span>
                    </div>
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                      <span>Instant Trading</span>
                    </div>
                    <div className="w-1 h-1 bg-white rounded-full" />
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
                      <span>Secure Platform</span>
                    </div>
                  </div>
                </FadeInAnimation>
              </div>

              {/* Enhanced CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-8 justify-center items-center mb-20">
                {!isLoggedIn ? (
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-[#00B2FF] via-[#0088CC] to-[#00B2FF] rounded-[1.5rem] blur-lg opacity-70 group-hover:opacity-100 group-hover:blur-xl transition-all duration-500 animate-pulse-glow" />
                    <Button
                      onClick={onGetStarted}
                      size="lg"
                      className="relative bg-gradient-to-r from-[#00B2FF] via-[#0088CC] to-[#00B2FF] hover:from-[#0099DD] hover:to-[#0077BB] text-white px-16 py-10 text-xl uppercase tracking-wider shadow-2xl transform hover:scale-110 hover:rotate-1 transition-all duration-500 border-4 border-white/30 rounded-[1.5rem] overflow-hidden group"
                      style={{
                        fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif"
                      }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <div className="relative flex items-center">
                        <FontAwesomeIcon icon={faUserPlus} className="mr-4 h-7 w-7 group-hover:animate-bounce" />
                        CREATE ACCOUNT
                        <FontAwesomeIcon icon={faArrowRight} className="ml-4 h-7 w-7 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </Button>
                  </div>
                ) : (
                  <div className="relative group">
                    <div className="absolute -inset-2 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-[1.5rem] blur-lg opacity-70 group-hover:opacity-100 group-hover:blur-xl transition-all duration-500 animate-pulse-glow" />
                    <Button
                      onClick={onGoToDashboard}
                      size="lg"
                      className="relative bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 hover:from-green-700 hover:to-purple-700 text-white font-black px-20 py-10 rounded-[1.5rem] shadow-2xl transform hover:scale-110 hover:-rotate-1 transition-all duration-500 text-2xl group border-4 border-white/30 overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <div className="relative flex items-center">
                        <FontAwesomeIcon icon={faTrophy} className="mr-5 w-8 h-8 group-hover:animate-spin" />
                        CONTINUE TRADING
                        <FontAwesomeIcon icon={faArrowRight} className="ml-5 w-8 h-8 group-hover:translate-x-3 transition-transform" />
                      </div>
                    </Button>
                  </div>
                )}
              </div>

              {/* Enhanced Stats Bar with Animated Counters */}
              <div className="relative pt-16 border-t-4 border-gradient-to-r from-[#00B2FF] via-transparent to-[#FF2D2D]">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00B2FF] via-[#FFD700] to-[#FF2D2D] rounded-full" />
                
                <div className="flex flex-col sm:flex-row gap-12 justify-center items-center mt-8">
                  {[
                    { label: "VERIFIED TRADES", value: "100K+", color: "#00B2FF", icon: faLock },
                    <div>

                    </div>,
                    { label: "ACTIVE USERS", value: "50K+", color: "#FFD700", icon: faUsers },
                    <div>
                      
                    </div>,
                    { label: "TRUST RATING", value: "4.9★", color: "#FF2D2D", icon: faStar }
                  ].map((stat, index) => (
                    <div key={index} className="text-center relative group">
                      <div className="absolute -inset-4 bg-gradient-to-br from-white/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative">
                        <div className="text-2xl mb-2">
                          <FontAwesomeIcon icon={stat.icon} className="text-3xl" style={{ color: stat.color }} />
                        </div>
                        <div
                          className="text-4xl md:text-5xl mb-2 font-black"
                          style={{
                            fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                            color: stat.color,
                            textShadow: `0 0 30px ${stat.color}80, 0 2px 10px rgba(0, 0, 0, 0.9)`,
                            filter: `drop-shadow(0 4px 15px ${stat.color}40)`
                          }}
                        >
                          {stat.value}
                        </div>
                        <div className="text-sm text-white uppercase tracking-wider font-bold">
                          {stat.label}
                        </div>
                        <div className="mt-2 w-16 h-1 mx-auto rounded-full transition-all group-hover:w-20" style={{ backgroundColor: stat.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Accent */}
              <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-3">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-full bg-gradient-to-r from-[#00B2FF] to-[#FF2D2D] animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </PremiumCard>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes gradient-move {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-20px) scale(1.05); }
          }
          
          @keyframes title-shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          @keyframes community-glow {
            0%, 100% { filter: drop-shadow(0 8px 40px rgba(0, 178, 255, 0.8)); }
            50% { filter: drop-shadow(0 12px 60px rgba(0, 178, 255, 1.2)); }
          }
          
          @keyframes pulse-glow {
            0%, 100% { opacity: 0.5; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.02); }
          }
          
          @keyframes float-1 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(120deg); }
            66% { transform: translateY(-10px) rotate(240deg); }
          }
          
          @keyframes float-2 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(180deg); }
          }
          
          @keyframes float-3 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-12px) rotate(90deg); }
            75% { transform: translateY(-8px) rotate(270deg); }
          }
          
          @keyframes float-4 {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            40% { transform: translateY(-18px) rotate(144deg); }
            80% { transform: translateY(-5px) rotate(288deg); }
          }
          
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.2); }
          }
          
          @keyframes orbit {
            from { transform: translate(-50%, -50%) rotate(0deg) translateY(-60px) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg) translateY(-60px) rotate(-360deg); }
          }
          
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          .animate-float-1 { animation: float-1 8s ease-in-out infinite; }
          .animate-float-2 { animation: float-2 6s ease-in-out infinite; }
          .animate-float-3 { animation: float-3 10s ease-in-out infinite; }
          .animate-float-4 { animation: float-4 12s ease-in-out infinite; }
          .animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
          .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
          .animate-orbit { animation: orbit 3s linear infinite; }
          .animate-spin-slow { animation: spin-slow 8s linear infinite; }
        `
      }} />
    </section>
  );
}