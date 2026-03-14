import { useState, useRef } from 'react';
import { BookOpen, LogIn } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { XAI, Grok } from '@lobehub/icons';
import logo from './assets/x-suite-logo.png';
//import { GrokCode } from './tabs/GrokCode';

const tabs = [
  { id: 'x', label: 'X', icon: FaXTwitter, url: 'https://x.com', bg: 'bg-black' },
  { id: 'grok', label: 'Grok', icon: Grok, url: 'https://grok.com', bg: 'bg-zinc-950' },
  { id: 'console', label: 'Console', icon: XAI, url: 'https://console.x.ai', bg: 'bg-zinc-900' },
  { id: 'grokipedia', label: 'Grokipedia', icon: BookOpen, url: 'https://grokipedia.com', bg: 'bg-zinc-900' },
];

const SHARED_PARTITION = 'persist:xsuite';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [activeTab, setActiveTab] = useState('grok');
  const webviewRef = useRef<any>(null);

  const current = tabs.find(t => t.id === activeTab);

  const handleSignIn = () => {
    console.log('🚀 Sign in with X button clicked — switching to X tab');
    setShowLogin(false);
    setActiveTab('x');
  };

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Compact vertically-centered sidebar */}
      {!showLogin && (
        <div className="w-20 h-full flex flex-col justify-center items-center space-y-6 transition-colors duration-300 bg-black">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`p-3 rounded-2xl transition-all hover:bg-white/10 group relative
                          ${activeTab === id ? 'bg-white/10 shadow-inner' : 'text-zinc-400'}`}
              title={tabs.find(t => t.id === id)?.label}
            >
              <Icon className="w-6 h-6" />
              {activeTab === id && <div className="absolute -left-px top-3 bottom-3 w-0.5 bg-white rounded-r" />}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {showLogin ? (
          /* Pure black minimal login screen with your custom logo */
          <div className="h-full flex items-center justify-center bg-black">
            <div className="text-center">
              <div className="mb-10">
                <img 
                  src={logo} 
                  alt="xsuite" 
                  className="mx-auto w-[220px] h-auto object-contain"
                />
              </div>
              <p className="text-zinc-400 text-xl mb-12">All your X & xAI apps. One native application.</p>

              <button
                onClick={handleSignIn}
                className="w-80 bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition text-lg"
              >
                <LogIn className="w-5 h-5" />
                Sign in with X
              </button>
            </div>
          </div>
        ) : (
          <webview
            ref={webviewRef}
            src={current?.url}
            partition={SHARED_PARTITION}
            className="absolute inset-0 w-full h-full border-0"
            style={{ background: '#09090b' }}
            allowpopups
          />
        )}
      </div>
    </div>
  );
}

export default App;