import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  GraduationCap, 
  Target, 
  Trophy, 
  Users, 
  ChevronRight, 
  Sparkles,
  BookOpen,
  BarChart3,
  Zap,
  Star,
  Crown,
  Briefcase,
  Book,
  Calculator
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  SplitText, 
  BlurText, 
  GradientText, 
  Spotlight,
  Magnet, 
  ClickSpark,
  DomeGallery,
  Counter,
  FloatingLines,
  GradualBlur,
  PixelCard,
} from "@/components/reactbits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Golden color palette - independent of app themes
const GOLD = {
  primary: "43 88% 50%",
  light: "45 90% 65%",
  dark: "40 85% 40%",
  glow: "43 95% 70%",
  bg: "45 30% 6%",
  cardBg: "42 25% 10%",
  text: "45 20% 95%",
  muted: "43 15% 60%",
};

// Statistics for social proof
const stats = [
  { value: 700, suffix: "+", label: "Avg Math Score", icon: Target },
  { value: 1000, suffix: "+", label: "Students Trained", icon: Users },
  { value: 3, suffix: "+", label: "Years Experience", icon: Star },
];

// Features cards
const features = [
  {
    icon: BookOpen,
    title: "Smart Practice",
    description: "AI-powered question bank with 68+ unique problems and CollegeBoard imports",
  },
  {
    icon: Target,
    title: "Score Tracking",
    description: "Set your target score and track your progress with personalized milestones",
  },
  {
    icon: Trophy,
    title: "Gamified Learning",
    description: "Earn badges, climb tiers, and compete on leaderboards with your peers",
  },
  {
    icon: BarChart3,
    title: "Deep Analytics",
    description: "Understand your strengths and weaknesses with detailed performance insights",
  },
];

// Team members with icon types
const teamMembers = [
  { name: "Misheel", role: "CEO", iconType: "crown" as const },
  { name: "Brody", role: "Manager | English", iconType: "briefcase" as const },
  { name: "Dulguun", role: "IELTS", iconType: "book" as const },
  { name: "Udval", role: "IELTS", iconType: "book" as const },
  { name: "Saran-Ochir", role: "SAT Math", iconType: "calculator" as const },
  { name: "Manlai", role: "SAT Math", iconType: "calculator" as const },
  { name: "Tuguldur", role: "SAT Math", iconType: "calculator" as const },
  { name: "Enguun", role: "SAT Math", iconType: "calculator" as const },
  { name: "Khulan", role: "SAT Math", iconType: "calculator" as const },
];

// Gallery images for student achievements
const galleryImages = [
  { src: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=800&auto=format&fit=crop", alt: "Student studying" },
  { src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?q=80&w=800&auto=format&fit=crop", alt: "Books and learning" },
  { src: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=800&auto=format&fit=crop", alt: "Study session" },
  { src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=800&auto=format&fit=crop", alt: "Education" },
  { src: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?q=80&w=800&auto=format&fit=crop", alt: "Graduation" },
  { src: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop", alt: "Classroom" },
];

const Index = () => {
  const navigate = useNavigate();

  // Fetch student success scores from bluebook_attempts
  const { data: successScores } = useQuery({
    queryKey: ["landing-success-scores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bluebook_attempts")
        .select("total_score, math_scaled_score, completed_at")
        .not("total_score", "is", null)
        .gte("total_score", 1400)
        .order("total_score", { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div 
      className="min-h-screen relative"
      style={{
        background: `hsl(${GOLD.bg})`,
        color: `hsl(${GOLD.text})`,
        fontFamily: "'Chillax', sans-serif",
      }}
    >
      {/* Floating Lines Background - Fixed across all sections */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <FloatingLines 
          linesGradient={["#D4A853", "#B8902D", "#E6C570"]}
          enabledWaves={['top', 'middle', 'bottom']}
          lineCount={[8, 10, 6]}
          lineDistance={[4, 5, 3]}
          animationSpeed={0.8}
          interactive={true}
          parallax={true}
          parallaxStrength={0.15}
          mixBlendMode="screen"
        />
        {/* Golden gradient overlays for top and bottom */}
        <div 
          className="absolute top-0 left-0 right-0 h-32 pointer-events-none"
          style={{ 
            background: `linear-gradient(to bottom, hsl(${GOLD.primary} / 0.3), transparent)` 
          }}
        />
        <div 
          className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ 
            background: `linear-gradient(to top, hsl(${GOLD.primary} / 0.3), transparent)` 
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen">

        {/* Animated grid background with golden tint */}
        <div 
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, hsl(${GOLD.primary} / 0.3) 1px, transparent 1px), linear-gradient(to bottom, hsl(${GOLD.primary} / 0.3) 1px, transparent 1px)`,
            backgroundSize: "4rem 4rem",
            maskImage: "radial-gradient(ellipse 60% 50% at 50% 0%, #000 70%, transparent 110%)",
          }}
        />
        
        {/* Golden gradient orbs */}
        <div 
          className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ background: `hsl(${GOLD.primary} / 0.2)` }}
        />
        <div 
          className="absolute top-[40%] -right-32 w-96 h-96 rounded-full blur-3xl animate-pulse pointer-events-none"
          style={{ background: `hsl(${GOLD.light} / 0.15)`, animationDelay: "1s" }}
        />

        {/* Hero Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-20">
          <div className="w-full max-w-6xl mx-auto text-center space-y-8">
            {/* Top Badge - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, hsl(${GOLD.primary} / 0.2), hsl(${GOLD.dark} / 0.3))`,
                border: `1px solid hsl(${GOLD.primary} / 0.4)`,
                color: `hsl(${GOLD.light})`,
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Mongolia's Best SAT Math Center</span>
            </motion.div>

            {/* Frosted Glass Container - Only wraps headline and subtitle */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="backdrop-blur-xl rounded-3xl px-6 py-10 md:px-12 md:py-14 w-full"
              style={{
                background: `linear-gradient(135deg, hsl(${GOLD.bg} / 0.7), hsl(${GOLD.cardBg} / 0.5))`,
                border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                boxShadow: `0 8px 32px hsl(${GOLD.bg} / 0.5), inset 0 1px 0 hsl(${GOLD.light} / 0.1)`,
              }}
            >
              {/* Main headline with animated text */}
              <div className="space-y-4">
                <h1 
                  className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
                  style={{ color: `hsl(${GOLD.text})` }}
                >
                  <SplitText
                    text="Master the SAT"
                    className="block"
                    delay={30}
                    duration={0.5}
                    splitType="chars"
                  />
                </h1>
                <div className="text-5xl md:text-7xl lg:text-8xl font-bold">
                  <GradientText
                    colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`, `hsl(${GOLD.glow})`, `hsl(${GOLD.light})`]}
                    animationSpeed={6}
                    className="font-bold"
                  >
                    Score Higher
                  </GradientText>
                </div>
              </div>

              {/* Subtitle */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-6"
                style={{ color: `hsl(${GOLD.muted})` }}
              >
                <BlurText
                  text="Join the family of Tsetsegs and unlock your potential with personalized learning, gamified practice, and expert guidance."
                  className="text-lg md:text-xl max-w-3xl mx-auto"
                  delay={20}
                  animateBy="words"
                />
              </motion.div>
            </motion.div>

            {/* CTA Buttons - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
            >
              <ClickSpark sparkColor={`hsl(${GOLD.glow})`}>
                <Magnet strength={0.3}>
                  <Button
                    size="lg"
                    className="text-lg px-8 py-6 rounded-full transition-all hover:scale-105"
                    style={{
                      background: `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                      color: "hsl(0 0% 5%)",
                      boxShadow: `0 0 40px hsl(${GOLD.primary} / 0.4)`,
                    }}
                    onClick={() => navigate("/student-portal")}
                  >
                    <GraduationCap className="mr-2 h-5 w-5" />
                    Student Portal
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </Button>
                </Magnet>
              </ClickSpark>
              
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-full border-2"
                style={{
                  borderColor: `hsl(${GOLD.primary} / 0.5)`,
                  color: `hsl(${GOLD.light})`,
                  background: "transparent",
                }}
                onClick={() => navigate("/login")}
              >
                <Users className="mr-2 h-5 w-5" />
                Staff Login
              </Button>
            </motion.div>

            {/* Stats with Counter animation - Outside frosted glass */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="grid grid-cols-3 gap-8 pt-8 max-w-3xl mx-auto"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.5 + index * 0.1, duration: 0.4 }}
                  className="text-center"
                >
                  <div 
                    className="text-3xl md:text-5xl font-bold"
                    style={{ color: `hsl(${GOLD.light})` }}
                  >
                    <Counter 
                      value={stat.value} 
                      suffix={stat.suffix}
                      duration={2.5}
                    />
                  </div>
                  <div 
                    className="text-sm mt-1 flex items-center justify-center gap-1"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    <stat.icon className="w-3 h-3" />
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section - Starts right after Hero/LaserFlow ends */}
      <section className="relative py-24 px-4 overflow-hidden">
        <motion.div 
          className="max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          {/* Text header */}
          <div className="text-center space-y-4 mb-12">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              Why Choose Us
            </motion.span>
            
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold"
            >
              Everything You Need to{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                Succeed
              </GradientText>
            </motion.h2>
          </div>

          {/* Feature cards - 80% width, simple vertical stack */}
          <div className="flex flex-col items-center gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={{
                  hidden: { opacity: 0, x: index % 2 === 0 ? -60 : 60, y: 20 },
                  visible: { 
                    opacity: 1, 
                    x: 0, 
                    y: 0, 
                    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] } 
                  }
                }}
                className="w-[80%]"
              >
                <Card 
                  className="relative p-8 backdrop-blur-md transition-all hover:-translate-y-2 hover:shadow-xl group"
                  style={{
                    background: `hsl(${GOLD.cardBg} / 0.95)`,
                    border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                  }}
                >
                  <div className="flex items-start gap-6">
                    <motion.div 
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                    >
                      <feature.icon 
                        className="w-7 h-7"
                        style={{ color: `hsl(${GOLD.light})` }}
                      />
                    </motion.div>
                    <div className="space-y-2">
                      <h3 
                        className="text-2xl font-semibold"
                        style={{ color: `hsl(${GOLD.text})` }}
                      >
                        {feature.title}
                      </h3>
                      <p 
                        className="text-base leading-relaxed"
                        style={{ color: `hsl(${GOLD.muted})` }}
                      >
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Student Success Section with DomeGallery - AFTER FEATURES */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.05), transparent)` }}
        />
        
        <motion.div 
          className="relative max-w-6xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          <div className="text-center space-y-4 mb-16">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              Student Achievements
            </motion.span>
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold"
            >
              Our Students{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                Excel
              </GradientText>
            </motion.h2>
          </div>

          {/* Dome Gallery for student scores - Frosted glass container */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
            className="backdrop-blur-xl rounded-3xl overflow-hidden"
            style={{
              background: `linear-gradient(135deg, hsl(${GOLD.bg} / 0.6), hsl(${GOLD.cardBg} / 0.4))`,
              border: `1px solid hsl(${GOLD.primary} / 0.2)`,
              boxShadow: `0 8px 32px hsl(${GOLD.bg} / 0.5)`,
            }}
          >
            <div className="w-full h-[550px]">
              <DomeGallery 
                images={galleryImages}
                overlayBlurColor="transparent"
                imageBorderRadius="16px"
                openedImageBorderRadius="20px"
                grayscale={false}
                segments={25}
              />
            </div>
          </motion.div>

          {/* Also show the real scores below if available */}
          {successScores && successScores.length > 0 && (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.08 } }
              }}
            >
              {successScores.map((score, index) => (
                <motion.div
                  key={index}
                  variants={{
                    hidden: { opacity: 0, y: 30, scale: 0.85, rotateX: -15 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1, 
                      rotateX: 0,
                      transition: { duration: 0.5, ease: "easeOut" } 
                    }
                  }}
                  whileHover={{ scale: 1.05, y: -5 }}
                  className="p-4 rounded-2xl text-center cursor-default"
                  style={{
                    background: `linear-gradient(135deg, hsl(${GOLD.cardBg}), hsl(${GOLD.bg}))`,
                    border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                  }}
                >
                  <div 
                    className="text-2xl md:text-3xl font-bold"
                    style={{ color: `hsl(${GOLD.light})` }}
                  >
                    {score.total_score}
                  </div>
                  <div 
                    className="text-xs mt-1"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    Total Score
                  </div>
                  {score.math_scaled_score && (
                    <div 
                      className="text-sm mt-2 font-medium"
                      style={{ color: `hsl(${GOLD.primary})` }}
                    >
                      Math: {score.math_scaled_score}
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* Team Section with PixelCard - AFTER STUDENT WINS */}
      <section className="relative py-24 px-4 overflow-hidden">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.05), transparent)` }}
        />
        
        <motion.div 
          className="relative max-w-7xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <div className="text-center space-y-4 mb-16">
            <motion.span
              variants={{
                hidden: { opacity: 0, y: 30 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
              }}
              className="font-medium inline-block"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              Meet the Team
            </motion.span>
            <motion.h2
              variants={{
                hidden: { opacity: 0, y: 40, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: "easeOut" } }
              }}
              className="text-3xl md:text-5xl font-bold"
            >
              Our{" "}
              <GradientText
                colors={[`hsl(${GOLD.light})`, `hsl(${GOLD.primary})`]}
                animationSpeed={4}
              >
                Teachers
              </GradientText>
            </motion.h2>
          </div>

          {/* PixelCards for team members */}
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
            }}
          >
            {teamMembers.map((member, index) => {
              const iconMap = {
                crown: <Crown className="w-8 h-8" style={{ color: `hsl(${GOLD.light})` }} />,
                briefcase: <Briefcase className="w-8 h-8" style={{ color: `hsl(${GOLD.light})` }} />,
                book: <Book className="w-8 h-8" style={{ color: `hsl(${GOLD.light})` }} />,
                calculator: <Calculator className="w-8 h-8" style={{ color: `hsl(${GOLD.light})` }} />,
              };
              return (
                <motion.div
                  key={member.name}
                  variants={{
                    hidden: { opacity: 0, y: 50, scale: 0.8, rotateY: -20 },
                    visible: { 
                      opacity: 1, 
                      y: 0, 
                      scale: 1, 
                      rotateY: 0,
                      transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } 
                    }
                  }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="cursor-default"
                >
                  <PixelCard
                    variant="gold"
                    className="w-full aspect-[3/4] border-[hsl(43_88%_50%_/_0.3)]"
                    style={{
                      background: `linear-gradient(135deg, hsl(${GOLD.bg}), hsl(${GOLD.cardBg}))`,
                    }}
                  >
                    <div className="relative z-10 flex flex-col items-center justify-center gap-4 p-6 text-center">
                      {/* Icon circle */}
                      <motion.div 
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                        whileHover={{ scale: 1.15, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {iconMap[member.iconType]}
                      </motion.div>
                      
                      {/* Name */}
                      <h3 
                        className="text-lg font-bold"
                        style={{ color: `hsl(${GOLD.text})` }}
                      >
                        {member.name}
                      </h3>
                      
                      {/* Role */}
                      <p 
                        className="text-sm"
                        style={{ color: `hsl(${GOLD.muted})` }}
                      >
                        {member.role}
                      </p>
                    </div>
                  </PixelCard>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 60, scale: 0.9 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
          >
            <Spotlight 
              spotlightColor={`hsl(${GOLD.primary} / 0.2)`}
              className="rounded-3xl"
            >
              <Card 
                className="relative overflow-hidden p-8 md:p-12"
                style={{
                  background: `linear-gradient(135deg, hsl(${GOLD.cardBg}), hsl(${GOLD.bg}))`,
                  border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                }}
              >
                {/* Background decoration */}
                <div 
                  className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
                  style={{ background: `hsl(${GOLD.primary} / 0.1)` }}
                />
                
                <motion.div 
                  className="relative z-10 text-center space-y-6"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={{
                    hidden: {},
                    visible: { transition: { staggerChildren: 0.12, delayChildren: 0.3 } }
                  }}
                >
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, scale: 0.5, rotate: -20 },
                      visible: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.6, ease: "backOut" } }
                    }}
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
                    style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                  >
                    <Zap 
                      className="w-8 h-8"
                      style={{ color: `hsl(${GOLD.light})` }}
                    />
                  </motion.div>
                  
                  <motion.h2
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="text-3xl md:text-4xl font-bold"
                    style={{ color: `hsl(${GOLD.text})` }}
                  >
                    Ready to Start Your SAT Journey?
                  </motion.h2>
                  
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="max-w-xl mx-auto"
                    style={{ color: `hsl(${GOLD.muted})` }}
                  >
                    Join hundreds of students who have already improved their scores with our proven methodology and expert teachers.
                  </motion.p>
                  
                  <motion.div
                    variants={{
                      hidden: { opacity: 0, y: 30 },
                      visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
                    }}
                    className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                  >
                    <ClickSpark sparkColor={`hsl(${GOLD.glow})`}>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          size="lg"
                          className="rounded-full px-8"
                          style={{
                            background: `linear-gradient(135deg, hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                            color: "hsl(0 0% 5%)",
                          }}
                          onClick={() => navigate("/student-portal")}
                        >
                          Get Started
                          <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      </motion.div>
                    </ClickSpark>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        size="lg"
                        variant="ghost"
                        className="rounded-full px-8"
                        style={{ color: `hsl(${GOLD.light})` }}
                        onClick={() => window.open("https://www.facebook.com/tsetsegs.agency", "_blank")}
                      >
                        Follow Us on Facebook
                      </Button>
                    </motion.div>
                  </motion.div>
                </motion.div>
              </Card>
            </Spotlight>
          </motion.div>
        </motion.div>
      </section>

      {/* TsetsegsOS Footer */}
      <footer 
        className="relative py-16 px-4 pb-40 overflow-hidden"
        style={{ borderTop: `1px solid hsl(${GOLD.primary} / 0.1)` }}
      >
        <motion.div 
          className="max-w-[95vw] mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.2 } }
          }}
        >
          {/* Giant TsetsegsOS text */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 80, scale: 0.8 },
              visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 1, ease: [0.25, 0.46, 0.45, 0.94] } }
            }}
            className="mb-12"
          >
            <h2 
              className="font-bold uppercase tracking-tight leading-none"
              style={{
                fontSize: "clamp(4rem, 18vw, 20rem)",
                background: `linear-gradient(135deg, hsl(${GOLD.light}), hsl(${GOLD.primary}), hsl(${GOLD.dark}))`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              TSETSEGS<span style={{ opacity: 0.7 }}>OS</span>
            </h2>
          </motion.div>

          {/* Footer info */}
          <motion.div 
            className="flex flex-col md:flex-row justify-between items-center gap-6"
            variants={{
              hidden: { opacity: 0, y: 30 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
            }}
          >
            <div className="text-center md:text-left">
              <p 
                className="text-sm"
                style={{ color: `hsl(${GOLD.muted})` }}
              >
                SAT & IELTS Prep Excellence in Mongolia
              </p>
            </div>
            
            <div 
              className="flex flex-col md:flex-row items-center gap-4 text-sm"
              style={{ color: `hsl(${GOLD.muted})` }}
            >
              <span>11th floor (1105) & 9th floor (905)</span>
            </div>
          </motion.div>
          
          <motion.div 
            className="mt-8 pt-8 text-center text-sm"
            style={{ 
              borderTop: `1px solid hsl(${GOLD.primary} / 0.1)`,
              color: `hsl(${GOLD.muted})`,
            }}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.6, delay: 0.2 } }
            }}
          >
            © {new Date().getFullYear()} Tsetsegs Talent Agency. All rights reserved.
          </motion.div>
        </motion.div>
      </footer>

      {/* GradualBlur at bottom - backdrop blur effect */}
      <GradualBlur 
        position="bottom"
        height="10rem"
        strength={3}
        divCount={6}
        curve="ease-out"
        target="page"
        zIndex={50}
      />
    </div>
  );
};

export default Index;
