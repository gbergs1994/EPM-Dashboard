const express = require('express');
const router = express.Router();
const documentManager = require('../services/ai/comprehensive-documentManager');
const auth = require('../middleware/auth');

// Apply authentication to all routes
router.use(auth);

// Upload middleware
const upload = documentManager.getUploadMiddleware();

/**
 * Upload training documents
 * POST /api/documents/upload
 */
router.post('/upload', upload.array('documents', 10), async (req, res) => {
  try {
    console.log(`📤 Document upload request from user: ${req.user?.name}`);
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided for upload'
      });
    }

    const result = await documentManager.uploadAndProcessDocuments(req.files, req.user.id);
    
    console.log(`✅ Upload completed: ${result.successful.length} successful, ${result.errors.length} errors`);

    res.json({
      success: true,
      message: `Successfully processed ${result.successful.length} documents`,
      data: result
    });

  } catch (error) {
    console.error('❌ Document upload error:', error.message);
    
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(async (file) => {
        try {
          await require('fs').promises.unlink(file.path);
        } catch (cleanupError) {
          console.warn(`⚠️ Failed to cleanup file: ${file.path}`);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload documents',
      details: error.message
    });
  }
});

/**
 * Get list of training documents
 * GET /api/documents/list
 */
router.get('/list', async (req, res) => {
  try {
    const { all } = req.query;
    const userId = all === 'true' ? null : req.user.id;
    
    const documents = await documentManager.getDocumentsList(userId);
    
    res.json({
      success: true,
      data: {
        documents: documents,
        count: documents.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting documents list:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve documents list',
      details: error.message
    });
  }
});

/**
 * Delete a training document
 * DELETE /api/documents/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    if (!documentId || documentId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid document ID'
      });
    }

    const result = await documentManager.deleteDocument(documentId, req.user.id);
    
    res.json({
      success: true,
      message: `Successfully deleted document: ${result.filename}`
    });

  } catch (error) {
    console.error('❌ Document deletion error:', error.message);
    
    if (error.message.includes('Unauthorized')) {
      res.status(403).json({
        success: false,
        error: 'Unauthorized: You can only delete your own documents'
      });
    } else if (error.message.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Document not found'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete document',
        details: error.message
      });
    }
  }
});

/**
 * Search documents
 * POST /api/documents/search
 */
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const results = documentManager.searchDocuments(query.trim(), parseInt(limit));
    
    res.json({
      success: true,
      data: {
        query: query.trim(),
        results: results,
        count: results.length,
        searchedChunks: documentManager.documentChunks.length
      }
    });

  } catch (error) {
    console.error('❌ Document search error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to search documents',
      details: error.message
    });
  }
});

/**
 * Get document statistics
 * GET /api/documents/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = documentManager.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error getting document stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document statistics',
      details: error.message
    });
  }
});

/**
 * Reload all documents from file system and database
 * POST /api/documents/reload
 */
router.post('/reload', async (req, res) => {
  try {
    console.log(`🔄 Document reload requested by: ${req.user?.name}`);
    
    await documentManager.loadAllDocuments();
    const stats = documentManager.getStats();
    
    res.json({
      success: true,
      message: 'Documents reloaded successfully',
      data: stats
    });

  } catch (error) {
    console.error('❌ Document reload error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to reload documents',
      details: error.message
    });
  }
});

/**
 * Health check for document management system
 * GET /api/documents/health
 */
router.get('/health', async (req, res) => {
  try {
    const health = await documentManager.healthCheck();
    
    if (health.status === 'healthy') {
      res.json({
        success: true,
        data: health
      });
    } else {
      res.status(503).json({
        success: false,
        data: health
      });
    }

  } catch (error) {
    console.error('❌ Health check error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

/**
 * Get supported file formats
 * GET /api/documents/formats
 */
router.get('/formats', (req, res) => {
  res.json({
    success: true,
    data: {
      supportedFormats: documentManager.supportedFormats,
      maxFileSize: '50MB',
      maxFiles: 10,
      description: 'Supported document formats for AI training'
    }
  });
});

/**
 * Bulk operations
 * POST /api/documents/bulk-delete
 */
router.post('/bulk-delete', async (req, res) => {
  try {
    const { documentIds } = req.body;
    
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs array is required'
      });
    }

    const results = {
      successful: [],
      errors: []
    };

    for (const documentId of documentIds) {
      try {
        const result = await documentManager.deleteDocument(parseInt(documentId), req.user.id);
        results.successful.push({ id: documentId, filename: result.filename });
      } catch (error) {
        results.errors.push({ id: documentId, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Bulk deletion completed: ${results.successful.length} successful, ${results.errors.length} errors`,
      data: results
    });

  } catch (error) {
    console.error('❌ Bulk delete error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk deletion',
      details: error.message
    });
  }
});

// Error handling middleware for multer upload errors
router.use((error, req, res, next) => {
  if (error instanceof require('multer').MulterError) {
    console.error('📤 Upload error:', error.message);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum file size is 50MB.'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        success: false,
        error: 'Too many files. Maximum 10 files per upload.'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field. Use "documents" field for uploads.'
      });
    }
    
    return res.status(400).json({
      success: false,
      error: 'File upload error',
      details: error.message
    });
  }

  if (error.message.includes('Unsupported file format')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  console.error('❌ Documents API error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

console.log('✅ Enhanced document management routes configured');

module.exports = router;