const fs = require('fs').promises;
const path = require('path');
const mammoth = require('mammoth');
const { Pool } = require('pg');
const multer = require('multer');

class ComprehensiveDocumentManager {
  constructor() {
    this.documentsPath = path.join(__dirname, '../../training-documents');
    this.tempUploadPath = path.join(__dirname, '../../temp-uploads');
    this.processedDocuments = [];
    this.documentChunks = [];
    
    this.dbPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'project_manager',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

    this.supportedFormats = [
      '.txt', '.doc', '.docx', '.pdf', '.rtf',
      '.pptx', '.ppt', '.xlsx', '.xls', '.csv'
    ];

    this.initializeDirectories();
  }

  async initializeDirectories() {
    try {
      await fs.mkdir(this.documentsPath, { recursive: true });
      await fs.mkdir(this.tempUploadPath, { recursive: true });
      console.log('📁 Document directories initialized');
    } catch (error) {
      console.error('❌ Failed to initialize directories:', error.message);
    }
  }

  // Enhanced file upload configuration
  getUploadMiddleware() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        await fs.mkdir(this.tempUploadPath, { recursive: true });
        cb(null, this.tempUploadPath);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (this.supportedFormats.includes(ext)) {
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file format: ${ext}. Supported: ${this.supportedFormats.join(', ')}`), false);
      }
    };

    return multer({
      storage: storage,
      fileFilter: fileFilter,
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
        files: 10 // Maximum 10 files per upload
      }
    });
  }

  async loadAllDocuments() {
    try {
      console.log('📚 Loading training documents from:', this.documentsPath);
      
      // Load from file system
      const fsDocuments = await this.loadFromFileSystem();
      
      // Load from database
      const dbDocuments = await this.loadFromDatabase();
      
      // Combine and deduplicate
      this.processedDocuments = [...fsDocuments, ...dbDocuments];
      this.documentChunks = this.processedDocuments.reduce((chunks, doc) => {
        return chunks.concat(doc.chunks.map(chunk => ({
          source: doc.filename,
          content: chunk,
          category: doc.metadata.category,
          documentId: doc.id
        })));
      }, []);

      console.log(`🎉 Loaded ${this.processedDocuments.length} documents with ${this.documentChunks.length} total chunks`);
      return this.processedDocuments;

    } catch (error) {
      console.error('❌ Error loading documents:', error);
      return [];
    }
  }

  async loadFromFileSystem() {
    try {
      const files = await fs.readdir(this.documentsPath);
      const supportedFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return this.supportedFormats.includes(ext);
      });

      console.log(`📄 Found ${supportedFiles.length} training documents in file system`);

      const documents = [];
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
              source: 'filesystem',
              metadata: {
                category: this.categorizeDocument(filename, content),
                tags: this.extractTags(filename, content),
                processed_at: new Date().toISOString(),
                size: content.length,
                wordCount: content.split(/\s+/).length
              }
            };

            documents.push(document);
            console.log(`✅ Processed: ${filename} (${chunks.length} chunks)`);
          }
        } catch (error) {
          console.error(`❌ Failed to process ${filename}:`, error.message);
        }
      }

      return documents;
    } catch (error) {
      console.error('❌ Error loading from file system:', error.message);
      return [];
    }
  }

  async loadFromDatabase() {
    try {
      const query = `
        SELECT 
          td.id,
          td.filename,
          td.file_type,
          td.content,
          td.metadata,
          td.chunk_count,
          td.created_at,
          td.updated_at,
          ARRAY_AGG(dc.content ORDER BY dc.chunk_index) as chunks
        FROM training_documents td
        LEFT JOIN document_chunks dc ON td.id = dc.document_id
        GROUP BY td.id, td.filename, td.file_type, td.content, td.metadata, td.chunk_count, td.created_at, td.updated_at
        ORDER BY td.updated_at DESC
      `;
      
      const result = await this.dbPool.query(query);
      
      console.log(`📄 Found ${result.rows.length} training documents in database`);

      return result.rows.map(row => ({
        id: row.id,
        filename: row.filename,
        content: row.content,
        chunks: row.chunks.filter(chunk => chunk), // Remove null chunks
        source: 'database',
        metadata: row.metadata || {}
      }));

    } catch (error) {
      console.error('❌ Error loading from database:', error.message);
      return [];
    }
  }

  async uploadAndProcessDocuments(files, userId) {
    const processedFiles = [];
    const errors = [];

    for (const file of files) {
      try {
        console.log(`📤 Processing uploaded file: ${file.originalname}`);
        
        // Extract text from file
        const content = await this.extractTextFromFile(file.path, file.originalname);
        
        if (!content || content.trim().length < 50) {
          errors.push(`File ${file.originalname} contains insufficient text content`);
          continue;
        }

        // Generate chunks
        const chunks = this.chunkText(content);
        
        // Store in database
        const documentId = await this.storeInDatabase(
          userId,
          file.originalname,
          file.mimetype,
          content,
          chunks
        );

        // Move to permanent storage
        const permanentPath = path.join(this.documentsPath, file.originalname);
        await fs.rename(file.path, permanentPath);

        const processedDocument = {
          id: documentId,
          filename: file.originalname,
          content,
          chunks,
          metadata: {
            category: this.categorizeDocument(file.originalname, content),
            tags: this.extractTags(file.originalname, content),
            uploaded_at: new Date().toISOString(),
            size: content.length,
            wordCount: content.split(/\s+/).length,
            userId
          }
        };

        processedFiles.push(processedDocument);
        console.log(`✅ Successfully processed: ${file.originalname}`);

      } catch (error) {
        console.error(`❌ Failed to process ${file.originalname}:`, error.message);
        errors.push(`Failed to process ${file.originalname}: ${error.message}`);
        
        // Clean up temp file on error
        try {
          await fs.unlink(file.path);
        } catch (unlinkError) {
          console.warn(`⚠️ Failed to cleanup temp file: ${file.path}`);
        }
      }
    }

    // Reload documents after upload
    await this.loadAllDocuments();

    return {
      successful: processedFiles,
      errors: errors,
      summary: {
        totalProcessed: processedFiles.length,
        totalErrors: errors.length,
        totalChunks: processedFiles.reduce((sum, doc) => sum + doc.chunks.length, 0)
      }
    };
  }

  async storeInDatabase(userId, filename, fileType, content, chunks) {
    try {
      const client = await this.dbPool.connect();
      
      try {
        await client.query('BEGIN');

        // Insert training document
        const docResult = await client.query(
          `INSERT INTO training_documents (user_id, filename, file_type, content, metadata, chunk_count)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            userId,
            filename,
            fileType,
            content,
            JSON.stringify({
              category: this.categorizeDocument(filename, content),
              tags: this.extractTags(filename, content),
              uploaded_at: new Date().toISOString(),
              size: content.length,
              wordCount: content.split(/\s+/).length
            }),
            chunks.length
          ]
        );

        const documentId = docResult.rows[0].id;

        // Insert document chunks
        for (let i = 0; i < chunks.length; i++) {
          await client.query(
            `INSERT INTO document_chunks (document_id, chunk_index, content)
             VALUES ($1, $2, $3)`,
            [documentId, i, chunks[i]]
          );
        }

        await client.query('COMMIT');
        console.log(`✅ Stored document in database: ID ${documentId}`);
        return documentId;

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ Database storage error:', error.message);
      throw new Error(`Failed to store document in database: ${error.message}`);
    }
  }

  async extractTextFromFile(filePath, filename) {
    try {
      const ext = path.extname(filename).toLowerCase();
      
      if (ext === '.txt') {
        return await fs.readFile(filePath, 'utf8');
      } 
      else if (ext === '.docx' || ext === '.doc') {
        const buffer = await fs.readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return result.value;
      }
      else if (ext === '.csv') {
        const csvContent = await fs.readFile(filePath, 'utf8');
        // Convert CSV to readable text format
        return this.convertCsvToText(csvContent, filename);
      }
      else if (ext === '.pdf') {
        console.warn(`⚠️ PDF processing requires additional setup: ${filename}`);
        console.log(`💡 Please convert ${filename} to .txt or .docx format for automatic processing`);
        return null;
      }
      else if (ext === '.pptx' || ext === '.ppt') {
        console.warn(`⚠️ PowerPoint files need manual conversion: ${filename}`);
        console.log(`💡 Please convert ${filename} to .txt format for automatic processing`);
        return null;
      }
      else if (ext === '.xlsx' || ext === '.xls') {
        console.warn(`⚠️ Excel files need manual conversion: ${filename}`);
        console.log(`💡 Please convert ${filename} to .csv format for automatic processing`);
        return null;
      }
      
      return null;
    } catch (error) {
      console.error(`Error extracting text from ${filename}:`, error.message);
      return null;
    }
  }

  convertCsvToText(csvContent, filename) {
    try {
      const lines = csvContent.split('\n');
      const headers = lines[0] ? lines[0].split(',').map(h => h.trim().replace(/"/g, '')) : [];
      
      let textContent = `Document: ${filename}\n\n`;
      textContent += `Data Summary:\n`;
      textContent += `Headers: ${headers.join(', ')}\n`;
      textContent += `Total Records: ${lines.length - 1}\n\n`;
      
      // Convert first 20 rows to readable format
      for (let i = 1; i < Math.min(21, lines.length); i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          textContent += `Record ${i}:\n`;
          headers.forEach((header, index) => {
            if (values[index]) {
              textContent += `  ${header}: ${values[index]}\n`;
            }
          });
          textContent += '\n';
        }
      }
      
      if (lines.length > 21) {
        textContent += `... and ${lines.length - 21} more records\n`;
      }
      
      return textContent;
    } catch (error) {
      console.error('Error converting CSV:', error.message);
      return csvContent; // Return raw content as fallback
    }
  }

  chunkText(text, maxChunkSize = 1000, overlapSize = 100) {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const proposedChunk = currentChunk + (currentChunk ? '. ' : '') + trimmedSentence;

      if (proposedChunk.length <= maxChunkSize) {
        currentChunk = proposedChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        
        if (trimmedSentence.length > maxChunkSize) {
          // Split very long sentences by words
          const words = trimmedSentence.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if ((wordChunk + ' ' + word).length <= maxChunkSize) {
              wordChunk += (wordChunk ? ' ' : '') + word;
            } else {
              if (wordChunk) {
                chunks.push(wordChunk);
              }
              wordChunk = word;
            }
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          } else {
            currentChunk = '';
          }
        } else {
          currentChunk = trimmedSentence;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk + '.');
    }

    // Add overlap between chunks for better context
    const overlappedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      
      // Add overlap from previous chunk
      if (i > 0 && overlapSize > 0) {
        const prevChunk = chunks[i - 1];
        const overlapWords = prevChunk.split(' ').slice(-Math.floor(overlapSize / 6));
        chunk = overlapWords.join(' ') + ' ... ' + chunk;
      }
      
      overlappedChunks.push(chunk);
    }

    return overlappedChunks;
  }

  categorizeDocument(filename, content) {
    try {
      const filenameText = filename.toLowerCase();
      const contentText = content.toLowerCase();
      const combinedText = filenameText + ' ' + contentText;

      const categories = {
        'project_management': ['project', 'management', 'planning', 'execution', 'monitoring', 'control', 'pmbok', 'agile', 'scrum', 'waterfall'],
        'leadership': ['leadership', 'leader', 'manage', 'team', 'vision', 'strategy', 'decision', 'influence', 'motivation'],
        'career_development': ['career', 'development', 'growth', 'skill', 'learning', 'training', 'advancement', 'goal', 'professional'],
        'assessment': ['assessment', 'evaluation', 'review', 'feedback', 'performance', 'score', 'rating', 'measure'],
        'process': ['process', 'procedure', 'workflow', 'methodology', 'framework', 'standard', 'guideline', 'protocol'],
        'communication': ['communication', 'stakeholder', 'meeting', 'presentation', 'report', 'documentation', 'collaboration'],
        'risk_management': ['risk', 'issue', 'problem', 'mitigation', 'contingency', 'threat', 'opportunity', 'uncertainty'],
        'quality': ['quality', 'standard', 'compliance', 'audit', 'inspection', 'verification', 'validation', 'improvement'],
        'resource_management': ['resource', 'budget', 'cost', 'schedule', 'timeline', 'allocation', 'capacity', 'utilization'],
        'best_practices': ['best practice', 'lesson learned', 'recommendation', 'guideline', 'tip', 'advice', 'expert']
      };

      for (const [category, keywords] of Object.entries(categories)) {
        const score = keywords.reduce((count, keyword) => {
          const regex = new RegExp(keyword, 'gi');
          const matches = (combinedText.match(regex) || []).length;
          return count + matches;
        }, 0);

        if (score >= 2) {
          return category;
        }
      }

      return 'general';
    } catch (error) {
      console.warn('Error categorizing document:', error.message);
      return 'general';
    }
  }

  extractTags(filename, content) {
    try {
      const tags = new Set();
      const text = (filename + ' ' + content).toLowerCase();
      
      const keywords = [
        'project management', 'leadership', 'career', 'development',
        'planning', 'execution', 'monitoring', 'control', 'agile', 'scrum',
        'risk', 'stakeholder', 'communication', 'team', 'budget', 'schedule',
        'process', 'procedure', 'best practice', 'methodology', 'framework',
        'value', 'assessment', 'checklist', 'resource', 'quality', 'compliance',
        'strategy', 'vision', 'goal', 'objective', 'milestone', 'deliverable',
        'meeting', 'presentation', 'report', 'documentation', 'collaboration',
        'skill', 'learning', 'training', 'growth', 'performance', 'feedback'
      ];

      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          tags.add(keyword.replace(' ', '_'));
        }
      });

      // Extract numbered lists or bullet points as procedural tags
      if (text.match(/\d+\.\s+/g) || text.match(/[-*]\s+/g)) {
        tags.add('procedural');
        tags.add('checklist');
      }

      // Extract common project management terms
      const pmTerms = text.match(/\b(wbs|gantt|kanban|sprint|epic|user story|burndown|velocity|retrospective)\b/gi);
      if (pmTerms) {
        pmTerms.forEach(term => tags.add(term.toLowerCase()));
      }

      return Array.from(tags);
    } catch (error) {
      console.warn('Error extracting tags:', error.message);
      return ['general'];
    }
  }

  searchDocuments(query, limit = 5) {
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
        return this.documentChunks.slice(0, limit); // Return top chunks if no valid query
      }

      // Enhanced scoring with multiple factors
      const scoredChunks = this.documentChunks.map(chunk => {
        const content = chunk.content.toLowerCase();
        let score = 0;
        let exactMatches = 0;
        let partialMatches = 0;
        
        queryWords.forEach(word => {
          try {
            // Exact word matches (highest score)
            const exactRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            const exactCount = (content.match(exactRegex) || []).length;
            exactMatches += exactCount;
            score += exactCount * 3;

            // Partial matches (lower score)
            const partialRegex = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            const partialCount = (content.match(partialRegex) || []).length;
            partialMatches += partialCount;
            score += partialCount * 1;

            // Category and tag matches (bonus score)
            if (chunk.category && chunk.category.toLowerCase().includes(word)) {
              score += 2;
            }

          } catch (regexError) {
            console.warn(`⚠️ Regex error for word "${word}":`, regexError.message);
            const simpleMatches = content.split(word).length - 1;
            score += simpleMatches;
          }
        });
        
        return { 
          ...chunk, 
          score, 
          exactMatches, 
          partialMatches,
          relevance: exactMatches > 0 ? 'high' : partialMatches > 0 ? 'medium' : 'low'
        };
      });

      // Sort by score and relevance
      const results = scoredChunks
        .filter(chunk => chunk.score > 0)
        .sort((a, b) => {
          // First by exact matches, then by total score
          if (b.exactMatches !== a.exactMatches) {
            return b.exactMatches - a.exactMatches;
          }
          return b.score - a.score;
        })
        .slice(0, limit);
      
      console.log(`✅ Found ${results.length} relevant document chunks`);
      
      return results;
    } catch (error) {
      console.error('❌ Search error:', error.message);
      return [];
    }
  }

  async deleteDocument(documentId, userId = null) {
    try {
      const client = await this.dbPool.connect();
      
      try {
        await client.query('BEGIN');

        // Get document info before deletion
        const docResult = await client.query(
          'SELECT filename, user_id FROM training_documents WHERE id = $1',
          [documentId]
        );

        if (docResult.rows.length === 0) {
          throw new Error('Document not found');
        }

        const document = docResult.rows[0];

        // Check permissions (if userId provided, ensure ownership)
        if (userId && document.user_id !== userId) {
          throw new Error('Unauthorized: You can only delete your own documents');
        }

        // Delete chunks first (due to foreign key constraint)
        await client.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
        
        // Delete document
        await client.query('DELETE FROM training_documents WHERE id = $1', [documentId]);

        await client.query('COMMIT');

        // Try to delete from file system
        try {
          const filePath = path.join(this.documentsPath, document.filename);
          await fs.unlink(filePath);
          console.log(`✅ Deleted file from filesystem: ${document.filename}`);
        } catch (fsError) {
          console.warn(`⚠️ Could not delete file from filesystem: ${document.filename}`);
        }

        // Reload documents
        await this.loadAllDocuments();

        console.log(`✅ Successfully deleted document: ${document.filename}`);
        return { success: true, filename: document.filename };

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('❌ Document deletion error:', error.message);
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  async getDocumentsList(userId = null) {
    try {
      let query = `
        SELECT 
          td.id,
          td.filename,
          td.file_type,
          td.chunk_count,
          td.metadata,
          td.created_at,
          td.updated_at,
          u.name as uploaded_by
        FROM training_documents td
        LEFT JOIN users u ON td.user_id = u.id
      `;
      
      const params = [];
      if (userId) {
        query += ' WHERE td.user_id = $1';
        params.push(userId);
      }
      
      query += ' ORDER BY td.updated_at DESC';

      const result = await this.dbPool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        filename: row.filename,
        fileType: row.file_type,
        chunkCount: row.chunk_count,
        metadata: row.metadata || {},
        uploadedBy: row.uploaded_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

    } catch (error) {
      console.error('❌ Error getting documents list:', error.message);
      return [];
    }
  }

  getStats() {
    try {
      const categories = [...new Set(this.processedDocuments.map(doc => doc.metadata.category))];
      const totalWordCount = this.processedDocuments.reduce((sum, doc) => {
        return sum + (doc.metadata.wordCount || 0);
      }, 0);

      return {
        totalDocuments: this.processedDocuments.length,
        totalChunks: this.documentChunks.length,
        categories: categories,
        avgChunksPerDoc: this.processedDocuments.length > 0 
          ? Math.round(this.documentChunks.length / this.processedDocuments.length * 10) / 10 
          : 0,
        totalWordCount: totalWordCount,
        avgWordsPerDoc: this.processedDocuments.length > 0 
          ? Math.round(totalWordCount / this.processedDocuments.length) 
          : 0,
        supportedFormats: this.supportedFormats
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error.message);
      return {
        totalDocuments: 0,
        totalChunks: 0,
        categories: [],
        avgChunksPerDoc: 0,
        totalWordCount: 0,
        avgWordsPerDoc: 0,
        supportedFormats: this.supportedFormats
      };
    }
  }

  async healthCheck() {
    try {
      // Check database connection
      await this.dbPool.query('SELECT 1');
      
      // Check directories
      await fs.access(this.documentsPath);
      await fs.access(this.tempUploadPath);
      
      return {
        status: 'healthy',
        documentsLoaded: this.processedDocuments.length,
        chunksAvailable: this.documentChunks.length,
        databaseConnected: true,
        directoriesAccessible: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = new ComprehensiveDocumentManager();