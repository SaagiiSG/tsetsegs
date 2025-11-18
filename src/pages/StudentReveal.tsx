import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import CountUp from "react-countup";
import { 
  User, 
  Calendar, 
  MapPin, 
  Facebook, 
  Target, 
  BookOpen, 
  Calculator,
  Volume2,
  VolumeX,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import flowersLogo from "@/assets/flowers-logo.png";

const StudentReveal = () => {
  const { id } = useParams();
  const [batch, setBatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPanel, setCurrentPanel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const { width, height } = useWindowSize();

  // Sound effects (using data URIs for simple beeps - replace with actual sound files)
  const playSound = (type: string) => {
    if (isMuted) return;
    
    // Simple beep sounds - in production, replace with actual audio files
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    switch(type) {
      case 'achievement':
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        break;
      case 'whoosh':
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.2;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
        break;
      case 'swell':
        oscillator.frequency.value = 200;
        gainNode.gain.value = 0.15;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
        break;
      case 'tick':
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.1;
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.05);
        break;
    }
  };

  useEffect(() => {
    const fetchBatch = async () => {
      if (!id) return;

      const { data: batchData, error } = await supabase
        .from("batches")
        .select("*")
        .eq("unique_link_id", id)
        .maybeSingle();

      if (error) {
        console.error(error);
        setIsLoading(false);
        return;
      }

      setBatch(batchData);
      setIsLoading(false);
    };

    fetchBatch();
  }, [id]);

  // Auto-advance logic - slower, more premium timing
  useEffect(() => {
    if (currentPanel === 0 && batch) {
      setShowConfetti(true);
      playSound('achievement');
      setTimeout(() => playSound('whoosh'), 400);
      const timer = setTimeout(() => {
        setCurrentPanel(1);
        setShowConfetti(false);
      }, 6000); // Increased to 6 seconds
      return () => clearTimeout(timer);
    }
    
    if (currentPanel === 1) {
      playSound('swell');
      const timer = setTimeout(() => {
        setCurrentPanel(2);
      }, 6000); // Increased to 6 seconds
      return () => clearTimeout(timer);
    }
  }, [currentPanel, batch]);

  const nextPanel = () => {
    if (currentPanel < 3) {
      setCurrentPanel(currentPanel + 1);
    }
  };

  const prevPanel = () => {
    if (currentPanel > 0) {
      setCurrentPanel(currentPanel - 1);
    }
  };

  const goToPanel = (index: number) => {
    setCurrentPanel(index);
  };

  const restart = () => {
    setCurrentPanel(0);
  };

  // Touch gesture handlers
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 75) {
      nextPanel();
    }
    if (touchStart - touchEnd < -75) {
      prevPanel();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPanel();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPanel]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-reveal-bg flex items-center justify-center relative overflow-hidden">
        {/* Golden grid background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 relative z-10"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <img src={flowersLogo} alt="Flowers Talent Agency" className="w-48 mx-auto" />
          </motion.div>
          <motion.p
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-2xl font-bold text-gold"
          >
            Loading your celebration...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-reveal-bg flex items-center justify-center p-4 relative overflow-hidden">
        {/* Golden grid background */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
        
        <div className="text-center space-y-4 relative z-10">
          <img src={flowersLogo} alt="Flowers Talent Agency" className="w-48 mx-auto opacity-50" />
          <h2 className="text-2xl font-bold text-white">Link Not Found</h2>
          <p className="text-gray-400">This invitation link is invalid or has expired.</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div
      className="min-h-screen bg-reveal-bg relative overflow-hidden"
      onClick={currentPanel < 2 ? nextPanel : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Golden grid background */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(hsl(var(--gold)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--gold)) 1px, transparent 1px)`,
        backgroundSize: '50px 50px'
      }} />
      
      {/* Confetti */}
      {showConfetti && <Confetti width={width} height={height} numberOfPieces={200} recycle={false} colors={['#FFD700', '#FFA500', '#FFFFFF', '#B8860B']} />}

      {/* Mute Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsMuted(!isMuted);
        }}
        className="fixed top-20 right-4 z-50 p-2 bg-white/10 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/20 transition-all border border-gold/30"
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-gold" /> : <Volume2 className="w-5 h-5 text-gold" />}
      </button>

      {/* Panels */}
      <AnimatePresence mode="wait">
        {currentPanel === 0 && (
          <Panel1 key="panel1" />
        )}
        {currentPanel === 1 && (
          <Panel2 key="panel2" />
        )}
        {currentPanel === 2 && (
          <Panel3 key="panel3" batch={batch} playSound={playSound} onNext={nextPanel} />
        )}
        {currentPanel === 3 && (
          <Panel4 key="panel4" batch={batch} formatDate={formatDate} onRestart={restart} />
        )}
      </AnimatePresence>

      {/* Progress Bars - Instagram Story Style */}
      <div className="fixed top-4 left-0 right-0 flex gap-2 z-40 px-4">
        {[0, 1, 2, 3].map((index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              goToPanel(index);
            }}
            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden relative"
            aria-label={`Go to panel ${index + 1}`}
          >
            <motion.div
              className="absolute inset-0 bg-white origin-left"
              initial={{ scaleX: 0 }}
              animate={{ 
                scaleX: currentPanel === index ? 1 : currentPanel > index ? 1 : 0 
              }}
              transition={{ 
                duration: currentPanel === index && index < 2 ? 6 : 0.3,
                ease: "linear"
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

// Panel 1: Grand Entrance - Rocket Explosion Effect (Mobile Optimized)
const Panel1 = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
    >
      {/* Rocket explosion particles - fewer on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(window.innerWidth < 768 ? 25 : 40)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full"
            style={{
              background: i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FFA500' : '#FFFFFF',
              left: '50%',
              top: '50%',
            }}
            initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
            animate={{
              scale: [0, 1.5, 0],
              x: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * (window.innerWidth < 768 ? 400 : 800)],
              y: [(Math.random() - 0.5) * 50, (Math.random() - 0.5) * (window.innerWidth < 768 ? 400 : 800)],
              opacity: [1, 0.8, 0],
            }}
            transition={{
              duration: 2,
              delay: 0.3 + i * 0.02,
              ease: "easeOut"
            }}
          />
        ))}
      </div>

      <div className="text-center space-y-6 sm:space-y-12 relative z-10 max-w-lg sm:max-w-none">
        <motion.div
          initial={{ scale: 0, opacity: 0, rotateY: -180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          transition={{ 
            delay: 0.5, 
            duration: 1.2,
            type: "spring", 
            stiffness: 100,
            damping: 15
          }}
          className="relative"
        >
          <img src={flowersLogo} alt="Flowers Talent Agency" className="w-48 sm:w-64 md:w-96 mx-auto" />
          <motion.div
            className="absolute inset-0 bg-gold/40 blur-2xl sm:blur-3xl -z-10"
            animate={{ 
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.6, 0.4]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="space-y-2 sm:space-y-4 px-4"
        >
          <h1 className="text-2xl sm:text-4xl md:text-6xl font-bold text-white leading-tight">
            Congratulations on securing<br />
            <span className="bg-gradient-to-r from-gold via-gold-glow to-gold bg-clip-text text-transparent drop-shadow-lg">
              your seat at Tsetsegs!
            </span>
          </h1>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Panel 2: Legacy Message - Mobile Optimized
const Panel2 = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="absolute inset-0 flex items-center justify-center p-4 sm:p-8"
    >
      {/* Floating particles - fewer on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(window.innerWidth < 768 ? 15 : 30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gold rounded-full"
            animate={{
              y: [0, -120, 0],
              x: [0, Math.random() * 60 - 30, 0],
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 5 + Math.random() * 3,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut"
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${50 + Math.random() * 50}%`,
            }}
          />
        ))}
      </div>

      {/* Logo stays centered */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ 
          opacity: 0.3,
          scale: window.innerWidth < 768 ? 0.5 : 0.6
        }}
        transition={{ duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="absolute"
      >
        <img src={flowersLogo} alt="Flowers" className="w-48 sm:w-64" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1, ease: [0.43, 0.13, 0.23, 0.96] }}
        className="text-center space-y-4 sm:space-y-8 max-w-xs sm:max-w-4xl px-4"
      >
        <h2 className="text-3xl sm:text-4xl md:text-7xl font-bold text-white leading-tight">
          Your journey to be part of{' '}
          <span className="bg-gradient-to-r from-gold via-gold-glow to-gold bg-clip-text text-transparent">
            Tsetsegs's legacy
          </span>{' '}
          starts here
        </h2>
      </motion.div>
    </motion.div>
  );
};

// Panel 3: Stats Showcase - Vertical Layout, Smooth Reveals
const Panel3 = ({ batch, playSound, onNext }: any) => {
  const [countersStarted, setCountersStarted] = useState(false);

  useEffect(() => {
    setTimeout(() => setCountersStarted(true), 600);
  }, []);

  useEffect(() => {
    if (countersStarted) {
      const interval = setInterval(() => playSound('tick'), 150);
      setTimeout(() => {
        clearInterval(interval);
        playSound('achievement');
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [countersStarted]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
      onClick={(e) => {
        e.stopPropagation();
        onNext();
      }}
    >
      <div className="max-w-2xl w-full py-8 sm:py-12">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-2xl sm:text-3xl md:text-5xl font-bold text-center mb-8 sm:mb-16 text-white px-4"
        >
          Join Our Elite Community
        </motion.h2>

        <div className="space-y-4 sm:space-y-6 px-4">
          {[
            { icon: Target, number: 1500, label: "Score Achievers", sub: "8 students reached this milestone", delay: 0.5 },
            { icon: BookOpen, number: 1400, label: "High Performers", sub: "30+ students in this elite group", delay: 0.9 },
            { icon: Calculator, number: 700, label: "Math Masters", sub: "400+ students conquered the section", delay: 1.3 },
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: stat.delay,
                duration: 0.8,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
              className="bg-black/40 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl border border-gold/30 hover:border-gold transition-all duration-500 active:scale-[0.98] sm:hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4 sm:gap-6">
                <stat.icon className="w-12 h-12 sm:w-16 sm:h-16 text-gold flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-4xl sm:text-6xl font-bold text-white mb-0.5 sm:mb-1">
                    {countersStarted ? (
                      <CountUp end={stat.number} duration={2.5} suffix="+" />
                    ) : (
                      "0"
                    )}
                  </div>
                  <div className="text-lg sm:text-2xl font-semibold text-white mb-0.5 sm:mb-1">{stat.label}</div>
                  <div className="text-xs sm:text-sm text-gray-400">{stat.sub}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="text-center mt-8 sm:mt-12 text-gray-400 text-base sm:text-lg"
        >
          Tap to continue
        </motion.p>
      </div>
    </motion.div>
  );
};

// Panel 4: Class Details - Mobile Optimized
const Panel4 = ({ batch, formatDate, onRestart }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
      className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 overflow-y-auto"
    >
      <div className="max-w-2xl w-full space-y-4 sm:space-y-6 py-8 sm:py-12">
        <motion.h2
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8, ease: [0.43, 0.13, 0.23, 0.96] }}
          className="text-2xl sm:text-4xl font-bold text-center mb-6 sm:mb-8 text-white px-4"
        >
          Your Class Details
        </motion.h2>

        <div className="space-y-3 sm:space-y-4 px-4">
          {[
            { icon: User, label: "Your Teacher", value: batch.teacher, delay: 0.4 },
            { icon: Calendar, label: "Class Schedule", value: batch.schedule, delay: 0.6 },
            { 
              icon: MapPin, 
              label: "Location", 
              value: `Их Наяд Зүүн Өндөр 1114\nRoom ${batch.room}, ${batch.room === '1105' ? '11th' : '9th'} Floor`, 
              delay: 0.8 
            },
            { icon: Calendar, label: "First Day", value: formatDate(batch.start_date), delay: 1.0 },
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ 
                delay: item.delay,
                duration: 0.6,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
              className="bg-black/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gold/20 flex items-start gap-3 sm:gap-4 hover:border-gold/40 transition-all duration-300"
            >
              <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-gold flex-shrink-0 mt-0.5 sm:mt-1" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-white mb-1 text-sm sm:text-base">{item.label}</div>
                <div className="text-gray-300 whitespace-pre-line text-sm sm:text-base">{item.value}</div>
              </div>
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ 
              delay: 1.2,
              duration: 0.6,
              ease: [0.43, 0.13, 0.23, 0.96]
            }}
            className="bg-black/40 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gold/20"
          >
            <div className="font-semibold text-white mb-2 sm:mb-3 text-sm sm:text-base">📝 What to Bring</div>
            <ul className="space-y-1.5 sm:space-y-2 text-gray-300 text-sm sm:text-base">
              <li>• Pen</li>
              <li>• Notebook</li>
              <li>• Yourself!</li>
            </ul>
          </motion.div>

          {batch.fb_group_link && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                delay: 1.4,
                duration: 0.6,
                ease: [0.43, 0.13, 0.23, 0.96]
              }}
            >
              <Button
                asChild
                className="w-full h-14 sm:h-16 text-base sm:text-lg font-semibold bg-gold hover:bg-gold-glow text-black shadow-xl shadow-gold/40 hover:shadow-2xl hover:shadow-gold/50 transition-all duration-300 active:scale-95"
              >
                <a href={batch.fb_group_link} target="_blank" rel="noopener noreferrer">
                  <Facebook className="mr-2 h-5 w-5" />
                  Join Our Community
                </a>
              </Button>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            className="text-center space-y-3 sm:space-y-4 pt-4"
          >
            <p className="text-xl sm:text-2xl font-bold text-white">🎉 See you soon at Tsetsegs!</p>
            
            <button
              onClick={onRestart}
              className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gold transition-colors active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Replay celebration
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default StudentReveal;

