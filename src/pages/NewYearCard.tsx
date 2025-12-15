import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Share2 } from "lucide-react";

// Teacher data configuration
const teachers: Record<string, {
  name: string;
  frontImage: string;
  backContent: string;
  hasPersonalLetter: boolean;
}> = {
  brody: {
    name: "Brody",
    frontImage: "/newyear/brody.svg",
    backContent: `Yolo teacha! I thought that I would write this letter and put it in the socks but we all know what happens

It has been the most interesting and fulfilling year of my life all thanks to my two teachers.

Started as side hustle that turned into my passion and love, teaching is beautiful act that you have opened my eyes into.

I faced lot of disappointing events but... one thought helped me to push harder than ever that is "I have my two teachers by my side, and I have to be strong for my students".

Teaching taught me so much (mann who would have thought that teaching actually teaches you things) anyways. Teaching is discipline on steroids, you have to be responsible for you and 20 or maybe even 100 people that is different ball game hha. All the respect for my two teachers.

I guess what I am tryna say is that like you guys love me like your siblings I love you two like the big brother and sister I never had.

And teacha, it is cheesy asf but right now you are the single closest person that I would say my father figure. Dont even get me started on the joy and comfort I get from being around you.

It is my pleasure to be part of great legacy of Tsetsegs and contributing to it even a little. Always happy to help and be part of your family.

Thank you for being my teacher, friend, mentor, and big brother.

All the best wishes in the upcoming year 2025! 🎉`,
    hasPersonalLetter: true
  },
  misheel: {
    name: "Misheel",
    frontImage: "/newyear/misheel.svg",
    backContent: `Hello my beautiful teacha! I thought that I would write this letter and put it in the socks but we all know what happens

It has been the most interesting and fulfilling year of my life all thanks to my two teachers.

During this year I really understood what it takes to be teacher but most importantly what it takes to be good genuine person. Compared to me when this year started I am more grounded more smarter and most importantly more humane.

This title teacher is something I that I take the most pride and joy to wear. The title that I put the most effort to keep it prestigious.

I vividly remember when you asked me if I wanted to teach I was sitting on the sofa in 1105 and you were by the door asked me what I was doing through the winter break and if I was interested in teaching or not. Saying yes was the best decision I have ever made haha

The journey has been fulfilling and full of joy, the time spent with my teachers and the time I spent teaching I would not trade it for anything.

I guess what I am trying to say is that I am soooooooooo grateful and always will be grateful for my two teachers for giving me this opportunity and inviting me to into your family.

Thank you for being my teacher, friend, mentor, and big sister.

All the best wishes in the upcoming year 2026! 🎉`,
    hasPersonalLetter: true
  },
  manlai: {
    name: "Manlai",
    frontImage: "/newyear/manlai.svg",
    backContent: `Happy New Year 2026! 🎊

Thank you for being an amazing SAT teacher and part of our Tsetsegs family. Your dedication to helping students achieve their dreams is truly inspiring.

May this year bring you even more success in the classroom and beyond!

Wishing you all the best! 🌟`,
    hasPersonalLetter: false
  },
  udval: {
    name: "Udval",
    frontImage: "/newyear/udval.svg",
    backContent: `Happy New Year 2025! 🎊

May this year bring you joy, success, and countless beautiful moments. Thank you for being an amazing part of our team.

Wishing you all the best!`,
    hasPersonalLetter: false
  },
  dulguun: {
    name: "Dulguun",
    frontImage: "/newyear/dulguun.svg",
    backContent: `Happy New Year 2025! 🎊

May this year bring you joy, success, and countless beautiful moments. Thank you for being an amazing part of our team.

Wishing you all the best!`,
    hasPersonalLetter: false
  },
  enguun: {
    name: "Enguun",
    frontImage: "/newyear/enguun.svg",
    backContent: `Happy New Year 2025! 🎊

May this year bring you joy, success, and countless beautiful moments. Thank you for being an amazing part of our team.

Wishing you all the best!`,
    hasPersonalLetter: false
  },
  khulan: {
    name: "Khulan",
    frontImage: "/newyear/khulan.svg",
    backContent: `Happy New Year 2025! 🎊

May this year bring you joy, success, and countless beautiful moments. Thank you for being an amazing part of our team.

Wishing you all the best!`,
    hasPersonalLetter: false
  },
  saran: {
    name: "Saran",
    frontImage: "/newyear/saran.svg",
    backContent: `Happy New Year 2025! 🎊

May this year bring you joy, success, and countless beautiful moments. Thank you for being an amazing part of our team.

Wishing you all the best!`,
    hasPersonalLetter: false
  }
};

// Glitter particle component
const GlitterParticles = ({ show }: { show: boolean }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
  }>>([]);

  useEffect(() => {
    if (show) {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 6 + 2,
        delay: Math.random() * 1,
        duration: Math.random() * 2 + 2
      }));
      setParticles(newParticles);

      // Remove particles after animation
      const timer = setTimeout(() => setParticles([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!show || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full animate-glitter"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: `radial-gradient(circle, #FFD700 0%, #FDB931 50%, transparent 100%)`,
            boxShadow: `0 0 ${particle.size * 2}px #FFD700`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`
          }}
        />
      ))}
    </div>
  );
};

export default function NewYearCard() {
  const { teachername } = useParams<{ teachername: string }>();
  const [isFlipped, setIsFlipped] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [showGlitter, setShowGlitter] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showTapHint, setShowTapHint] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const teacher = teachername ? teachers[teachername.toLowerCase()] : null;

  // Gyroscope effect
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event;
      if (beta !== null && gamma !== null) {
        // Clamp values for subtle effect
        const x = Math.max(-15, Math.min(15, gamma * 0.5));
        const y = Math.max(-15, Math.min(15, (beta - 45) * 0.5));
        setRotation({ x: y, y: x });
      }
    };

    // Request permission for iOS 13+
    const requestPermission = async () => {
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        try {
          const permission = await (DeviceOrientationEvent as any).requestPermission();
          if (permission === 'granted') {
            window.addEventListener('deviceorientation', handleOrientation);
          }
        } catch (error) {
          console.error('Error requesting device orientation permission:', error);
        }
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    requestPermission();

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      setShowGlitter(true);
    }, 100);

    // Hide tap hint after 5 seconds
    const hintTimer = setTimeout(() => setShowTapHint(false), 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(hintTimer);
    };
  }, []);

  // Hide tap hint on first flip
  useEffect(() => {
    if (isFlipped) setShowTapHint(false);
  }, [isFlipped]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleShare = useCallback(async () => {
    if (!teacher) return;

    try {
      // Fetch SVG as text and convert to base64 data URL to avoid CORS issues
      const response = await fetch(teacher.frontImage);
      const svgText = await response.text();
      
      // Convert to base64 data URL (completely avoids CORS tainted canvas)
      const base64 = btoa(unescape(encodeURIComponent(svgText)));
      const dataUrl = `data:image/svg+xml;base64,${base64}`;
      
      // Load image from data URL (no CORS issues)
      const img = new Image();
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Create canvas with Instagram Stories aspect ratio (9:16)
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Fill background
      ctx.fillStyle = '#2B2B2B';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate dimensions to fit image while maintaining aspect ratio
      const imgRatio = img.width / img.height;
      const canvasRatio = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
      } else {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
      }

      // Draw the image centered
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

      // Convert to blob and share
      canvas.toBlob(async (blob) => {
        if (!blob) {
          const dataUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `newyear-${teacher.name}.png`;
          a.click();
          return;
        }

        const file = new File([blob], `newyear-${teacher.name}.png`, {
          type: 'image/png'
        });

        // Try native share (works on mobile for IG Stories)
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file]
            });
          } catch (error) {
            // User cancelled or share failed - download instead
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `newyear-${teacher.name}.png`;
            a.click();
            URL.revokeObjectURL(url);
          }
        } else {
          // Desktop fallback - download
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `newyear-${teacher.name}.png`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png', 0.95);
    } catch (error) {
      console.error('Error sharing:', error);
      alert('Unable to share. Try taking a screenshot instead.');
    }
  }, [teacher]);

  if (!teacher) {
    return (
      <div className="min-h-screen bg-[#2B2B2B] flex items-center justify-center p-4">
        <div className="text-center text-[#C5A572]">
          <h1 className="text-2xl font-bold mb-4">Teacher not found</h1>
          <p className="text-sm opacity-70">
            Available: brody, misheel, manlai, udval, dulguun, enguun, khulan, saran
          </p>
        </div>
      </div>
    );
  }

  const shadowX = rotation.y * 2;
  const shadowY = rotation.x * 2;

  return (
    <div className="min-h-screen bg-[#2B2B2B] flex items-center justify-center overflow-hidden">
      <GlitterParticles show={showGlitter} />

      {/* Card container with perspective */}
      <div
        className="relative w-full max-w-[390px] mx-auto"
        style={{ perspective: '1200px' }}
      >
        {/* 3D Card */}
        <div
          ref={cardRef}
          onClick={handleFlip}
          className={`relative w-full cursor-pointer transition-all duration-700 ease-out ${
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{
            aspectRatio: '390/844',
            transformStyle: 'preserve-3d',
            transform: `
              rotateX(${rotation.x}deg) 
              rotateY(${rotation.y}deg) 
              ${isFlipped ? 'rotateY(180deg)' : ''}
            `,
            transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out, scale 0.8s ease-out',
            boxShadow: `${shadowX}px ${shadowY + 20}px 60px rgba(0, 0, 0, 0.5), 
                        ${shadowX * 0.5}px ${shadowY * 0.5 + 10}px 30px rgba(253, 185, 49, 0.1)`
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-[32px] overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden'
            }}
          >
            <img
              src={teacher.frontImage}
              alt={`${teacher.name}'s New Year Card`}
              className={`w-full h-full object-cover transition-opacity duration-1000 ease-out ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              style={{ transitionDelay: '0.2s' }}
            />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-[32px] overflow-hidden bg-gradient-to-br from-[#2B2B2B] via-[#3a3a3a] to-[#2B2B2B]"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Golden border glow */}
            <div className="absolute inset-0 rounded-[32px] border-2 border-[#FFD700]/30" />
            
            {/* Content */}
            <div className="relative h-full flex flex-col items-center p-8 pt-12 text-center overflow-hidden">
              {/* Decorative top */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-[#FFD700] mb-1 flex-shrink-0">
                {teacher.hasPersonalLetter ? teacher.name : 'Happy New Year'}
              </h2>
              
              <div className="text-3xl mb-3 flex-shrink-0">✨</div>

              {/* Letter content - scrollable */}
              <div className="flex-1 overflow-y-auto px-2 pb-16 scrollbar-thin">
                <div className="text-[#C5A572] text-xs leading-relaxed whitespace-pre-line max-w-[280px] mx-auto">
                  {teacher.backContent}
                </div>
              </div>

              {/* Decorative bottom */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent" />
              </div>

              {/* Year badge */}
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2">
                <span className="text-[#FFD700]/60 text-xs tracking-[0.3em]">2025</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tap hint */}
        {showTapHint && !isFlipped && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 animate-pulse">
            <div className="flex items-center gap-2 text-[#C5A572]/70 text-xs">
              <span>👆</span>
              <span>Tap to flip</span>
            </div>
          </div>
        )}
      </div>

      {/* Share button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleShare();
        }}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FDB931] shadow-lg shadow-[#FFD700]/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-40"
      >
        <Share2 className="w-6 h-6 text-[#2B2B2B]" />
      </button>

      {/* Global styles for glitter animation */}
      <style>{`
        @keyframes glitter {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0);
          }
          20% {
            opacity: 1;
            transform: translateY(-20px) scale(1);
          }
          80% {
            opacity: 1;
            transform: translateY(-80px) scale(0.8);
          }
          100% {
            opacity: 0;
            transform: translateY(-120px) scale(0);
          }
        }
        .animate-glitter {
          animation: glitter ease-out forwards;
        }
      `}</style>
    </div>
  );
}
