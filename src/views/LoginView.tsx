import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = await login(email, password, rememberMe);
    if (!result.success && result.error) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Top Brand Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between">
        <Logo size="md" showSubtitle={false} />
        <span className="text-xs text-[#757C76] font-medium hidden sm:inline">
          Clinical Practitioner Access
        </span>
      </header>

      {/* Main Authentication Container */}
      <main className="w-full max-w-md my-auto">
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-7 sm:p-9 shadow-sm">
          {/* Header Typography */}
          <div className="mb-7">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-[#18201C] tracking-tight mb-1.5">
              Your clinical workspace.
            </h1>
            <p className="text-sm text-[#666D67] font-normal leading-relaxed">
              From assessment to outcome.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 bg-[#FDF2F2] border border-[#F8D7DA] text-[#991B1B] rounded-lg text-xs flex items-start gap-2.5"
              >
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <Input
              id="clinical-email-input"
              label="Professional Email"
              type="email"
              placeholder="e.g. practitioner@clinic.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              leftIcon={<Mail className="w-4 h-4" />}
              autoComplete="email"
              required
            />

            <Input
              id="clinical-password-input"
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter clinical account password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              leftIcon={<Lock className="w-4 h-4" />}
              rightAction={
                <button
                  type="button"
                  id="toggle-password-visibility-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="p-1 hover:text-[#18201C] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              autoComplete="current-password"
              required
            />

            {/* Remember Me Option */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  id="remember-me-checkbox"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#C8C2B7] text-[#1B3B2B] focus:ring-[#1B3B2B] accent-[#1B3B2B] cursor-pointer"
                />
                <span className="text-xs text-[#525954] font-medium">Remember me</span>
              </label>

              <span className="text-xs text-[#7A827C] cursor-default">
                HIPAA & GDPR Ready
              </span>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2">
              <Button
                id="sign-in-btn"
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                Sign in
              </Button>
            </div>
          </form>

          {/* Quick Start Guidance */}
          <div className="mt-6 pt-5 border-t border-[#ECE6DB] text-center">
            <p className="text-xs text-[#777E78] leading-relaxed">
              Enter your clinical email and password to access or initialize your secure workspace.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Philosophy */}
      <footer className="w-full max-w-md text-center pt-6">
        <p className="text-xs text-[#7F8680] font-sans">
          &ldquo;Don’t just document what happened. Understand the journey.&rdquo;
        </p>
      </footer>
    </div>
  );
};
