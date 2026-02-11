
import React, { useState, useMemo, useCallback, ChangeEvent } from 'react';
import type { DocumentPage, Chunk, ChunkConfig } from './types';
import { RAGVisualizer } from './components/RAGVisualizer';
import * as pdfjs from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set up the PDF.js worker dynamically to prevent version mismatch errors.
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;


const CHUNK_COLORS = [
  'bg-blue-500/30 border-l-4 border-blue-400',
  'bg-green-500/30 border-l-4 border-green-400',
  'bg-yellow-500/30 border-l-4 border-yellow-400',
  'bg-purple-500/30 border-l-4 border-purple-400',
  'bg-red-500/30 border-l-4 border-red-400',
  'bg-indigo-500/30 border-l-4 border-indigo-400',
  'bg-pink-500/30 border-l-4 border-pink-400',
];

const DEFAULT_CONFIG = JSON.stringify({
  chunkSize: 1000,
  overlap: 200,
}, null, 2);

// --- Helper Icon Components ---

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CodeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- UI Components ---

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  fileName: string | null;
  isLoading: boolean;
}

interface LabeledValue {
  label: string;
}
 
function printLabel(labeledObj: LabeledValue) {
  console.log(labeledObj.label);
}
 
let myObj = { size: 10, label: "Size 10 Object",  name: "john"};
printLabel(myObj);

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, fileName, isLoading }) => {
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-gray-800/50">
      <h2 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
        <UploadIcon className="w-5 h-5 mr-2" />
        1. Upload Resource
      </h2>
      <label htmlFor="file-upload" className={`cursor-pointer group relative w-full flex justify-center items-center px-4 py-6 border-2 border-gray-600 border-dashed rounded-md transition-colors ${isLoading ? 'cursor-not-allowed' : 'hover:border-indigo-500'}`}>
        <div className="text-center">
            {isLoading ? (
                <>
                    <SpinnerIcon className="mx-auto h-10 w-10 text-indigo-400" />
                    <p className="mt-1 text-sm text-gray-400">Processing PDF...</p>
                </>
            ) : (
                <>
                    <UploadIcon className="mx-auto h-10 w-10 text-gray-500 group-hover:text-indigo-400 transition-colors" />
                    <p className="mt-1 text-sm text-gray-400">
                        <span className="font-semibold text-indigo-400">Click to upload</span> a PDF
                    </p>
                    {fileName && <p className="text-xs text-gray-500 mt-2">Loaded: {fileName}</p>}
                </>
            )}
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" disabled={isLoading} />
      </label>
    </div>
  );
};

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  error: string | null;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ code, setCode, error }) => {
  return (
    <div className="p-4 rounded-lg bg-gray-800/50">
      <h2 className="text-lg font-semibold text-gray-200 mb-3 flex items-center">
        <CodeIcon className="w-5 h-5 mr-2" />
        2. Configure Chunking
      </h2>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={`w-full h-32 p-3 font-mono text-sm bg-gray-900 rounded-md border-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${error ? 'border-red-500' : 'border-gray-700'}`}
        spellCheck="false"
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [documentPages, setDocumentPages] = useState<DocumentPage[]>([]);
  const [fullText, setFullText] = useState<string>('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [code, setCode] = useState<string>(DEFAULT_CONFIG);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setFileName(file.name);
    setIsLoading(true);
    setConfigError(null);
    setDocumentPages([]);
    setFullText('');

    try {
        const reader = new FileReader();
        reader.onload = async (event) => {
            if (!event.target?.result) {
                setConfigError('Failed to read file.');
                setIsLoading(false);
                return;
            }

            try {
                const loadingTask = pdfjs.getDocument(event.target.result as ArrayBuffer);
                const pdf = await loadingTask.promise;

                const pages: DocumentPage[] = [];
                let fullTextContent = '';
                let currentCharacterIndex = 0;

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    const pageText = textContent.items
                      .map(item => ('str' in item ? item.str : ''))
                      .join(' ');

                    pages.push({
                        pageNumber: i,
                        charCount: pageText.length,
                        startCharIndex: currentCharacterIndex,
                    });

                    fullTextContent += pageText + '\n\n'; // Add spacing between pages for clarity
                    currentCharacterIndex += pageText.length + 2;
                }

                setDocumentPages(pages);
                setFullText(fullTextContent);
            } catch (e: any) {
                setConfigError(`Error parsing PDF: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        reader.onerror = () => {
             setConfigError('Failed to read the PDF file.');
             setIsLoading(false);
        }

        reader.readAsArrayBuffer(file);

    } catch (e: any) {
        setConfigError(`An unexpected error occurred: ${e.message}`);
        setIsLoading(false);
    }
  }, []);

  const chunkConfig = useMemo<ChunkConfig | null>(() => {
    try {
      const parsed = JSON.parse(code);
      if (typeof parsed.chunkSize !== 'number' || typeof parsed.overlap !== 'number') {
        throw new Error("Config must have 'chunkSize' and 'overlap' as numbers.");
      }
      if (parsed.chunkSize <= 0) {
        throw new Error("'chunkSize' must be positive.");
      }
      if (parsed.overlap >= parsed.chunkSize) {
        throw new Error("'overlap' must be less than 'chunkSize'.");
      }
       if (parsed.overlap < 0) {
        throw new Error("'overlap' cannot be negative.");
      }
      setConfigError(null);
      return parsed;
    } catch (e: any) {
      setConfigError(e.message);
      return null;
    }
  }, [code]);

  const chunks = useMemo<Chunk[]>(() => {
    if (!chunkConfig || documentPages.length === 0) {
      return [];
    }
    
    const { chunkSize, overlap } = chunkConfig;
    const totalChars = fullText.length;
    const generatedChunks: Chunk[] = [];
    
    let start = 0;
    let colorIndex = 0;
    while (start < totalChars) {
      const end = Math.min(start + chunkSize, totalChars);
      generatedChunks.push({
        start,
        end,
        color: CHUNK_COLORS[colorIndex % CHUNK_COLORS.length],
      });

      if (end === totalChars) break;

      start += chunkSize - overlap;
      colorIndex++;
    }

    return generatedChunks;
  }, [fullText, chunkConfig, documentPages]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-800/30 border-b border-gray-700 p-4">
        <h1 className="text-2xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
          RAG Chunking Visualizer
        </h1>
      </header>
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-[calc(100vh-65px)]">
        <div className="flex flex-col gap-6">
          <FileUpload onFileUpload={handleFileUpload} fileName={fileName} isLoading={isLoading}/>
          <CodeEditor code={code} setCode={setCode} error={configError} />
        </div>
        <div className="flex flex-col bg-gray-900/50 rounded-lg p-4 h-full">
          <h2 className="text-lg font-semibold text-gray-200 mb-4 flex-shrink-0">
            Visualization
          </h2>
          <div className="flex-grow min-h-0">
            <RAGVisualizer pages={documentPages} chunks={chunks} fullText={fullText} />
          </div>
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4f46e5;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6366f1;
        }
      `}</style>
    </div>
  );
};

export default App;
