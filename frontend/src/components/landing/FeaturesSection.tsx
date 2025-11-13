import { 
  Shield, 
  Users, 
  TrendingUp,
  Image,
  Sparkles,
  Zap
} from 'lucide-react';
import { GlassCard } from '../ui/card-container';
import { useInView } from 'react-intersection-observer';
import type { LucideIcon } from 'lucide-react';
import { 
  TypingAnimation, 
  FadeInAnimation, 
  ShimmerText, 
  TextWave,
  StaggeredAnimation 
} from '../ui/text-animations';

interface Feature {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  bgGradient: string;
}

export function FeaturesSection() {
  const { ref: featuresRef, inView: featuresInView } = useInView({ threshold: 0.1, triggerOnce: true });

  const features: Feature[] = [
    {
      icon: Shield,
      title: "SAFE",
      subtitle: "Trusted Middleman",
      description: "Our verified middleman service ensures every trade is secure. Trade with confidence knowing your items are protected by industry-leading security protocols.",
      color: "#00B2FF",
      bgGradient: "from-[#00B2FF]/20 to-[#0088CC]/20"
    },
    {
      icon: Image,
      title: "SHOWCASE",
      subtitle: "Display Your Collection",
      description: "Create stunning showcases of your Roblox items. Share your inventory and attract potential traders with our advanced gallery system and visual tools.",
      color: "#FFD700",
      bgGradient: "from-[#FFD700]/20 to-[#FFA500]/20"
    },
    {
      icon: Users,
      title: "COMMUNITY",
      subtitle: "Connect & Trade",
      description: "Join thousands of active traders in our vibrant community. Network, negotiate, and build lasting relationships with collectors worldwide.",
      color: "#FF2D2D",
      bgGradient: "from-[#FF2D2D]/20 to-[#CC0000]/20"
    },
    {
      icon: TrendingUp,
      title: "MARKET",
      subtitle: "Real-Time Pricing",
      description: "Stay ahead with live market trends and accurate item valuations. Make informed trading decisions with our comprehensive analytics dashboard.",
      color: "#00FF88",
      bgGradient: "from-[#00FF88]/20 to-[#00CC66]/20"
    }
  ];

  return (
    <section id="features" ref={featuresRef} className="relative py-32 overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-950">
      {/* Enhanced Beautiful Black Background Base Layer */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      
      {/* Subtle Top Transparent Gradient */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/20 via-black/10 to-transparent z-5" />
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-gray-900/30 via-gray-800/15 to-transparent z-5" />
      <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white/5 via-white/2 to-transparent z-5" />
      
      {/* Multiple Layered Background Textures */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_1px,_transparent_1px)] bg-[length:40px_40px] opacity-60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,_rgba(0,178,255,0.01)_1px,_transparent_1px)] bg-[length:60px_60px] opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/90" />
      
      {/* Enhanced Geometric Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(30deg,rgba(255,255,255,0.02)_12%,transparent_12.5%,transparent_87%,rgba(255,255,255,0.02)_87.5%,rgba(255,255,255,0.02))] bg-[length:80px_80px] opacity-50" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(0,178,255,0.01)_12%,transparent_12.5%,transparent_87%,rgba(0,178,255,0.01)_87.5%,rgba(0,178,255,0.01))] bg-[length:120px_120px] opacity-30" />
      
      {/* Subtle Mesh Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,_transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:100px_100px] opacity-40" />
      
      {/* Enhanced Depth Gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      
      {/* Enhanced Animated Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        {/* Primary Color Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-[#00B2FF]/12 to-[#0088CC]/8 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-[#FF2D2D]/12 to-[#CC0000]/8 rounded-full blur-3xl animate-bounce-slow" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-r from-[#FFD700]/8 to-[#FFA500]/5 rounded-full blur-2xl animate-pulse" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-gradient-to-r from-[#00FF88]/10 to-[#00CC66]/6 rounded-full blur-2xl animate-bounce" />
        
        {/* Secondary Accent Orbs */}
        <div className="absolute top-40 right-1/3 w-48 h-48 bg-gradient-to-r from-purple-500/8 to-blue-500/5 rounded-full blur-2xl animate-float-gentle" />
        <div className="absolute bottom-40 left-1/3 w-56 h-56 bg-gradient-to-r from-cyan-500/6 to-teal-500/4 rounded-full blur-3xl animate-drift" />
        
        {/* Micro Accent Dots */}
        <div className="absolute top-1/4 left-1/2 w-32 h-32 bg-gradient-to-r from-white/5 to-transparent rounded-full blur-xl animate-pulse-gentle" />
        <div className="absolute bottom-1/4 right-1/2 w-24 h-24 bg-gradient-to-r from-blue-300/8 to-transparent rounded-full blur-lg animate-float-slow" />
      </div>

      {/* Enhanced Floating Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(25)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${1 + Math.random() * 3}px`,
              height: `${1 + Math.random() * 3}px`,
              background: `rgba(255, 255, 255, ${0.1 + Math.random() * 0.2})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 6}s`,
              animationDuration: `${4 + Math.random() * 6}s`,
              boxShadow: `0 0 ${2 + Math.random() * 4}px rgba(255, 255, 255, 0.3)`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-6">
        {/* Enhanced Section Title */}
        <div className={`text-center mb-24 transition-all duration-1000 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="relative inline-block mb-8">
            {/* Glowing Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF] via-[#FFD700] to-[#FF2D2D] rounded-2xl blur-xl opacity-30 animate-pulse" />
            
            {/* Main Title */}
            <div className="relative">
              <div className="absolute inset-0 transform translate-x-1 translate-y-1">
                <h2
                  className="text-6xl md:text-8xl uppercase tracking-tight"
                  style={{
                    fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                    color: "rgba(0, 0, 0, 0.3)"
                  }}
                >
                  <TextWave text="WHY BLOXMARKET" delay={50} />
                </h2>
              </div>
              <h2
                className="relative text-6xl md:text-8xl uppercase tracking-tight z-10"
                style={{
                  fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                  background: "linear-gradient(45deg, #FFFFFF 0%, #E0E0E0 25%, #FFFFFF 50%, #F0F0F0 75%, #FFFFFF 100%)",
                  backgroundSize: "400% 400%",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 8px 30px rgba(255, 255, 255, 0.3))",
                  animation: "title-shimmer 4s ease-in-out infinite"
                }}
              >
                <FadeInAnimation delay={300} direction="up">
                  <ShimmerText text="WHY BLOXMARKET" shimmerColor="rgba(255, 255, 255, 0.9)" />
                </FadeInAnimation>
              </h2>
            </div>
            
            {/* Animated Underline */}
            <div className="relative mt-4">
              <div className={`h-3 bg-gradient-to-r from-[#00B2FF] via-[#FFD700] to-[#FF2D2D] mx-auto rounded-full transition-all duration-1500 ${featuresInView ? 'w-full opacity-100' : 'w-0 opacity-0'}`} />
              <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full animate-pulse" />
            </div>
          </div>
          
          {/* Enhanced Subtitle with Text Animations */}
          <div className="relative">
            <FadeInAnimation delay={800} direction="up">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-[#FFD700] animate-spin" />
                <p className="text-2xl text-gray-300 uppercase tracking-wider font-bold">
                  <TypingAnimation text="THE MOST TRUSTED TRADING PLATFORM" speed={40} delay={1000} showCursor={false} />
                </p>
                <Zap className="w-6 h-6 text-[#00B2FF] animate-pulse" />
              </div>
            </FadeInAnimation>
            <FadeInAnimation delay={1200} direction="up">
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Experience the future of Roblox trading with cutting-edge security, 
                stunning showcases, and an unmatched community experience.
              </p>
            </FadeInAnimation>
          </div>
        </div>

        {/* Enhanced Features Grid with Staggered Animations */}
        <StaggeredAnimation staggerDelay={200} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`relative group transition-all duration-1000 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                {/* Enhanced Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-700 scale-110`} />
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* 3D Card Effect */}
                <div className="relative transform-gpu perspective-1000">
                  <div className="absolute inset-0 bg-gradient-to-br from-black/50 to-transparent rounded-[2rem] transform translate-x-2 translate-y-2" />
                  
                  {/* Main Card */}
                  <GlassCard 
                    className="relative border-2 border-[#404448] rounded-[2rem] p-10 h-full transition-all duration-500 group-hover:border-opacity-100 group-hover:scale-105 group-hover:-translate-y-2 group-hover:rotate-1 transform-gpu"
                    opacity={98} 
                    blur="xl"
                  >
                    <div className="absolute inset-0 border-2 rounded-[2rem] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ borderColor: feature.color }} />
                    
                    {/* Enhanced Icon Container */}
                    <div className="relative mb-8">
                      <div 
                        className="absolute inset-0 rounded-3xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity duration-500"
                        style={{ background: `linear-gradient(135deg, ${feature.color}60, ${feature.color}30)` }}
                      />
                      <div
                        className="relative w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 transform-gpu"
                        style={{
                          background: `linear-gradient(135deg, ${feature.color}40, ${feature.color}20)`,
                          border: `3px solid ${feature.color}`,
                          boxShadow: `0 10px 30px ${feature.color}30`
                        }}
                      >
                        <Icon style={{ color: feature.color }} className="w-10 h-10 group-hover:animate-pulse" />
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>

                    {/* Enhanced Typography */}
                    <div className="space-y-4">
                      <h3
                        className="text-4xl mb-3 uppercase tracking-tight transition-all duration-300 group-hover:scale-105"
                        style={{
                          fontFamily: "'Arial Black', -apple-system, BlinkMacSystemFont, sans-serif",
                          color: feature.color,
                          textShadow: `0 0 20px ${feature.color}50`,
                          filter: `drop-shadow(0 2px 10px ${feature.color}30)`
                        }}
                      >
                        {feature.title}
                      </h3>

                      <p className="text-white text-lg mb-6 uppercase tracking-wide font-semibold group-hover:text-opacity-100 transition-all">
                        {feature.subtitle}
                      </p>

                      <p className="text-gray-300 text-base leading-relaxed group-hover:text-gray-200 transition-colors">
                        {feature.description}
                      </p>
                    </div>

                    {/* Enhanced Corner Accents */}
                    <div className="absolute top-6 right-6 flex gap-2">
                      <div
                        className="w-4 h-4 rounded-full animate-ping"
                        style={{ backgroundColor: feature.color }}
                      />
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: `${feature.color}80` }}
                      />
                    </div>
                    
                    {/* Progress Bar Animation */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-b-[2rem]" style={{ color: feature.color }} />
                  </GlassCard>
                </div>
              </div>
            );
          })}
        </StaggeredAnimation>

        {/* Enhanced Call-to-Action */}
        <div className={`text-center mt-20 transition-all duration-1000 ${featuresInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '600ms' }}>
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00B2FF] to-[#FF2D2D] rounded-2xl blur-xl opacity-50 animate-pulse" />
            <div className="relative bg-gradient-to-r from-[#00B2FF]/10 to-[#FF2D2D]/10 rounded-2xl p-8 border border-white/10">
              <p className="text-2xl text-white mb-4 font-bold">Ready to experience the difference?</p>
              <p className="text-gray-400">Join thousands of satisfied traders who trust BloxMarket for their Roblox trading needs.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes title-shimmer {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
            25% { transform: translateY(-12px) rotate(3deg); opacity: 1; }
            50% { transform: translateY(-8px) rotate(-2deg); opacity: 0.8; }
            75% { transform: translateY(-15px) rotate(1deg); opacity: 0.9; }
          }
          
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 0.9; transform: scale(1.08); }
          }
          
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0px) scale(1); }
            50% { transform: translateY(-25px) scale(1.02); }
          }
          
          @keyframes float-gentle {
            0%, 100% { transform: translateY(0px) translateX(0px) rotate(0deg); }
            33% { transform: translateY(-8px) translateX(5px) rotate(120deg); }
            66% { transform: translateY(-3px) translateX(-5px) rotate(240deg); }
          }
          
          @keyframes drift {
            0%, 100% { transform: translateX(0px) translateY(0px); }
            25% { transform: translateX(10px) translateY(-5px); }
            50% { transform: translateX(-8px) translateY(-12px); }
            75% { transform: translateX(5px) translateY(-8px); }
          }
          
          @keyframes pulse-gentle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.1); }
          }
          
          @keyframes float-slow {
            0%, 100% { transform: translateY(0px); opacity: 0.4; }
            50% { transform: translateY(-20px); opacity: 0.8; }
          }
          
          .animate-float { animation: float 8s ease-in-out infinite; }
          .animate-pulse-slow { animation: pulse-slow 5s ease-in-out infinite; }
          .animate-bounce-slow { animation: bounce-slow 4s ease-in-out infinite; }
          .animate-float-gentle { animation: float-gentle 12s ease-in-out infinite; }
          .animate-drift { animation: drift 15s ease-in-out infinite; }
          .animate-pulse-gentle { animation: pulse-gentle 6s ease-in-out infinite; }
          .animate-float-slow { animation: float-slow 10s ease-in-out infinite; }
          .perspective-1000 { perspective: 1000px; }
          .transform-gpu { transform: translateZ(0); }
        `
      }} />
    </section>
  );
}