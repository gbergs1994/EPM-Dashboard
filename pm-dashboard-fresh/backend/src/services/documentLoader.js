const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');

class DocumentLoader {
  constructor() {
    this.documentsPath = path.join(__dirname, '../../training-documents');
    this.processedDocuments = [];
    this.documentChunks = [];
  }

  async loadAllDocuments() {
    try {
      console.log('📚 Loading training documents from:', this.documentsPath);
      
      try {
        await fs.access(this.documentsPath);
      } catch {
        await fs.mkdir(this.documentsPath, { recursive: true });
        console.log('📁 Created training-documents folder');
        console.log('📝 Please add your .docx, .pptx, and .txt files to:', this.documentsPath);
        return [];
      }

      const files = await fs.readdir(this.documentsPath);
      const supportedFiles = files.filter(file => 
        file.endsWith('.docx') || 
        file.endsWith('.doc') || 
        file.endsWith('.txt') || 
        file.endsWith('.pptx') ||
        file.endsWith('.ppt')
      );

      console.log(`📄 Found ${supportedFiles.length} training documents`);

      for (const filename of supportedFiles) {
        try {
          const filePath = path.join(this.documentsPath, filename);
          const content = await this.extractTextFromFile(filePath, filename);
          
          if (content && content.trim().length > 50) {
            const chunks = this.chunkText(content);
            
            const document = {
              filename,
              content,
              chunks,
              metadata: {
                category: this.categorizeDocument(filename),
                tags: this.extractTags(filename, content),
                processed_at: new Date().toISOString()
              }
            };

            this.processedDocuments.push(document);
            this.documentChunks.push(...chunks.map(chunk => ({
              source: filename,
              content: chunk,
              category: document.metadata.category
            })));

            console.log(`✅ Processed: ${filename} (${chunks.length} chunks)`);
          }
        } catch (error) {
          console.error(`❌ Failed to process ${filename}:`, error.message);
        }
      }

      console.log(`🎉 Loaded ${this.processedDocuments.length} documents with ${this.documentChunks.length} total chunks`);
      return this.processedDocuments;

    } catch (error) {
      console.error('❌ Error loading documents:', error);
      return [];
    }
  }

  async extractTextFromFile(filePath, filename) {
    try {
      if (filename.endsWith('.txt')) {
        return await fs.readFile(filePath, 'utf8');
      } 
      else if (filename.endsWith('.docx') || filename.endsWith('.doc')) {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      else if (filename.endsWith('.pptx') || filename.endsWith('.ppt')) {
        console.warn(`⚠️ PowerPoint files need manual conversion: ${filename}`);
        console.log(`💡 Please convert ${filename} to .txt format for automatic processing`);
        return null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error.message);
      return null;
    }
  }

  chunkText(text, maxLength = 1000) {
    try {
      const cleanText = text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();
      
      const paragraphs = cleanText.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      const chunks = [];
      let currentChunk = '';

      for (const paragraph of paragraphs) {
        if (currentChunk.length + paragraph.length > maxLength && currentChunk.length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = paragraph;
        } else {
          currentChunk += paragraph + '\n\n';
        }
      }

      if (currentChunk.trim().length > 0) {
        chunks.push(currentChunk.trim());
      }

      return chunks.filter(chunk => chunk.length > 50);
    } catch (error) {
      console.error('Error chunking text:', error.message);
      return [text]; 
    }
  }

  categorizeDocument(filename) {
    try {
      const name = filename.toLowerCase();
      
      if (name.includes('leadership') || name.includes('manage')) {
        return 'leadership';
      } else if (name.includes('career') || name.includes('development')) {
        return 'career_development';
      } else if (name.includes('process') || name.includes('procedure')) {
        return 'processes';
      } else if (name.includes('best') || name.includes('practice')) {
        return 'best_practices';
      } else if (name.includes('value') || name.includes('assessment')) {
        return 'assessment';
      } else if (name.includes('checklist') || name.includes('resource')) {
        return 'resources';
      } else {
        return 'general';
      }
    } catch (error) {
      console.warn('Error categorizing document:', error.message);
      return 'general';
    }
  }

  extractTags(filename, content) {
    try {
      const tags = [];
      const text = (filename + ' ' + content).toLowerCase();
      
      const keywords = [
        'project management', 'leadership', 'career', 'development',
        'planning', 'execution', 'monitoring', 'control',
        'risk', 'stakeholder', 'communication', 'team',
        'process', 'procedure', 'best practice', 'methodology',
        'value', 'assessment', 'checklist', 'resource'
      ];

      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          tags.push(keyword.replace(' ', '_'));
        }
      });

      return tags;
    } catch (error) {
      console.warn('Error extracting tags:', error.message);
      return ['general'];
    }
  }

  searchDocuments(query, limit = 3) {
    try {
      if (!query || typeof query !== 'string') {
        console.warn('⚠️ Invalid search query:', query);
        return [];
      }

      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(' ').filter(word => word.length > 2);
      
      console.log('🔍 Searching documents for query:', query);
      console.log('🔍 Query words:', queryWords);
      
      if (queryWords.length === 0) {
        console.log('⚠️ No valid search words found');
        return [];
      }

      const scoredChunks = this.documentChunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        let score = 0;
        
        queryWords.forEach(word => {
          try {
            const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedWord, 'gi');
            const matches = (content.match(regex) || []).length;
            score += matches;
          } catch (regexError) {
            console.warn(`⚠️ Regex error for word "${word}":`, regexError.message);
            const simpleMatches = content.split(word).length - 1;
            score += simpleMatches;
          }
        });
        
        return { ...chunk, score };
      });

      const results = scoredChunks
        .filter(chunk => chunk.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      console.log(`✅ Found ${results.length} relevant document chunks`);
      
      return results;
    } catch (error) {
      console.error('❌ Search error:', error.message);
      return [];
    }
  }

  getStats() {
    try {
      return {
        totalDocuments: this.processedDocuments.length,
        totalChunks: this.documentChunks.length,
        categories: [...new Set(this.processedDocuments.map(doc => doc.metadata.category))],
        avgChunksPerDoc: this.processedDocuments.length > 0 ? 
          Math.round(this.documentChunks.length / this.processedDocuments.length) : 0
      };
    } catch (error) {
      console.error('Error getting stats:', error.message);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        categories: [],
        avgChunksPerDoc: 0
      };
    }
  }
}

module.exports = new DocumentLoader();