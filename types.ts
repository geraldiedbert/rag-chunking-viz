
export interface DocumentPage {
  pageNumber: number;
  charCount: number;
  startCharIndex: number;
}

export interface Chunk {
  start: number;
  end: number;
  color: string;
}

export interface ChunkConfig {
  chunkSize: number;
  overlap: number;
}
