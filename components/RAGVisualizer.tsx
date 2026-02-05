
import React from 'react';
import type { DocumentPage, Chunk } from '../types';

interface RAGVisualizerProps {
  pages: DocumentPage[];
  chunks: Chunk[];
  fullText: string;
}

const PAGE_HEIGHT_PX = 320; // Corresponds to h-80

export const RAGVisualizer: React.FC<RAGVisualizerProps> = ({ pages, chunks, fullText }) => {
  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full border-2 border-dashed border-gray-700 rounded-lg bg-gray-800/50">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-300">Awaiting Document</h3>
          <p className="mt-1 text-sm text-gray-500">Upload a PDF to visualize chunking.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative h-full overflow-y-auto pr-4 custom-scrollbar">
      {pages.map((page, pageIndex) => (
        <div key={page.pageNumber} className="relative w-full h-80 bg-gray-300 rounded-md shadow-lg mb-4 text-gray-900 p-4 box-border">
          <div className="absolute top-2 left-2 text-xs font-mono bg-gray-900/50 text-white px-2 py-1 rounded">
            Page {page.pageNumber}
          </div>
          {chunks
            .filter(chunk => chunk.start < page.startCharIndex + page.charCount && chunk.end > page.startCharIndex)
            .map((chunk, chunkIndex) => {
              const visualStart = Math.max(chunk.start, page.startCharIndex);
              const visualEnd = Math.min(chunk.end, page.startCharIndex + page.charCount);
              
              const top = ((visualStart - page.startCharIndex) / page.charCount) * PAGE_HEIGHT_PX;
              const height = ((visualEnd - visualStart) / page.charCount) * PAGE_HEIGHT_PX;

              const chunkText = fullText.substring(chunk.start, chunk.end);

              return (
                <div
                  key={`chunk-${chunkIndex}-page-${pageIndex}`}
                  className={`absolute left-0 w-full rounded-sm animate-fade-in ${chunk.color} p-2 box-border flex flex-col overflow-hidden`}
                  style={{ top: `${top}px`, height: `${height}px` }}
                  title={`Chunk ${chunkIndex + 1}:\n\n${chunkText}`}
                >
                  <strong className="text-white font-bold text-xs flex-shrink-0 select-none">
                    Chunk {chunkIndex + 1}
                  </strong>
                  <p className="text-white/90 text-[10px] leading-snug mt-1 overflow-hidden select-none">
                    {chunkText}
                  </p>
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
};
