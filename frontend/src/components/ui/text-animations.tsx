import React, { useEffect, useState, useRef } from 'react';
import { cn } from './utils';

interface TypingAnimationProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  cursorClassName?: string;
  showCursor?: boolean;
  loop?: boolean;
}

export function TypingAnimation({
  text,
  className,
  speed = 50,
  delay = 0,
  cursorClassName,
  showCursor = true,
  loop = false
}: TypingAnimationProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const startTyping = () => {
      setIsTyping(true);
      setDisplayedText('');
      
      let index = 0;
      const timer = setInterval(() => {
        if (index < text.length) {
          setDisplayedText((prev) => prev + text.charAt(index));
          index++;
        } else {
          setIsTyping(false);
          clearInterval(timer);
          
          if (loop) {
            setTimeout(() => {
              startTyping();
            }, 2000);
          }
        }
      }, speed);

      return () => clearInterval(timer);
    };

    const delayTimer = setTimeout(startTyping, delay);
    return () => clearTimeout(delayTimer);
  }, [text, speed, delay, loop]);

  return (
    <span className={cn('inline-block', className)}>
      {displayedText}
      {showCursor && (
        <span
          className={cn(
            'ml-1 animate-pulse',
            isTyping ? 'opacity-100' : 'opacity-0',
            cursorClassName
          )}
        >
          |
        </span>
      )}
    </span>
  );
}

interface FadeInAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
}

export function FadeInAnimation({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 1000
}: FadeInAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return 'translateY(30px)';
        case 'down':
          return 'translateY(-30px)';
        case 'left':
          return 'translateX(30px)';
        case 'right':
          return 'translateX(-30px)';
        default:
          return 'none';
      }
    }
    return 'translate(0)';
  };

  return (
    <div
      className={cn('transition-all ease-out', className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransform(),
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
}

interface RevealAnimationProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  width?: string;
}

export function RevealAnimation({
  children,
  className,
  delay = 0,
  width = '100%'
}: RevealAnimationProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRevealed(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="transition-all duration-1000 ease-out"
        style={{
          transform: isRevealed ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        {children}
      </div>
      <div
        className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
        style={{
          width: width,
          transform: isRevealed ? 'translateX(100%)' : 'translateX(0)'
        }}
      />
    </div>
  );
}

interface ShimmerTextProps {
  text: string;
  className?: string;
  shimmerColor?: string;
}

export function ShimmerText({
  text,
  className,
  shimmerColor = 'rgba(255, 255, 255, 0.8)'
}: ShimmerTextProps) {
  return (
    <span
      className={cn('relative inline-block', className)}
      style={{
        background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer-text 2s linear infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}
    >
      {text}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes shimmer-text {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `
      }} />
    </span>
  );
}

interface TextWaveProps {
  text: string;
  className?: string;
  delay?: number;
}

export function TextWave({ text, className, delay = 100 }: TextWaveProps) {
  return (
    <span className={cn('inline-flex', className)}>
      {text.split('').map((char, index) => (
        <span
          key={index}
          className="inline-block animate-wave"
          style={{
            animationDelay: `${index * delay}ms`
          }}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      ))}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes wave {
            0%, 40%, 100% { transform: translateY(0); }
            20% { transform: translateY(-10px); }
          }
          .animate-wave {
            animation: wave 2s infinite;
          }
        `
      }} />
    </span>
  );
}

interface FlipWordsProps {
  words: string[];
  className?: string;
  duration?: number;
}

export function FlipWords({ words, className, duration = 3000 }: FlipWordsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setIsFlipping(false);
      }, 150);
    }, duration);

    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span
      className={cn(
        'inline-block transition-all duration-300',
        isFlipping ? 'transform scale-y-0' : 'transform scale-y-100',
        className
      )}
    >
      {words[currentIndex]}
    </span>
  );
}

interface GlitchTextProps {
  text: string;
  className?: string;
  trigger?: boolean;
}

export function GlitchText({ text, className, trigger = false }: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsGlitching(true);
      const timer = setTimeout(() => {
        setIsGlitching(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <span
      className={cn(
        'relative inline-block',
        isGlitching && 'animate-glitch',
        className
      )}
      data-text={text}
    >
      {text}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes glitch {
            0% { transform: translate(0); }
            20% { transform: translate(-2px, 2px); }
            40% { transform: translate(-2px, -2px); }
            60% { transform: translate(2px, 2px); }
            80% { transform: translate(2px, -2px); }
            100% { transform: translate(0); }
          }
          .animate-glitch::before,
          .animate-glitch::after {
            content: attr(data-text);
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
          }
          .animate-glitch::before {
            animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
            color: #00ff00;
            z-index: -1;
          }
          .animate-glitch::after {
            animation: glitch 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite reverse;
            color: #ff0000;
            z-index: -2;
          }
        `
      }} />
    </span>
  );
}

interface StaggeredAnimationProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggeredAnimation({
  children,
  className,
  staggerDelay = 100
}: StaggeredAnimationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      {React.Children.map(children, (child, index) => (
        <div
          className="transition-all duration-700 ease-out"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
            transitionDelay: `${index * staggerDelay}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}