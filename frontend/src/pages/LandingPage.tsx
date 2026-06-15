import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#000000] text-[#FFFFEA] relative overflow-hidden bg-glow-radial">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 w-full px-6 py-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-4xl text-teal-400">mic</span>
          <span className="text-2xl font-bold tracking-tight">Meet Scribe</span>
        </div>
        <div>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2 rounded-xl border border-white/20 hover:bg-white/10 transition-colors font-medium backdrop-blur-md"
          >
            Log In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 text-center max-w-5xl mx-auto mt-12 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-teal-500/30 bg-teal-500/10 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="text-sm font-medium text-teal-300 tracking-wide uppercase">AI Meeting Assistant</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight"
        >
          AI that listens, <br className="hidden md:block" />
          <span className="text-gradient">so you don't have to.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg md:text-xl text-gray-400 max-w-3xl mb-12 leading-relaxed"
        >
          Meet Scribe automatically joins your Google Meet calls, captures every word, and delivers high-impact, structured summaries—all in real-time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button 
            onClick={() => navigate('/login')}
            className="accent-btn text-lg px-8 py-4 flex items-center gap-2"
          >
            Get Started Free
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </motion.div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 px-4 py-24 bg-white/[0.02] border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">A Technical Masterpiece</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Engineered for performance and designed for focus, Meet Scribe is your ultimate meeting companion.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="glass-card-hover p-6 flex flex-col items-start text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center mb-6">
                  <span className="material-symbols-outlined text-teal-400">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Meet Scribe. Built with ❤️ for better meetings.</p>
      </footer>
    </div>
  );
};

const features = [
  {
    title: "Autonomous Bot",
    description: "Set it and forget it. The bot joins your meeting via a simple link and works silently in the background.",
    icon: "smart_toy"
  },
  {
    title: "Real-time Transcription",
    description: "Watch as words turn into text with low-latency WebSocket streaming directly to your dashboard.",
    icon: "closed_caption"
  },
  {
    title: "AI Synthesis",
    description: "Powered by Google Gemini Pro, generating intelligent summaries, action items, and key takeaways.",
    icon: "psychology"
  },
  {
    title: "Private & Secure",
    description: "Enterprise-grade architecture ensuring your meeting data stays entirely yours.",
    icon: "lock"
  }
];
