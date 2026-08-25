"use client";

import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, RefreshCw, Shield, Bell, Sliders, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // 1. Profile State
  const [profile, setProfile] = useState({
    entityName: "LGU City of Cebu - Solid Waste Management Division",
    adminName: "Officer Maria Santos",
    email: "m.santos@cebucity.gov.ph",
    phone: "+63 (032) 253-1111",
    jurisdiction: "Brgy. Guadalupe (Metro Cebu)",
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

  // 2. Notification Preferences State
  const [notifications, setNotifications] = useState({
    criticalAlerts: true,
    gpsWarnings: true,
    dailySummary: true,
    citizenDisputes: false,
    soundChime: true,
  });

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      showToast("Notification preferences updated.");
      return updated;
    });
  };

  // 3. Operational Parameters State
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
      showToast("Operational parameters saved.");
    }, 500);
  };

  // 4. Security & Password State
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-8">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 text-white rounded-lg shadow-lg border border-zinc-800 text-xs animate-in-fade">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SECTION 1: Administrator Profile */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200/80">
          <User className="w-4 h-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Administrator Profile & Jurisdiction
            </h2>
            <p className="text-xs text-zinc-500">
              Official department credentials for LGU waste oversight
            </p>
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">LGU Entity Name</label>
              <input
                type="text"
                value={profile.entityName}
                onChange={(e) =>
                  setProfile({ ...profile, entityName: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Administrator Name</label>
              <input
                type="text"
                value={profile.adminName}
                onChange={(e) =>
                  setProfile({ ...profile, adminName: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Official Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
                pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Contact Hotline</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Barangay Jurisdiction</label>
              <select
                value={profile.jurisdiction}
                onChange={(e) =>
                  setProfile({ ...profile, jurisdiction: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
              >
                <option value="Brgy. Guadalupe (Metro Cebu)">Brgy. Guadalupe (Metro Cebu)</option>
                <option value="Brgy. Capitol Site (Metro Cebu)">Brgy. Capitol Site (Metro Cebu)</option>
                <option value="Brgy. Lahug (Metro Cebu)">Brgy. Lahug (Metro Cebu)</option>
                <option value="Brgy. Mabolo (Metro Cebu)">Brgy. Mabolo (Metro Cebu)</option>
                <option value="Brgy. Banilad (Mandaue)">Brgy. Banilad (Mandaue)</option>
                <option value="Brgy. Parian (Metro Cebu)">Brgy. Parian (Metro Cebu)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Office Physical Address</label>
              <input
                type="text"
                value={profile.officeAddress}
                onChange={(e) =>
                  setProfile({ ...profile, officeAddress: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <Button variant="primary" size="sm" type="submit" disabled={savingProfile}>
              {savingProfile ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </section>

      {/* SECTION 2: Notification Preferences */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200/80">
          <Bell className="w-4 h-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Notification Preferences
            </h2>
            <p className="text-xs text-zinc-500">
              Control dispatch alert delivery and automated morning summaries
            </p>
          </div>
        </div>

        <div className="divide-y divide-zinc-100">
          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-xs font-medium text-zinc-900">Critical Dumping Alerts</h3>
              <p className="text-[11px] text-zinc-500">Immediate notifications for critical environmental hazards</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification("criticalAlerts")}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                notifications.criticalAlerts ? "bg-emerald-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                  notifications.criticalAlerts ? "left-4.5" : "left-0.75"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-xs font-medium text-zinc-900">Truck GPS & Telemetry Warnings</h3>
              <p className="text-[11px] text-zinc-500">Alerts when compactor units lose signal or idle over 15 minutes</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification("gpsWarnings")}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                notifications.gpsWarnings ? "bg-emerald-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                  notifications.gpsWarnings ? "left-4.5" : "left-0.75"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <h3 className="text-xs font-medium text-zinc-900">Daily Morning Briefing</h3>
              <p className="text-[11px] text-zinc-500">Summary digest at 07:00 AM PHT</p>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification("dailySummary")}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                notifications.dailySummary ? "bg-emerald-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-transform ${
                  notifications.dailySummary ? "left-4.5" : "left-0.75"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 3: Operational Parameters */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200/80">
          <Sliders className="w-4 h-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              LGU Operational Parameters
            </h2>
            <p className="text-xs text-zinc-500">
              Geofence radii, auto-escalation SLA thresholds, and dispatch algorithm
            </p>
          </div>
        </div>

        <form onSubmit={handleParamsSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Geofence Arrival Radius (meters)</label>
              <input
                type="number"
                min="100"
                max="2000"
                step="50"
                value={params.geofenceRadius}
                onChange={(e) =>
                  setParams({ ...params, geofenceRadius: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Max Open Incidents per Truck</label>
              <input
                type="number"
                min="1"
                max="30"
                value={params.maxOpenTickets}
                onChange={(e) =>
                  setParams({ ...params, maxOpenTickets: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Auto-Escalation SLA (hours)</label>
              <input
                type="number"
                min="1"
                max="72"
                value={params.slaEscalationHours}
                onChange={(e) =>
                  setParams({ ...params, slaEscalationHours: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Dispatch Routing Algorithm</label>
              <select
                value={params.routingMode}
                onChange={(e) =>
                  setParams({ ...params, routingMode: e.target.value })
                }
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
              >
                <option value="auto-nearest">Auto-Assign Nearest Available Truck</option>
                <option value="manual">Manual Command Center Allocation</option>
                <option value="barangay-supervisor">Barangay Supervisor Approval</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <Button variant="primary" size="sm" type="submit" disabled={savingParams}>
              {savingParams ? "Saving..." : "Save Parameters"}
            </Button>
          </div>
        </form>
      </section>

      {/* SECTION 4: Security */}
      <section className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-zinc-200/80">
          <Shield className="w-4 h-4 text-zinc-500" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              Security & Access Credentials
            </h2>
            <p className="text-xs text-zinc-500">
              Update your administrator login password
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  required
                  value={passwords.currentPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, currentPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  required
                  value={passwords.newPassword}
                  onChange={(e) =>
                    setPasswords({ ...passwords, newPassword: e.target.value })
                  }
                  placeholder="••••••••"
                  className="w-full pl-3 pr-8 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                >
                  {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-zinc-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={passwords.confirmPassword}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirmPassword: e.target.value })
                }
                placeholder="••••••••"
                className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-zinc-100">
            <Button variant="primary" size="sm" type="submit" disabled={savingPassword}>
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
