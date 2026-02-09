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
  Zap
} from "lucide-react";
import { motion } from "framer-motion";
import { SplitText, BlurText, GradientText, Spotlight, Magnet, ClickSpark } from "@/components/reactbits";

// Statistics for social proof
const stats = [
  { value: "1500+", label: "Average Score" },
  { value: "200+", label: "Students Trained" },
  { value: "98%", label: "Success Rate" },
  { value: "3+", label: "Years Experience" },
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

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-20">
        {/* Animated grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        
        <div className="relative z-10 max-w-6xl mx-auto text-center space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-sm text-primary"
          >
            <Sparkles className="w-4 h-4" />
            <span>Mongolia's Premier SAT Prep</span>
          </motion.div>

          {/* Main headline with animated text */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <SplitText
                text="Master the SAT"
                className="block text-foreground"
                delay={30}
                duration={0.5}
                splitType="chars"
              />
            </h1>
            <div className="text-5xl md:text-7xl lg:text-8xl font-bold">
              <GradientText
                colors={["hsl(345, 75%, 65%)", "hsl(25, 85%, 70%)", "hsl(270, 50%, 75%)", "hsl(345, 75%, 65%)"]}
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
          >
            <BlurText
              text="Join the family of Tsetsegs and unlock your potential with personalized learning, gamified practice, and expert guidance."
              className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto"
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
            <ClickSpark sparkColor="hsl(345 75% 65%)">
              <Magnet strength={0.3}>
                <Button
                  size="lg"
                  className="text-lg px-8 py-6 rounded-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-opacity"
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
              onClick={() => navigate("/login")}
            >
              <Users className="mr-2 h-5 w-5" />
              Staff Login
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 max-w-4xl mx-auto"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + index * 0.1, duration: 0.4 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
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
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          >
            <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="relative max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-16">
            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-primary font-medium"
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
                colors={["hsl(345, 75%, 65%)", "hsl(25, 85%, 70%)"]}
                animationSpeed={4}
              >
                Succeed
              </GradientText>
            </motion.h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Spotlight className="h-full">
                  <Card className="relative h-full p-6 bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors group">
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <feature.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold">{feature.title}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </Card>
                </Spotlight>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <Spotlight className="rounded-3xl">
            <Card className="relative overflow-hidden bg-gradient-to-br from-card via-card to-primary/10 border-border/50 p-8 md:p-12">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10 text-center space-y-6">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10"
                >
                  <Zap className="w-8 h-8 text-primary" />
                </motion.div>
                
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-3xl md:text-4xl font-bold"
                >
                  Ready to Start Your SAT Journey?
                </motion.h2>
                
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="text-muted-foreground max-w-xl mx-auto"
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
                  <ClickSpark sparkColor="hsl(345 75% 65%)">
                    <Button
                      size="lg"
                      className="rounded-full px-8"
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

      {/* Footer */}
      <footer className="border-t border-border/50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-bold">
                <GradientText
                  colors={["hsl(345, 75%, 65%)", "hsl(25, 85%, 70%)"]}
                  animationSpeed={8}
                >
                  Tsetsegs Agency
                </GradientText>
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                SAT Prep Excellence in Mongolia
              </p>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-muted-foreground">
              <span>Our teachers: Saran-Ochir, Altan-Erdene, Manlai</span>
              <span className="hidden md:inline">•</span>
              <span>11th floor (1105) & 9th floor (905)</span>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} Tsetsegs Talent Agency. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
