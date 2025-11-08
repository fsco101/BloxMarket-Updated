import { useApp } from '../App';
import { useAuth } from '../App';
import { HeroSection } from './landing/HeroSection';
import { FeaturesSection } from './landing/FeaturesSection';
import { CTASection } from './landing/CTASection';

export function LandingPage() {
  const { setCurrentPage } = useApp();
  const { isLoggedIn } = useAuth();

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-black">
      {/* Hero Section with Landing Page Background */}
      <div 
        className="relative"
        style={{
          backgroundImage: 'url(/landingpage.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Enhanced Background Overlay for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 z-0" />
        <div className="absolute inset-0 bg-black/30 z-0" />
        
        <HeroSection 
          isLoggedIn={isLoggedIn}
          onGetStarted={handleGetStarted}
          onGoToDashboard={handleGoToDashboard}
          onScrollToSection={scrollToSection}
        />
      </div>

      {/* Features Section with Beautified Black Background */}
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950">
        <FeaturesSection />
      </div>

      {/* Final CTA Section with Beautified Black Background */}
      <div className="bg-gradient-to-br from-gray-950 via-black to-gray-950">
        <CTASection 
          isLoggedIn={isLoggedIn}
          onGetStarted={handleGetStarted}
          onGoToDashboard={handleGoToDashboard}
        />
      </div>
    </div>
  );
}