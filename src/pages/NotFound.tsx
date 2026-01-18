import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[hsl(240,15%,3%)] overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-[hsl(350,100%,55%)]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-[hsl(190,100%,50%)]/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="text-center relative z-10">
        <h1 className="mb-4 text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-[hsl(350,100%,55%)] to-[hsl(350,100%,35%)] drop-shadow-[0_0_30px_hsl(350,100%,55%)]">404</h1>
        <p className="mb-8 text-xl text-[hsl(220,15%,55%)] font-medium tracking-wide">Page not found</p>
        <Button asChild className="bg-gradient-to-r from-[hsl(190,100%,45%)] to-[hsl(190,100%,55%)] hover:from-[hsl(190,100%,50%)] hover:to-[hsl(190,100%,60%)] text-black font-bold gap-2 shadow-[0_0_20px_-5px_hsl(190,100%,50%)] hover:shadow-[0_0_30px_-5px_hsl(190,100%,50%)] transition-all duration-300">
          <Link to="/">
            <Home className="h-4 w-4" />
            Return to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
