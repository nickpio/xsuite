import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { Play, Save, FolderOpen } from 'lucide-react';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: localStorage.getItem('xai-api-key') || '',
  baseURL: 'https://api.x.ai/v1',
  dangerouslyAllowBrowser: true,
});

export function GrokCode() {
  const [code, setCode] = useState('// Open a folder to start coding');
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [folderHandle, setFolderHandle] = useState<any>(null);
  const [apiKey] = useState(localStorage.getItem('xai-api-key') || '');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const openFolder = async () => {
    const handle = await (window as any).showDirectoryPicker();
    setFolderHandle(handle);
    const fileList: string[] = [];
    for await (const entry of handle.values()) {
      if (entry.kind === 'file') fileList.push(entry.name);
    }
    setFiles(fileList);
  };

  const openFile = async (filename: string) => {
    const fileHandle = await folderHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    setCode(text);
    setFileHandle(fileHandle);
  };

  const saveFile = async () => {
    if (!fileHandle) return alert('Open a file first');
    const writable = await fileHandle.createWritable();
    await writable.write(code);
    await writable.close();
    alert('✅ File saved');
  };

  const getGrokCompletion = async () => {
    if (!apiKey) return alert('Enter your xAI API key');
    setIsLoading(true);

    try {
      const completion = await openai.chat.completions.create({
        model: 'grok-code-fast-1',
        messages: [
          { role: 'system', content: 'You are a Cursor-like coding agent. Analyze the code and return ONLY the improved version ready to replace the current file.' },
          { role: 'user', content: code }
        ],
      });

      const newCode = completion.choices[0].message.content || code;
      setCode(newCode);
    } catch (e) {
      alert('Grok error: ' + (e as Error).message);
    }
    setIsLoading(false);
  };

  const runCode = () => {
    try {
      const result = eval(code);
      setOutput(String(result));
    } catch (e) {
      setOutput('Error: ' + (e as Error).message);
    }
  };

  return (
    <div className="h-full flex bg-zinc-950">
      {/* File explorer sidebar */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-900 p-4 overflow-auto">
        <button
          onClick={openFolder}
          className="w-full bg-white text-black py-3 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:bg-zinc-200 mb-6"
        >
          <FolderOpen className="w-5 h-5" />
          Open Folder
        </button>

        <div className="text-xs text-zinc-400 mb-2">FILES</div>
        {files.map((file, i) => (
          <button
            key={i}
            onClick={() => openFile(file)}
            className="w-full text-left px-4 py-2 hover:bg-zinc-800 rounded-xl text-sm"
          >
            {file}
          </button>
        ))}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <MonacoEditor
          height="100%"
          language="javascript"
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || '')}
          options={{ fontSize: 15, minimap: { enabled: false }, automaticLayout: true }}
        />
      </div>

      {/* Controls sidebar */}
      <div className="w-80 border-l border-zinc-800 bg-zinc-900 p-6 flex flex-col">
        <div className="mb-6">
          <button onClick={getGrokCompletion} disabled={isLoading} className="w-full bg-gradient-to-r from-purple-500 to-blue-500 py-4 rounded-2xl font-semibold flex items-center justify-center gap-3">
            {isLoading ? 'Grok Agent working...' : 'Ask grok-code-fast-1 Agent'}
          </button>
        </div>

        <div className="space-y-4">
          <button onClick={saveFile} className="w-full bg-white text-black py-4 rounded-2xl font-semibold flex items-center justify-center gap-3">
            <Save className="w-5 h-5" /> Save File
          </button>
          <button onClick={runCode} className="w-full bg-white text-black py-4 rounded-2xl font-semibold flex items-center justify-center gap-3">
            <Play className="w-5 h-5" /> Run Code
          </button>
        </div>

        <div className="flex-1 mt-8 bg-black rounded-2xl p-6 font-mono text-sm overflow-auto">
          OUTPUT:<br />{output || 'Run code to see output'}
        </div>
      </div>
    </div>
  );
}