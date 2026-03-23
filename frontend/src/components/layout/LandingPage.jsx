import { Code, GraduationCap, ArrowRight, Info } from 'lucide-react';
import agedLogo from '../../assets/aged_logo.png';

const LandingPage = ({ onSelect }) => {
  return (
    <div className="landing-container relative flex flex-col items-center justify-center min-h-screen text-center p-6 py-12 overflow-hidden bg-black">
      {/* Floating Vector Background */}
      <div className="vector-container">
        <div className="grid-overlay"></div>
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="vector-polygon"
            style={{
              width: `${Math.random() * 150 + 50}px`,
              height: `${Math.random() * 150 + 50}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              clipPath: i % 3 === 0
                ? 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)'
                : i % 3 === 1
                  ? 'polygon(25% 0%, 100% 0%, 75% 100%, 0% 100%)'
                  : 'polygon(50% 0%, 0% 100%, 100% 100%)',
              '--duration': `${Math.random() * 20 + 15}s`,
              opacity: 0.1 + (Math.random() * 0.1)
            }}
          ></div>
        ))}
      </div>

      <div className="landing-hero mb-8 w-full max-w-4xl relative z-10 animate-fade-in flex flex-col items-center">
        {/* Large Central Brand Identity */}
        <div className="flex flex-col items-center mb-16">
          <div className="w-36 h-36 md:w-72 md:h-72 mb-8 relative z-10 flex items-center justify-center transform transition-all duration-700 hover:scale-105">
            {/* Soft Glow Aura */}
            <div className="absolute inset-0 bg-[var(--theme-primary)]/20 blur-[100px] rounded-full animate-pulse"></div>
            <img
              src={agedLogo}
              alt="AGED Logo"
              className="w-full h-full object-contain mix-blend-screen filter drop-shadow-[0_0_60px_var(--theme-glow)] relative z-20"
              style={{
                maskImage: 'radial-gradient(circle at center, black 65%, transparent 95%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 65%, transparent 95%)'
              }}
            />
          </div>
          <p className="text-white text-3xl md:text-5xl font-black tracking-tight mb-4 drop-shadow-[0_0_20px_var(--theme-glow)]">
            Document Architect & Learning Partner
          </p>
          <div className="h-1.5 w-32 bg-aged-cyan rounded-full mb-8 shadow-[0_0_15px_var(--theme-glow)]"></div>
        </div>

        <p className="landing-description text-gray-400 mb-16 max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium">
          The ultimate AI workspace for high-fidelity documentation and deep code discovery.
          Bridge the gap between complex logic and professional reporting.
        </p>

        {/* System Protocol Selection Cards */}
        <div className="selection-grid grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div
            className="selection-card developer glass p-10 rounded-[2.5rem] cursor-pointer border border-white/5 hover:border-cyan-400/50 transition-all duration-500 group relative overflow-hidden bg-white/[0.02] text-left"
            onClick={() => onSelect('developer')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-cyan-400/10 text-cyan-400 group-hover:scale-110 transition-transform">
                <Code size={32} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Developer</h2>
            </div>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
              For professionals. Generate high-fidelity READMEs, Technical Specs,
              and API documentation with structural precision and engineering best practices.
            </p>
            <div className="card-footer flex items-center justify-between text-cyan-400 font-black text-[10px] tracking-[0.3em] bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:bg-cyan-400 group-hover:text-black transition-all">
              <span>INITIALIZE DEVELOPER CORE</span>
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>

          <div
            className="selection-card learner glass-premium p-10 rounded-[2.5rem] cursor-pointer border border-white/5 hover:border-purple-400/50 transition-all duration-500 group relative overflow-hidden bg-white/[0.02] text-left"
            onClick={() => onSelect('learner')}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-purple-400/10 text-purple-400 group-hover:scale-110 transition-transform">
                <GraduationCap size={32} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Learner</h2>
            </div>
            <p className="text-gray-400 text-sm mb-10 leading-relaxed font-medium">
              For learners. Break down complex logic line-by-line, explore architectural
              decisions through analogies, and simplify high-level concepts into actionable knowledge.
            </p>
            <div className="card-footer flex items-center justify-between text-purple-400 font-black text-[10px] tracking-[0.3em] bg-white/5 p-5 rounded-2xl border border-white/5 group-hover:bg-purple-500 group-hover:text-black transition-all">
              <span>INITIALIZE LEARNING ENGINE</span>
              <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
