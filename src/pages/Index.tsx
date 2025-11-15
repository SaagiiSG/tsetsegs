import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import heroImage from "@/assets/flowers-hero.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-soft">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6 animate-fade-in">
            <div className="relative w-full h-64 md:h-96 rounded-2xl overflow-hidden shadow-glow">
              <img
                src={heroImage}
                alt="Flowers Talent Agency"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 to-transparent flex items-end justify-center pb-8">
                <div className="text-center space-y-2">
                  <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">
                    Flowers Talent Agency
                  </h1>
                  <p className="text-xl md:text-2xl text-white/90 drop-shadow-md">
                    Welcome to Family of Tsetsegs 🌸
                  </p>
                </div>
              </div>
            </div>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              SAT Prep Excellence in Mongolia
            </p>
          </div>

          {/* CTA Section */}
          <div className="grid md:grid-cols-2 gap-6 animate-scale-in">
            <div className="p-8 rounded-2xl bg-card shadow-soft border border-border hover:shadow-glow transition-shadow">
              <div className="space-y-4">
                <Sparkles className="w-12 h-12 text-primary" />
                <h2 className="text-2xl font-bold">For Students</h2>
                <p className="text-muted-foreground">
                  Received an invitation link? Click it to see your class assignment and get ready to start your SAT journey!
                </p>
              </div>
            </div>

            <div className="p-8 rounded-2xl bg-gradient-petal shadow-soft hover:shadow-glow transition-all hover:scale-105">
              <div className="space-y-4 text-white">
                <Sparkles className="w-12 h-12" />
                <h2 className="text-2xl font-bold">Admin Access</h2>
                <p className="text-white/90">
                  Manage student batches, create assignments, and generate invitation links.
                </p>
                <Button
                  onClick={() => navigate("/admin")}
                  variant="secondary"
                  className="w-full mt-4"
                >
                  Go to Admin Dashboard
                </Button>
              </div>
            </div>
          </div>

          {/* Info Section */}
          <div className="text-center space-y-4 text-muted-foreground animate-fade-in">
            <p>
              Our experienced teachers: Saran-Ochir, Altan-Erdene, and Manlai
            </p>
            <p className="text-sm">
              Classes held on 11th floor (Room 1105) and 9th floor (Room 905)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
