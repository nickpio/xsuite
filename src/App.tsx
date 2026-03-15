import { useState } from 'react';
import { BookOpen, LogIn } from 'lucide-react';
import { FaXTwitter } from 'react-icons/fa6';
import { XAI, Grok } from '@lobehub/icons';
import * as FlexLayout from 'flexlayout-react';
import logo from './assets/x-suite-logo.png';

const tabs = [
  { id: 'x', label: 'X', icon: FaXTwitter, url: 'https://x.com', bg: 'bg-black' },
  { id: 'grok', label: 'Grok', icon: Grok, url: 'https://grok.com', bg: 'bg-zinc-950' },
  { id: 'console', label: 'Console', icon: XAI, url: 'https://console.x.ai', bg: 'bg-zinc-900' },
  { id: 'grokipedia', label: 'Grokipedia', icon: BookOpen, url: 'https://grokipedia.com', bg: 'bg-zinc-900' },
];

const initialLayoutConfig: FlexLayout.IJsonModel = {
  global: {
    tabEnableClose: true,
    enableEdgeDock: true,
  },
  borders: [],
  layout: {
    type: "row",
    weight: 100,
    children: [
      {
        type: "tabset",
        weight: 25,
        children: [{ type: "tab", name: "", component: "x", id: "x" }]
      },
      {
        type: "tabset",
        weight: 50,
        children: [{ type: "tab", name: "", component: "grok", id: "grok" }]
      },
      {
        type: "row",
        weight: 25,
        children: [
          {
            type: "tabset",
            weight: 50,
            children: [{ type: "tab", name: "", component: "console", id: "console" }]
          },
          {
            type: "tabset",
            weight: 50,
            children: [{ type: "tab", name: "", component: "grokipedia", id: "grokipedia" }]
          }
        ]
      }
    ]
  }
};

const SHARED_PARTITION = 'persist:xsuite';

function App() {
  const [showLogin, setShowLogin] = useState(true);
  const [model] = useState(() => FlexLayout.Model.fromJson(initialLayoutConfig));
  const [activeTab, setActiveTab] = useState('grok');

  // Keep activeTab in sync with layout selections 
  const onModelChange = () => {
    const activeNode = model.getActiveTabset()?.getSelectedNode() as FlexLayout.TabNode;
    if (activeNode) {
      setActiveTab(activeNode.getComponent() || '');
    }
  };

  const handleSignIn = () => {
    console.log('🚀 Sign in with X button clicked — switching to X tab');
    setShowLogin(false);
    model.doAction(FlexLayout.Actions.selectTab('x'));
  };

  const handleSidebarClick = (id: string) => {
    try {
      if (model.getNodeById(id)) {
        // Tab exists, just select it
        model.doAction(FlexLayout.Actions.selectTab(id));
      } else {
        // Tab was closed, recreate it
        const tabConfig = tabs.find(t => t.id === id);
        if (tabConfig) {
          // Find the active tabset, or fallback to root
          let targetNodeId = model.getActiveTabset()?.getId();
          if (!targetNodeId) {
            targetNodeId = model.getRoot().getId();
          }

          model.doAction(FlexLayout.Actions.addNode(
            { type: "tab", component: id, name: "", id: id },
            targetNodeId,
            FlexLayout.DockLocation.CENTER,
            -1
          ));
        }
      }
      setActiveTab(id);
    } catch (err) {
      console.error("Failed to add or select tab", id, err);
    }
  };

  const onRenderTab = (node: FlexLayout.TabNode, renderState: any) => {
    const component = node.getComponent();
    const tabConfig = tabs.find(t => t.id === component);
    if (tabConfig) {
      const Icon = tabConfig.icon;
      renderState.content = <div className="flex items-center justify-center w-full h-full"><Icon className="w-4 h-4 text-zinc-400" /></div>;
    }
  };

  const factory = (node: FlexLayout.TabNode) => {
    const component = node.getComponent();
    const tabConfig = tabs.find(t => t.id === component);
    
    if (!tabConfig) return <div>Invalid Tab</div>;
    
    return (
      <webview
        src={tabConfig.url}
        partition={SHARED_PARTITION}
        className="w-full h-full border-0"
        style={{ background: '#09090b', display: 'flex' }}
        allowpopups
      />
    );
  };

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Compact vertically-centered sidebar */}
      {!showLogin && (
        <div className="w-20 pt-10 h-full flex flex-col justify-start items-center space-y-6 transition-colors duration-300 bg-black z-10 border-r border-zinc-900">
          {tabs.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSidebarClick(id)}
              className={`p-3 rounded-2xl transition-all hover:bg-white/10 group relative
                          ${activeTab === id ? 'bg-white/10 shadow-inner' : 'text-zinc-500 hover:text-white'}`}
              title={tabs.find(t => t.id === id)?.label}
            >
              <Icon className="w-6 h-6" />
              {activeTab === id && <div className="absolute -left-px top-3 bottom-3 w-0.5 bg-white rounded-r" />}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden bg-black">
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
                className="w-80 bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition text-lg mx-auto"
              >
                <LogIn className="w-5 h-5" />
                Sign in with X
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute top-0 right-0 left-0 bottom-0 overflow-hidden">
            <FlexLayout.Layout 
              model={model} 
              factory={factory} 
              onRenderTab={onRenderTab}
              onModelChange={onModelChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;