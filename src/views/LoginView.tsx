import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, User as UserIcon, Building2, Briefcase } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';

export const LoginView: React.FC = () => {
  const { login, register, isLoading } = useAuth();

  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Registration specific fields
  const [name, setName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [title, setTitle] = useState('Physiotherapist');
  const [registrationNumber, setRegistrationNumber] = useState('');

  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'practice';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signin') {
      const result = await login(email, password, rememberMe);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } else {
      // Validate registration input
      if (!name.trim()) {
        setError('Practitioner full name is required');
        return;
      }
      if (!workspaceName.trim()) {
        setError('Workspace name is required');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      const slug = generateSlug(workspaceName);
      const initials = name
        .trim()
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase() || 'PT';

      const result = await register(
        {
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
          title: title.trim(),
          clinicName: clinicName.trim() || workspaceName.trim(),
          registrationNumber: registrationNumber.trim() || undefined,
          initials,
          workspaceName: workspaceName.trim(),
          workspaceSlug: slug,
          clinicalAuthorized: true, // Independent PT workspace owner is clinically authorized
        },
        rememberMe
      );

      if (!result.success && result.error) {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FAF8F5] flex flex-col justify-between items-center px-4 py-8 sm:py-12 select-none">
      {/* Top Brand Bar */}
      <header className="w-full max-w-4xl flex items-center justify-between">
        <Logo size="md" showSubtitle={false} />
        <span className="text-xs text-[#757C76] font-medium hidden sm:inline">
          {mode === 'signin' ? 'Practitioner Workspace Access' : 'Create Independent Workspace'}
        </span>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-md my-auto py-4">
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-7 sm:p-9 shadow-sm">
          {/* Header Typography */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-[26px] font-semibold text-[#18201C] tracking-tight mb-1.5">
              {mode === 'signin' ? 'Your clinical workspace.' : 'Initialize your workspace.'}
            </h1>
            <p className="text-sm text-[#666D67] font-normal leading-relaxed">
              {mode === 'signin'
                ? 'From assessment to outcome.'
                : 'Dedicated, private clinical documentation for independent physiotherapists.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          <div className="flex border-b border-[#E3DDD2] mb-6">
            <button
              type="button"
              id="switch-to-signin-tab"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
              className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                mode === 'signin'
                  ? 'border-[#1B3B2B] text-[#1B3B2B]'
                  : 'border-transparent text-[#767D77] hover:text-[#18201C]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="switch-to-register-tab"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`pb-2.5 px-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'border-[#1B3B2B] text-[#1B3B2B]'
                  : 'border-transparent text-[#767D77] hover:text-[#18201C]'
              }`}
            >
              Create Workspace
            </button>
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

            {mode === 'register' && (
              <>
                <Input
                  id="clinical-fullname-input"
                  label="Practitioner Full Name"
                  type="text"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError(null);
                  }}
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  required
                />

                <Input
                  id="clinical-workspace-name-input"
                  label="Private Workspace / Practice Name"
                  type="text"
                  placeholder="e.g. Elevation Movement Physical Therapy"
                  value={workspaceName}
                  onChange={(e) => {
                    setWorkspaceName(e.target.value);
                    if (error) setError(null);
                  }}
                  leftIcon={<Building2 className="w-4 h-4" />}
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    id="clinical-title-input"
                    label="Title / Credentials"
                    type="text"
                    placeholder="e.g. PT, DPT"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    leftIcon={<Briefcase className="w-4 h-4" />}
                  />
                  <Input
                    id="clinical-reg-input"
                    label="License / Reg. No."
                    type="text"
                    placeholder="e.g. PT-994182"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </>
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
              placeholder={mode === 'signin' ? 'Enter clinical account password' : 'Min. 8 characters'}
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
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
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
                id="auth-submit-btn"
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
              >
                {mode === 'signin' ? 'Sign in to Workspace' : 'Initialize Private Workspace'}
              </Button>
            </div>
          </form>

          {/* Quick Start Guidance */}
          <div className="mt-6 pt-5 border-t border-[#ECE6DB] text-center">
            <p className="text-xs text-[#777E78] leading-relaxed">
              {mode === 'signin'
                ? 'Sign in to access your private clinical records, cases, and treatment plans.'
                : 'Each registered physiotherapist receives a private, isolated workspace with independent records.'}
            </p>
          </div>
        </div>
      </main>

      {/* Footer Philosophy */}
      <footer className="w-full max-w-md text-center pt-4">
        <p className="text-xs text-[#7F8680] font-sans">
          &ldquo;Don’t just document what happened. Understand the journey.&rdquo;
        </p>
      </footer>
    </div>
  );
};
