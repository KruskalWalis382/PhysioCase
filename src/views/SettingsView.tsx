import React, { useState } from 'react';
import { User, Palette, Sliders, Shield, Check, LogOut, Database } from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../context/AuthContext';
import { useClinical } from '../context/ClinicalContext';
import { DataManagementSection } from '../components/settings/DataManagementSection';

type SettingsSection = 'profile' | 'appearance' | 'preferences' | 'account' | 'data';

export const SettingsView: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { settings, updateSettings } = useClinical();

  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Profile form state
  const [name, setName] = useState(user?.name || 'Dr. Sarah Jenkins');
  const [title, setTitle] = useState(user?.title || 'Physiotherapist, MPT');
  const [clinicName, setClinicName] = useState(user?.clinicName || 'Active Journey Physical Therapy');
  const [licenseNumber, setLicenseNumber] = useState(user?.registrationNumber || 'PT-782914');
  const [email, setEmail] = useState(user?.email || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Appearance & Preferences
  const [theme, setTheme] = useState(settings.theme);
  const [density, setDensity] = useState(settings.density);
  const [measurementSystem, setMeasurementSystem] = useState(settings.measurementSystem);
  const [framework, setFramework] = useState(settings.framework);
  const [reviewCadenceWeeks, setReviewCadenceWeeks] = useState(settings.reviewCadenceWeeks || 4);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name,
      title,
      clinicName,
      registrationNumber: licenseNumber,
      email,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleSavePreferences = () => {
    updateSettings({
      theme,
      density,
      measurementSystem,
      framework,
      reviewCadenceWeeks,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const sections: { id: SettingsSection; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-4 h-4" /> },
    { id: 'preferences', label: 'Preferences', icon: <Sliders className="w-4 h-4" /> },
    { id: 'account', label: 'Account', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', label: 'Data Management & Backup', icon: <Database className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <PageHeader
        title="Settings"
        supportingText="Manage your clinical profile, documentation preferences, and workspace configuration."
      />

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-[#E3DDD2] gap-1 overflow-x-auto">
        {sections.map((sec) => {
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              id={`settings-tab-${sec.id}`}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
                  : 'border-transparent text-[#616862] hover:text-[#18201C] hover:border-[#D5CEC2]'
              }`}
            >
              <span>{sec.icon}</span>
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-[#EBF4EE] border border-[#CDE3D5] text-[#1B3B2B] rounded-lg text-xs flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0 text-[#1B3B2B]" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* Profile Section */}
      {activeSection === 'profile' && (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs max-w-2xl">
          <h2 className="text-base font-semibold text-[#18201C] mb-1">
            Practitioner Profile
          </h2>
          <p className="text-xs text-[#666D67] mb-6">
            This information appears on clinical documentation, case notes, and referral letters.
          </p>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              id="settings-name"
              label="Full Name & Title"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sarah Jenkins, PT, DPT"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="settings-title"
                label="Clinical Role / Specialism"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Lead Musculoskeletal Physiotherapist"
              />
              <Input
                id="settings-license"
                label="License / Registration ID"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. PT-782914"
              />
            </div>

            <Input
              id="settings-clinic"
              label="Clinic or Practice Name"
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              placeholder="e.g. Active Journey Physiotherapy"
            />

            <Input
              id="settings-email"
              label="Professional Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinician@clinic.com"
            />

            <div className="pt-3">
              <Button
                id="save-profile-btn"
                type="submit"
                variant="primary"
                size="md"
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Appearance Section */}
      {activeSection === 'appearance' && (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#18201C] mb-1">
              Visual Workspace Tone
            </h2>
            <p className="text-xs text-[#666D67]">
              PhysioCase employs a warm, humanistic aesthetic crafted to reduce visual fatigue during clinical hours.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-[#2E3530]">Color Palette</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setTheme('warm-clinical')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  theme === 'warm-clinical'
                    ? 'border-[#1B3B2B] bg-[#F7F4EE] ring-1 ring-[#1B3B2B]'
                    : 'border-[#E3DDD2] bg-[#FAF8F5] hover:bg-[#F5F1EA]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#18201C]">Warm Clinical (Standard)</span>
                  {theme === 'warm-clinical' && <Check className="w-4 h-4 text-[#1B3B2B]" />}
                </div>
                <p className="text-xs text-[#666D67]">
                  Warm ivory surfaces (#FAF8F5), soft stone accents, and deep botanical green highlights.
                </p>
              </div>

              <div
                onClick={() => setTheme('soft-stone')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  theme === 'soft-stone'
                    ? 'border-[#1B3B2B] bg-[#F7F4EE] ring-1 ring-[#1B3B2B]'
                    : 'border-[#E3DDD2] bg-[#FAF8F5] hover:bg-[#F5F1EA]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-[#18201C]">Soft Stone Neutral</span>
                  {theme === 'soft-stone' && <Check className="w-4 h-4 text-[#1B3B2B]" />}
                </div>
                <p className="text-xs text-[#666D67]">
                  Muted monochromatic stone surface with high-contrast charcoal typography.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <label className="text-xs font-medium text-[#2E3530]">Interface Spacing Density</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDensity('comfortable')}
                className={`py-2 px-4 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  density === 'comfortable'
                    ? 'bg-[#1B3B2B] text-[#FAF8F5] border-[#1B3B2B]'
                    : 'bg-[#FAF8F5] text-[#333A35] border-[#E0D9CD]'
                }`}
              >
                Comfortable (Generous clinical whitespace)
              </button>
              <button
                type="button"
                onClick={() => setDensity('compact')}
                className={`py-2 px-4 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                  density === 'compact'
                    ? 'bg-[#1B3B2B] text-[#FAF8F5] border-[#1B3B2B]'
                    : 'bg-[#FAF8F5] text-[#333A35] border-[#E0D9CD]'
                }`}
              >
                Compact (High-density review)
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button
              id="save-appearance-btn"
              variant="primary"
              size="md"
              onClick={handleSavePreferences}
            >
              Apply Appearance
            </Button>
          </div>
        </div>
      )}

      {/* Preferences Section */}
      {activeSection === 'preferences' && (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#18201C] mb-1">
              Clinical Documentation Preferences
            </h2>
            <p className="text-xs text-[#666D67]">
              Configure units of measurement and workflow framework.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-[#2E3530]">Measurement Units</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setMeasurementSystem('metric')}
                className={`py-2 px-4 text-xs font-medium rounded-lg border cursor-pointer ${
                  measurementSystem === 'metric'
                    ? 'bg-[#1B3B2B] text-[#FAF8F5] border-[#1B3B2B]'
                    : 'bg-[#FAF8F5] text-[#333A35] border-[#E0D9CD]'
                }`}
              >
                Metric (Degrees, cm, kg)
              </button>
              <button
                type="button"
                onClick={() => setMeasurementSystem('imperial')}
                className={`py-2 px-4 text-xs font-medium rounded-lg border cursor-pointer ${
                  measurementSystem === 'imperial'
                    ? 'bg-[#1B3B2B] text-[#FAF8F5] border-[#1B3B2B]'
                    : 'bg-[#FAF8F5] text-[#333A35] border-[#E0D9CD]'
                }`}
              >
                Imperial (Degrees, in, lbs)
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-[#2E3530]">
              Caseload Review Cadence (Default Interval)
            </label>
            <div className="flex flex-wrap gap-2.5">
              {[2, 4, 6, 8].map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  id={`review-cadence-${weeks}-weeks-btn`}
                  onClick={() => setReviewCadenceWeeks(weeks)}
                  className={`py-2 px-3.5 text-xs font-medium rounded-lg border cursor-pointer transition-colors ${
                    reviewCadenceWeeks === weeks
                      ? 'bg-[#1B3B2B] text-[#FAF8F5] border-[#1B3B2B]'
                      : 'bg-[#FAF8F5] text-[#333A35] border-[#E0D9CD] hover:border-[#CAD8D0]'
                  }`}
                >
                  Every {weeks} weeks
                </button>
              ))}
            </div>
            <p className="text-[11px] text-[#606761] leading-relaxed">
              Active episodes without an explicit next review date are scheduled for review based on this practice-wide interval.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium text-[#2E3530]">Core Documentation Philosophy</label>
            <div className="p-4 rounded-xl bg-[#F6F2EB] border border-[#E3DDD2]">
              <div className="text-sm font-semibold text-[#1B3B2B] mb-1">
                The Journey Framework (Assess → Reason → Plan → Treat → Measure → Progress)
              </div>
              <p className="text-xs text-[#606761] leading-relaxed">
                Replaces disjointed charting with a continuous narrative that highlights patient functional recovery.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Button
              id="save-preferences-btn"
              variant="primary"
              size="md"
              onClick={handleSavePreferences}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      )}

      {/* Account Section */}
      {activeSection === 'account' && (
        <div className="bg-[#FAF8F5] border border-[#E3DDD2] rounded-xl p-6 shadow-xs max-w-2xl space-y-6">
          <div>
            <h2 className="text-base font-semibold text-[#18201C] mb-1">
              Account & Security
            </h2>
            <p className="text-xs text-[#666D67]">
              Workspace security details and session management.
            </p>
          </div>

          <div className="divide-y divide-[#EAE4DB]">
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#18201C]">Signed in as</span>
                <p className="text-xs text-[#666D67]">{user?.email || 'Active Clinician'}</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-[#EBF2EE] text-[#1B3B2B] rounded-md font-medium">
                Active Session
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[#18201C]">Data Privacy</span>
                <p className="text-xs text-[#666D67]">Local workspace storage with no third-party telemetry.</p>
              </div>
              <span className="text-xs text-[#2A5E43] font-medium">Encrypted Local</span>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EAE4DB]">
            <Button
              id="settings-logout-btn"
              variant="outline"
              size="md"
              leftIcon={<LogOut className="w-4 h-4" />}
              onClick={logout}
            >
              Sign out of workspace
            </Button>
          </div>
        </div>
      )}

      {/* Data Management & Backup Section (Stage 12) */}
      {activeSection === 'data' && <DataManagementSection />}
    </div>
  );
};
