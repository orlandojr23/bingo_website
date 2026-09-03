"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ChevronDown, MessageCircleQuestion, Settings, ShieldCheck, MapPin, Smartphone } from "lucide-react";
import { useState } from "react";

const faqCategories = [
  {
    title: "General & Account",
    icon: <MessageCircleQuestion className="w-5 h-5" />,
    faqs: [
      {
        question: "What is Bin'Go and how does it work?",
        answer: "Bin'Go is a smart waste collection platform that connects residents with their barangay. Residents track garbage trucks live and report uncollected waste or dumping, right from their browser or phone. Barangay staff use the web dashboard to manage trucks, plan routes, and respond to reports."
      },
      {
        question: "Where is Bin'Go available?",
        answer: "Bin'Go is currently in its first pilot launch in Barangay Tejero, Cebu City. If you live in Tejero, you can create an account by selecting your sitio during signup. We plan to expand to more barangays across Metro Cebu after the pilot."
      },
      {
        question: "Do I need to pay to use the Bin'Go app?",
        answer: "No, Bin'Go is 100% free for all residents. Our goal is to make garbage collection clear and easy for every household."
      },
      {
        question: "Do I need to download a mobile app?",
        answer: "No download needed. Bin'Go is a web app that works in any modern browser, and you can install it straight to your phone's home screen for a full app experience. Your one account works everywhere you sign in. Native iOS and Android apps are coming soon."
      }
    ]
  },
  {
    title: "Tracking & Reports",
    icon: <MapPin className="w-5 h-5" />,
    faqs: [
      {
        question: "How accurate is the live truck tracking?",
        answer: "Every collection truck has a tracker that shares its location every few seconds, so the live map stays accurate and up to date."
      },
      {
        question: "What happens when I report an uncollected garbage bin?",
        answer: "When you submit a report, it appears right away on your barangay's live map. The collection team reviews it and dispatches a truck to handle it, and you can follow your report's status from your own report list."
      },
      {
        question: "Can I track trucks outside of my designated Barangay?",
        answer: "During the pilot, your map is focused on your own barangay's coverage area so it always stays clear and easy to read. As Bin'Go expands to more barangays, you'll be able to follow collection activity in every covered area."
      }
    ]
  },
  {
    title: "Privacy & Security",
    icon: <ShieldCheck className="w-5 h-5" />,
    faqs: [
      {
        question: "Are my reports anonymous?",
        answer: "Reports are linked to your account so the barangay team can follow up if they need more details. Your personal information is only visible to the authorized barangay staff handling your report, never to other residents."
      },
      {
        question: "How is my location data used?",
        answer: "We only request location access when you are actively viewing the live map (to show your position relative to the trucks) or when you are dropping a pin for a waste report. We never track your location in the background."
      },
      {
        question: "Can I turn off the notification sounds?",
        answer: "Yes. Open your profile and switch off 'Notification Sounds' to mute the pickup chimes. Your visual alerts in the app header will keep working either way."
      }
    ]
  }
];

function FaqItem({ question, answer, isOpen, onClick }) {
  return (
    <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none cursor-pointer"
      >
        <h4 className="text-lg font-bold text-zinc-900 pr-8">{question}</h4>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0 text-emerald-600 w-8 h-8 flex items-center justify-center"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.div>
      </button>
      
      <motion.div
        initial={false}
        animate={{
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        className="overflow-hidden"
      >
        <div className="p-6 pt-0 text-zinc-600 leading-relaxed font-medium">
          {answer}
        </div>
      </motion.div>
    </div>
  );
}

export default function FaqsPage() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-10 sm:mb-16">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-4 sm:mb-6 leading-[1.15]">
            Frequently Asked Questions
          </h1>
          <p className="text-sm sm:text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about setting up and using the Bin'Go platform.
          </p>
        </div>

        {/* FAQs List */}
        <div className="space-y-12">
          {faqCategories.map((category, catIndex) => (
            <div key={catIndex}>
              <div className="mb-6">
                <h3 className="text-2xl font-black text-zinc-900">
                  {category.title}
                </h3>
              </div>

              <div className="space-y-4">
                {category.faqs.map((faq, faqIndex) => {
                  const id = `${catIndex}-${faqIndex}`;
                  return (
                    <FaqItem
                      key={id}
                      question={faq.question}
                      answer={faq.answer}
                      isOpen={openIndex === id}
                      onClick={() => setOpenIndex(openIndex === id ? null : id)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still have questions CTA */}
        <div className="mt-20 bg-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">Still have questions?</h3>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Can't find the answer you're looking for? Send us a message or request a demo tailored to your barangay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/demo"
                className="w-48 sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl text-sm sm:text-base font-bold hover:bg-emerald-500 transition-colors cursor-pointer text-center"
              >
                Request a Demo
              </Link>
              <Link
                href="/support"
                className="w-48 sm:w-auto px-8 py-3 bg-zinc-800 text-white rounded-xl text-sm sm:text-base font-bold hover:bg-zinc-700 transition-colors cursor-pointer text-center"
              >
                Contact Support
              </Link>
              <a href="/#home" className="w-48 sm:w-auto px-8 py-3 bg-zinc-800 text-white rounded-xl text-sm sm:text-base font-bold hover:bg-zinc-700 transition-colors cursor-pointer">
                Back to Home
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
