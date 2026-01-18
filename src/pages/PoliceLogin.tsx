import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function PoliceLogin() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate a brief loading state for better UX
        setTimeout(() => {
            const success = login(email, password);

            if (success) {
                navigate('/police');
            } else {
                setError('Invalid credentials. Please check your email and password.');
                setIsLoading(false);
            }
        }, 800);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Ambient glow effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[hsl(190,100%,50%)] opacity-[0.03] blur-[150px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(350,100%,50%)] opacity-[0.03] blur-[120px]" />
            </div>

            {/* Shield watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.02]">
                <Shield className="w-[500px] h-[500px]" />
            </div>

            {/* Login card */}
            <div className="relative w-full max-w-md animate-fade-in">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[hsl(190,100%,50%)] to-[hsl(350,100%,55%)] rounded-2xl blur-2xl opacity-10" />

                <div className="relative bg-[hsl(240,15%,6%)] backdrop-blur-xl border border-[hsl(220,15%,15%)] rounded-2xl shadow-[0_20px_60px_-15px_hsl(240,15%,0%)] p-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[hsl(190,100%,50%)] to-[hsl(190,100%,40%)] mb-4 shadow-[0_0_30px_-5px_hsl(190,100%,50%)]">
                            <Shield className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Law Enforcement Access</h1>
                        <p className="text-[hsl(220,15%,45%)] text-sm">Authorized Personnel Only</p>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="mb-6 p-4 bg-[hsl(350,100%,50%)/0.1] border border-[hsl(350,100%,50%)/0.3] rounded-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertCircle className="w-5 h-5 text-[hsl(350,100%,60%)] flex-shrink-0 mt-0.5" />
                            <p className="text-[hsl(350,100%,80%)] text-sm">{error}</p>
                        </div>
                    )}

                    {/* Login form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[hsl(220,15%,70%)] font-medium">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(220,15%,40%)]" />
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="officer@police.gov"
                                    required
                                    className="pl-10 bg-[hsl(240,15%,8%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,15%,35%)] focus:border-[hsl(190,100%,50%)] focus:ring-[hsl(190,100%,50%)/0.2] h-12 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-[hsl(220,15%,70%)] font-medium">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[hsl(220,15%,40%)]" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    className="pl-10 bg-[hsl(240,15%,8%)] border-[hsl(220,15%,18%)] text-white placeholder:text-[hsl(220,15%,35%)] focus:border-[hsl(190,100%,50%)] focus:ring-[hsl(190,100%,50%)/0.2] h-12 transition-all duration-200"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-gradient-to-r from-[hsl(190,100%,45%)] to-[hsl(190,100%,40%)] hover:from-[hsl(190,100%,50%)] hover:to-[hsl(190,100%,45%)] text-[hsl(240,15%,5%)] font-bold shadow-[0_0_30px_-5px_hsl(190,100%,50%)] hover:shadow-[0_0_40px_-5px_hsl(190,100%,55%)] transition-all duration-300"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-[hsl(240,15%,5%)/0.3] border-t-[hsl(240,15%,5%)] rounded-full animate-spin" />
                                    <span>Authenticating...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    <span>Access Dashboard</span>
                                </div>
                            )}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 pt-6 border-t border-[hsl(220,15%,12%)]">
                        <p className="text-center text-xs text-[hsl(220,15%,40%)]">
                            This system is for authorized law enforcement use only.
                            <br />
                            Unauthorized access is prohibited and will be prosecuted.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
