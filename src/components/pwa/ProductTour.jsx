"use client";

import { useEffect, useRef } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export default function ProductTour({
  run = false,
  onComplete,
  onTabChange,
  activeTab,
}) {
  const driverObjRef = useRef(null);

  useEffect(() => {
    if (!run) return;

    // Minimalist tour steps pointing directly to active UI buttons on the resident screen
    const tourSteps = [
      {
        element: '[data-tour="live-banner"]',
        popover: {
          title: "Live Pickup Status",
          description:
            "Displays real-time collection status and estimated truck arrival times (ETA) for your area. Tap to focus the truck on the map.",
          side: "bottom",
          align: "start",
        },
      },
      {
        element: '[data-tour="profile-btn"]',
        popover: {
          title: "Profile & Settings",
          description:
            "Manage account settings, update your home sitio location, toggle audio alert preferences, or sign out.",
          side: "bottom",
          align: "end",
        },
      },
      {
        element: '[data-tour="nav-tab-schedule"]',
        popover: {
          title: "Collection Schedule",
          description:
            "Check waste collection timetables, pickup days, and upcoming schedule details for your sitio.",
          side: "top",
          align: "center",
        },
        tab: "schedule",
      },
      {
        element: '[data-tour="nav-tab-report"]',
        popover: {
          title: "Submit Waste Ticket",
          description:
            "Report uncollected garbage, illegal dumping, or neighborhood waste issues with photos and location pins.",
          side: "top",
          align: "center",
        },
        tab: "report",
      },
      {
        element: '[data-tour="nav-tab-tickets"]',
        popover: {
          title: "My Tickets & History",
          description:
            "Track real-time progress and official resolution updates on all reports you've submitted.",
          side: "top",
          align: "center",
        },
        tab: "tickets",
      },
    ];

    // Initialize driver.js instance with sleek minimalist options
    const driverInstance = driver({
      showProgress: true,
      animate: true,
      allowClose: true,
      overlayColor: "rgba(0, 0, 0, 0.65)",
      stagePadding: 6,
      stageRadius: 14,
      popoverClass: "bingo-driver-popover-minimal",
      nextBtnText: "Next",
      prevBtnText: "Back",
      doneBtnText: "Done",
      progressText: "{{current}} of {{total}}",
      steps: tourSteps.map((step) => ({
        element: step.element,
        popover: {
          title: step.popover.title,
          description: step.popover.description,
          side: step.popover.side,
          align: step.popover.align,
        },
      })),
      onHighlightStarted: (element, step) => {
        const stepConfig = tourSteps[step.popover?.index ?? driverInstance.getActiveIndex()];
        if (stepConfig && stepConfig.tab && onTabChange) {
          onTabChange(stepConfig.tab);
        }
      },
      onDestroyed: () => {
        if (onComplete) onComplete();
      },
    });

    driverObjRef.current = driverInstance;

    const timer = setTimeout(() => {
      driverInstance.drive();
    }, 400);

    return () => {
      clearTimeout(timer);
      if (driverObjRef.current) {
        driverObjRef.current.destroy();
      }
    };
  }, [run]);

  return (
    <style jsx global>{`
      /* Ultra-Minimalist Product Tour Popover Styling */
      .driver-popover.bingo-driver-popover-minimal {
        background: #ffffff !important;
        border: 1px solid #e4e4e7 !important;
        border-radius: 16px !important;
        padding: 16px 18px !important;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05) !important;
        max-width: 280px !important;
        font-family: inherit !important;
      }
      .driver-popover.bingo-driver-popover-minimal .driver-popover-title {
        font-size: 14px !important;
        font-weight: 700 !important;
        color: #18181b !important;
        margin-bottom: 4px !important;
      }
      .driver-popover.bingo-driver-popover-minimal .driver-popover-description {
        font-size: 12px !important;
        line-height: 1.5 !important;
        color: #52525b !important;
      }
      .driver-popover.bingo-driver-popover-minimal .driver-popover-footer {
        margin-top: 14px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
      }
      .driver-popover.bingo-driver-popover-minimal .driver-popover-progress-text {
        font-size: 11px !important;
        font-weight: 500 !important;
        color: #71717a !important;
        background: transparent !important;
        padding: 0 !important;
        border-radius: 0 !important;
      }
      .driver-popover.bingo-driver-popover-minimal .driver-popover-btn-group {
        display: flex !important;
        gap: 6px !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-next-btn,
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-done-btn {
        background-color: #059669 !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        font-size: 11px !important;
        padding: 5px 12px !important;
        border-radius: 8px !important;
        border: none !important;
        text-shadow: none !important;
        transition: background-color 0.15s ease !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-next-btn:hover,
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-done-btn:hover {
        background-color: #047857 !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-prev-btn {
        background-color: #f4f4f5 !important;
        color: #71717a !important;
        font-weight: 600 !important;
        font-size: 11px !important;
        padding: 5px 10px !important;
        border-radius: 8px !important;
        border: none !important;
        text-shadow: none !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-prev-btn:hover {
        color: #18181b !important;
        background-color: #e4e4e7 !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-close-btn {
        color: #a1a1aa !important;
        top: 10px !important;
        right: 10px !important;
      }
      .driver-popover.bingo-driver-popover-minimal button.driver-popover-close-btn:hover {
        color: #18181b !important;
      }
    `}</style>
  );
}
