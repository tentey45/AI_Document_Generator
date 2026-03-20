import { Code, GraduationCap, ArrowRight, Info } from 'lucide-react';

const LandingPage = ({ onSelect }) => {
  return (
    <div className="landing-container flex flex-col items-center justify-center min-h-screen text-center p-6">
      <div className="landing-hero mb-8 w-full max-w-3xl">
        <h1 className="landing-title text-5xl md:text-6xl font-bold mb-4">AGED <span className="text-aged-cyan">AI</span></h1>
        <p className="landing-subtitle text-xl text-gray-300 mb-2">Professional AI Document Architect & Assistant</p>
        <p className="landing-description text-gray-400 mb-8 max-w-2xl mx-auto">
          Generate high-fidelity technical documentation, learn and analyze complex code, or simply chat to brainstorm.
        </p>

        {/* Guidelines Section */}
        <div className="guidelines bg-white/5 border border-white/10 rounded-2xl p-6 text-left shadow-lg mb-10 backdrop-blur-md">
          <div className="flex items-center gap-3 text-aged-cyan mb-4">
            <Info size={24} />
            <h3 className="text-xl font-semibold text-white">How AGED Works</h3>
          </div>
          <p className="text-gray-300 mb-5 text-sm leading-relaxed">
            AGED features two specialized personas tailored to your workflow. Select a mode to begin:
          </p>
          <ul className="space-y-5 text-sm text-gray-300 mb-6">
            <li className="flex gap-4">
              <Code className="text-cyan-400 shrink-0 mt-1" size={20} />
              <div>
                <strong className="text-white block text-base mb-1">Developer Mode</strong>
                Engineered for software professionals. Use it to generate structured, precise technical documentation (such as READMEs, API guides, and architecture overviews) or discuss advanced engineering and system design concepts.
              </div>
            </li>
            <li className="flex gap-4">
              <GraduationCap className="text-purple-400 shrink-0 mt-1" size={20} />
              <div>
                <strong className="text-white block text-base mb-1">Learner Mode</strong>
                Acts as your Senior Code Mentor. Choose this if you want to break down complex logic line-by-line, explore the 'Why' behind architectural choices, and receive easy-to-follow analogies and tutorials.
              </div>
            </li>
          </ul>
          <div className="text-xs text-gray-400 font-medium bg-black/30 p-4 rounded-xl border border-white/5">
            <span className="text-white">💡 Pro Tip:</span> You don't always have to generate documents. You can chat with AGED normally for brainstorming and coding help. If you ever type something unreadable, AGED will politely ask for clarification.
          </div>
        </div>
      </div>

      <div className="selection-grid grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        <div 
          className="selection-card developer glass p-8 rounded-2xl cursor-pointer border border-white/10 hover:border-cyan-400 transition-all duration-300 group relative overflow-hidden" 
          onClick={() => onSelect('developer')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="card-icon mb-6 text-cyan-400 group-hover:scale-110 transition-transform origin-left">
            <Code size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white text-left">Developer</h2>
          <p className="text-gray-400 text-sm mb-8 text-left h-12">Document your code with technical precision, logic traces, and best practices.</p>
          <div className="card-footer flex items-center justify-between text-cyan-400 font-semibold text-sm">
            <span>GET STARTED</span>
            <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>

        <div 
          className="selection-card learner glass p-8 rounded-2xl cursor-pointer border border-white/10 hover:border-purple-400 transition-all duration-300 group relative overflow-hidden" 
          onClick={() => onSelect('learner')}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="card-icon mb-6 text-purple-400 group-hover:scale-110 transition-transform origin-left">
            <GraduationCap size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-3 text-white text-left">Learner</h2>
          <p className="text-gray-400 text-sm mb-8 text-left h-12">Deeply understand code and learn concepts with easy-to-follow analogies.</p>
          <div className="card-footer flex items-center justify-between text-purple-400 font-semibold text-sm">
            <span>GET STARTED</span>
            <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
