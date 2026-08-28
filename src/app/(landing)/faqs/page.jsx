"use client";

import { motion } from "framer-motion";
import { ChevronDown, MessageCircleQuestion, Settings, ShieldCheck, MapPin, Smartphone } from "lucide-react";
import { useState } from "react";

const faqCategories = [
  {
    title: "General & Account",
    icon: <MessageCircleQuestion className="w-5 h-5" />,
    faqs: [
      {
        question: "What is Bin'Go and how does it work?",
        answer: "Bin'Go is a smart municipal waste collection platform that bridges the gap between citizens and local government units. Citizens use the mobile app to track garbage trucks in real-time and report illegal dumping. LGUs and haulers use our web dashboard to manage fleets, optimize routes, and respond to waste reports."
      },
      {
        question: "Do I need to pay to use the Bin'Go app?",
        answer: "No, the Bin'Go mobile app is 100% free for all citizens. Our mission is to make waste management transparent and accessible for every household."
      },
      {
        question: "Can I use my web account to log into the mobile app?",
        answer: "Yes! Bin'Go uses a secure login system. You can register on the web and use the exact same credentials to log into the iOS or Android mobile application."
      }
    ]
  },
  {
    title: "Tracking & Reports",
    icon: <MapPin className="w-5 h-5" />,
    faqs: [
      {
        question: "How accurate is the live truck tracking?",
        answer: "Our tracking system relies on GPS devices installed in the collection trucks, providing real-time location updates every 5-10 seconds depending on network connectivity."
      },
      {
        question: "What happens when I report an uncollected garbage bin?",
        answer: "When you submit a report via the mobile app, it is instantly pinned on the live map in the municipal dashboard. Dispatchers can then assign the nearest available truck to resolve the issue, and you'll receive a notification when it's picked up."
      },
      {
        question: "Can I track trucks outside of my designated Barangay?",
        answer: "By default, your dashboard highlights the collection routes and trucks active in your registered Barangay to reduce noise. However, you can use the interactive map to view ongoing operations across the entire municipality."
      }
    ]
  },
  {
    title: "Privacy & Security",
    icon: <ShieldCheck className="w-5 h-5" />,
    faqs: [
      {
        question: "Are my reports anonymous?",
        answer: "Yes, you have the option to toggle 'Anonymous Mode' when submitting a report for illegal dumping. In this mode, the LGU dashboard will only see the report details and location, not your personal information."
      },
      {
        question: "How is my location data used?",
        answer: "We only request location access when you are actively viewing the live map (to show your position relative to the trucks) or when you are dropping a pin for a waste report. We never track your location in the background."
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
          className="shrink-0 text-emerald-600 bg-emerald-50 w-8 h-8 rounded-xl flex items-center justify-center"
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
  const [openIndex, setOpenIndex] = useState("0-0");

  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-zinc-600 font-medium max-w-2xl mx-auto">
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
        <div className="mt-20 bg-emerald-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent bg-[length:20px_20px]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)" }} />
          
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">Still have questions?</h3>
            <p className="text-emerald-100 font-medium mb-8 max-w-lg mx-auto">
              Can't find the answer you're looking for? Please chat to our friendly team or request a demo tailored to your municipality.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("openContactSheet"))}
                className="w-full sm:w-auto px-8 py-3 bg-white text-emerald-900 rounded-xl font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
