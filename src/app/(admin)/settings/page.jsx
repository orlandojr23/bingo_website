"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";
import { useSoundEnabled, setSoundEnabled } from "@/lib/sounds";

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer",
        checked ? "bg-emerald-600" : "bg-zinc-200"
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-xs transition-transform",
          checked && "translate-x-4"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const [profile, setProfile] = useState({
    entityName: "LGU City of Cebu - Solid Waste Management Division",
    adminName: "Officer Maria Santos",
    email: "m.santos@cebucity.gov.ph",
    phone: "+63 (032) 253-1111",
    jurisdiction: "Barangay Tejero (Cebu City)",
    officeAddress: "City Hall Bldg, M.C. Briones St, Cebu City",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleProfileSave = (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setTimeout(() => {
      setSavingProfile(false);
      showToast("Administrator profile saved.");
    }, 500);
  };

  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    gpsWarnings: true,
    dailySummary: true,
    citizenDisputes: false,
  });
  const soundEnabled = useSoundEnabled();

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast("Notification preferences updated.");
      return updated;
    });
  };

  const [params, setParams] = useState({
    geofenceRadius: "500",
    maxOpenTickets: "10",
    slaEscalationHours: "24",
    routingMode: "auto-nearest",
  });
  const [savingParams, setSavingParams] = useState(false);

  const handleParamsSave = (e) => {
    e.preventDefault();
    setSavingParams(true);
    setTimeout(() => {
      setSavingParams(false);
      showToast("Operations settings saved.");
    }, 500);
  };

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (!passwords.currentPassword || !passwords.newPassword) {
      showToast("Please fill out required password fields.");
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      showToast("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    setTimeout(() => {
      setSavingPassword(false);
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      showToast("Password updated successfully.");
    }, 600);
  };

  const sectionCard = "flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5";
  const sectionHeader = "flex items-center gap-2.5 border-b border-border-subtle pb-3";

  const formatNameInput = (val) => {
    if (!val) return "";
    return val
      .split(/(\s+)/)
      .map((part) => {
        if (part.trim().length > 0) {
          return part.charAt(0).toUpperCase() + part.slice(1);
        }
        return part;
      })
      .join("");
  };

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/40 pointer-events-none" />
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex animate-in-fade items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-10 sm:pb-16 lg:pb-24">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
          <PageHeader
            title="Settings"
            description="Manage your profile, preferences, and password"
          />

          {/* Profile Section */}
          <section className={sectionCard}>
            <div className={sectionHeader}>
              <User className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-foreground">
                Account & Office Profile
              </h2>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Office / Department Name</label>
                  <input
                    type="text"
                    value={profile.entityName}
                    onChange={(e) =>
                      setProfile({ ...profile, entityName: formatNameInput(e.target.value) })
                    }
                    onBlur={() =>
                      setProfile({ ...profile, entityName: formatNameInput(profile.entityName) })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Admin Name</label>
                  <input
                    type="text"
                    value={profile.adminName}
                    onChange={(e) =>
                      setProfile({ ...profile, adminName: formatNameInput(e.target.value) })
                    }
                    onBlur={() =>
                      setProfile({ ...profile, adminName: formatNameInput(profile.adminName) })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Email Address</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value.toLowerCase() })
                    }
                    pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Contact Number</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Coverage Area (Barangay)</label>
                  <select
                    value={profile.jurisdiction}
                    onChange={(e) =>
                      setProfile({ ...profile, jurisdiction: e.target.value })
                    }
                    className={cn(inputClass, "cursor-pointer")}
                  >
                    <option value="Barangay Tejero (Cebu City)">Barangay Tejero (Cebu City)</option>
                    <option value="Other parts of Metro Cebu (Coming Soon...)">
                      Other parts of Metro Cebu (Coming Soon...)
                    </option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Office Address</label>
                  <input
                    type="text"
                    value={profile.officeAddress}
                    onChange={(e) =>
                      setProfile({ ...profile, officeAddress: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-border-subtle pt-4">
                <Button variant="primary" type="submit" disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </section>

          <section className={sectionCard}>
            <div className={sectionHeader}>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Notification Preferences</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Choose which alerts you want to receive
                </p>
              </div>
            </div>

            <div className="divide-y divide-border-subtle">
              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Notification Sounds</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Play a chime when trucks start their route or arrive at a stop
                  </p>
                </div>
                <Toggle
                  checked={soundEnabled}
                  onChange={() => {
                    setSoundEnabled(!soundEnabled);
                    showToast("Notification preferences updated.");
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Critical Dumping Alerts</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Get notified right away about serious dumping incidents
                  </p>
                </div>
                <Toggle
                  checked={notifications.criticalAlerts}
                  onChange={() => toggleNotification("criticalAlerts")}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Truck GPS Warnings</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Get an alert when a truck loses signal or stops for more than 15 minutes
                  </p>
                </div>
                <Toggle
                  checked={notifications.gpsWarnings}
                  onChange={() => toggleNotification("gpsWarnings")}
                />
              </div>

              <div className="flex items-center justify-between gap-4 py-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Daily Morning Briefing</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Receive a daily summary at 7:00 AM</p>
                </div>
                <Toggle
                  checked={notifications.dailySummary}
                  onChange={() => toggleNotification("dailySummary")}
                />
              </div>
            </div>
          </section>

          <section className={sectionCard}>
            <div className={sectionHeader}>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Operations Settings</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Control how reports are handled and how trucks are assigned
                </p>
              </div>
            </div>

            <form onSubmit={handleParamsSave} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Truck Arrival Radius (meters)</label>
                  <input
                    type="number"
                    min="100"
                    max="2000"
                    step="50"
                    value={params.geofenceRadius}
                    onChange={(e) =>
                      setParams({ ...params, geofenceRadius: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Max Reports per Truck at One Time</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={params.maxOpenTickets}
                    onChange={(e) =>
                      setParams({ ...params, maxOpenTickets: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Escalate Unresolved Reports After (hours)</label>
                  <input
                    type="number"
                    min="1"
                    max="72"
                    value={params.slaEscalationHours}
                    onChange={(e) =>
                      setParams({ ...params, slaEscalationHours: e.target.value })
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>How Trucks Are Assigned</label>
                  <select
                    value={params.routingMode}
                    onChange={(e) =>
                      setParams({ ...params, routingMode: e.target.value })
                    }
                    className={cn(inputClass, "cursor-pointer")}
                  >
                    <option value="auto-nearest">Auto-assign the nearest available truck</option>
                    <option value="manual">Assign trucks manually</option>
                    <option value="barangay-supervisor">Require barangay supervisor approval</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end border-t border-border-subtle pt-4">
                <Button variant="primary" type="submit" disabled={savingParams}>
                  {savingParams ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </form>
          </section>

          <section className={sectionCard}>
            <div className={sectionHeader}>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Password & Security</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Change the password you use to sign in
                </p>
              </div>
            </div>

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, currentPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className={cn(inputClass, "pr-9")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label={showCurrent ? "Hide current password" : "Show current password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showCurrent ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>New Password</label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords({ ...passwords, newPassword: e.target.value })
                      }
                      placeholder="••••••••"
                      className={cn(inputClass, "pr-9")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      aria-label={showNew ? "Hide new password" : "Show new password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showNew ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <PasswordStrengthHint password={passwords.newPassword} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirmPassword: e.target.value })
                    }
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end border-t border-border-subtle pt-4">
                <Button variant="primary" type="submit" disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

