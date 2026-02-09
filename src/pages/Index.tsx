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
  Star
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  SplitText, 
  BlurText, 
  GradientText, 
  Spotlight,
  Magnet, 
  ClickSpark,
  LaserFlow,
  DomeGallery,
  ProfileCard,
  Counter,
  FloatingLines,
  GradualBlur,
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

// Team members
const teamMembers = [
  { name: "Misheel", role: "CEO", image: "/newyear/misheel.svg" },
  { name: "Brody", role: "Manager | English Teacher (IELTS, SAT)", image: "/newyear/brody.svg" },
  { name: "Dulguun", role: "IELTS", image: "/newyear/dulguun.svg" },
  { name: "Udval", role: "IELTS", image: "/newyear/udval.svg" },
  { name: "Saran-Ochir", role: "SAT Math", image: "/newyear/saran.svg" },
  { name: "Manlai", role: "SAT Math", image: "/newyear/manlai.svg" },
  { name: "Tuguldur", role: "SAT Math", image: "/newyear/tuguldur.png" },
  { name: "Enguun", role: "SAT Math", image: "/newyear/enguun.svg" },
  { name: "Khulan", role: "SAT Math", image: "/newyear/khulan.svg" },
];

// Gallery items for student scores (placeholder for now)
const galleryItems = [
  { id: "1", image: "", title: "1500+", subtitle: "SAT Score" },
  { id: "2", image: "", title: "1480", subtitle: "SAT Score" },
  { id: "3", image: "", title: "1520", subtitle: "SAT Score" },
  { id: "4", image: "", title: "1450", subtitle: "SAT Score" },
  { id: "5", image: "", title: "1490", subtitle: "SAT Score" },
  { id: "6", image: "", title: "1510", subtitle: "SAT Score" },
  { id: "7", image: "", title: "1470", subtitle: "SAT Score" },
  { id: "8", image: "", title: "1540", subtitle: "SAT Score" },
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
      }}
    >
      {/* Floating Lines Background */}
      <FloatingLines 
        color={`hsl(${GOLD.primary})`}
        lineCount={25}
        opacity={0.12}
      />

      {/* COMBINED Hero + Features Section - LaserFlow starts from top */}
      <section className="relative min-h-[200vh]">
        {/* LaserFlow - starts from very top of this combined section */}
        <div className="absolute inset-x-0 top-0 h-screen pointer-events-none z-0">
          <LaserFlow 
            color="#D4A853"
            verticalSizing={2.5}
            horizontalSizing={0.7}
            fogIntensity={0.6}
            wispIntensity={5}
            flowSpeed={0.3}
            wispSpeed={10}
            className="w-full h-full"
          />
        </div>

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

        {/* Hero Content - first viewport */}
        <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-20">
          <div className="max-w-6xl mx-auto text-center space-y-8">
            {/* Top Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
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
              style={{ color: `hsl(${GOLD.muted})` }}
            >
              <BlurText
                text="Join the family of Tsetsegs and unlock your potential with personalized learning, gamified practice, and expert guidance."
                className="text-lg md:text-xl max-w-3xl mx-auto"
                delay={20}
                animateBy="words"
              />
            </motion.div>

            {/* CTA Buttons */}
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

            {/* Stats with Counter animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="grid grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto"
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

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 0.5 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full flex justify-center pt-2"
              style={{ border: `2px solid hsl(${GOLD.primary} / 0.3)` }}
            >
              <div 
                className="w-1 h-2 rounded-full"
                style={{ background: `hsl(${GOLD.primary} / 0.5)` }}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Features Content - appears after scrolling past LaserFlow */}
        <div className="relative z-10 py-24 px-4">
          <div className="max-w-6xl mx-auto">
            {/* Text header */}
            <div className="text-center space-y-4 mb-12">
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="font-medium"
                style={{ color: `hsl(${GOLD.light})` }}
              >
                Why Choose Us
              </motion.span>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
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
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="w-[80%]"
                >
                  <Card 
                    className="relative p-8 backdrop-blur-md transition-all hover:-translate-y-1"
                    style={{
                      background: `hsl(${GOLD.cardBg} / 0.95)`,
                      border: `1px solid hsl(${GOLD.primary} / 0.2)`,
                    }}
                  >
                    <div className="flex items-start gap-6">
                      <div 
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                      >
                        <feature.icon 
                          className="w-7 h-7"
                          style={{ color: `hsl(${GOLD.light})` }}
                        />
                      </div>
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
          </div>
        </div>
      </section>

      {/* Student Success Section with DomeGallery - AFTER FEATURES */}
      <section className="relative py-24 px-4">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.05), transparent)` }}
        />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-medium"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              Student Achievements
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
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

          {/* Dome Gallery for student scores */}
          <DomeGallery items={galleryItems} radius={300} />

          {/* Also show the real scores below if available */}
          {successScores && successScores.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-16">
              {successScores.map((score, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 rounded-2xl text-center"
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
            </div>
          )}
        </div>
      </section>

      {/* Team Section with ProfileCard - AFTER STUDENT WINS */}
      <section className="relative py-24 px-4">
        <div 
          className="absolute inset-0"
          style={{ background: `linear-gradient(180deg, transparent, hsl(${GOLD.primary} / 0.05), transparent)` }}
        />
        
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="font-medium"
              style={{ color: `hsl(${GOLD.light})` }}
            >
              Meet the Team
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
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

          {/* ProfileCards for team members */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {teamMembers.map((member, index) => (
              <ProfileCard
                key={member.name}
                name={member.name}
                role={member.role}
                image={member.image}
                delay={index * 0.08}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
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
              
              <div className="relative z-10 text-center space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl"
                  style={{ background: `hsl(${GOLD.primary} / 0.15)` }}
                >
                  <Zap 
                    className="w-8 h-8"
                    style={{ color: `hsl(${GOLD.light})` }}
                  />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-bold"
                  style={{ color: `hsl(${GOLD.text})` }}
                >
                  Ready to Start Your SAT Journey?
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="max-w-xl mx-auto"
                  style={{ color: `hsl(${GOLD.muted})` }}
                >
                  Join hundreds of students who have already improved their scores with our proven methodology and expert teachers.
                </motion.p>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
                >
                  <ClickSpark sparkColor={`hsl(${GOLD.glow})`}>
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
                  </ClickSpark>
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
              </div>
            </Card>
          </Spotlight>
        </div>
      </section>

      {/* TsetsegsOS Footer */}
      <footer 
        className="relative py-16 px-4 pb-40"
        style={{ borderTop: `1px solid hsl(${GOLD.primary} / 0.1)` }}
      >
        <div className="max-w-[95vw] mx-auto">
          {/* Giant TsetsegsOS text */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
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
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
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
          </div>
          
          <div 
            className="mt-8 pt-8 text-center text-sm"
            style={{ 
              borderTop: `1px solid hsl(${GOLD.primary} / 0.1)`,
              color: `hsl(${GOLD.muted})`,
            }}
          >
            © {new Date().getFullYear()} Tsetsegs Talent Agency. All rights reserved.
          </div>
        </div>
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
