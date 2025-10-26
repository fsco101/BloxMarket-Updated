import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS middleware specifically for image serving
router.use((req, res, next) => {
  // Set CORS headers for image requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Serve avatar images
router.get('/avatars/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(__dirname, '../uploads/avatars', sanitizedFilename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Avatar not found' });
    }
    
    const stats = fs.statSync(filepath);
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('ETag', `"${stats.mtime.getTime()}"`);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if (ifNoneMatch === `"${stats.mtime.getTime()}"` || 
        (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)) {
      return res.status(304).end();
    }
    
    const readStream = fs.createReadStream(filepath);
    
    readStream.on('error', (err) => {
      console.error('Error reading avatar file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read avatar file' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving avatar:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Serve forum images
router.get('/forum/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(__dirname, '../uploads/forum', sanitizedFilename);
    
    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Get file stats for size
    const stats = fs.statSync(filepath);
    
    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'image/jpeg'; // default
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    // Set headers for proper image serving
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    res.setHeader('ETag', `"${stats.mtime.getTime()}"`);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    // Handle conditional requests
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if (ifNoneMatch === `"${stats.mtime.getTime()}"` || 
        (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)) {
      return res.status(304).end();
    }
    
    // Create read stream and pipe to response
    const readStream = fs.createReadStream(filepath);
    
    readStream.on('error', (err) => {
      console.error('Error reading image file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read image file' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving forum image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Serve trading hub images
router.get('/trades/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const sanitizedFilename = path.basename(filename);
    const filepath = path.join(__dirname, '../uploads/trades', sanitizedFilename);
    
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const stats = fs.statSync(filepath);
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.setHeader('ETag', `"${stats.mtime.getTime()}"`);
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
    
    const ifNoneMatch = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if (ifNoneMatch === `"${stats.mtime.getTime()}"` || 
        (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)) {
      return res.status(304).end();
    }
    
    const readStream = fs.createReadStream(filepath);
    
    readStream.on('error', (err) => {
      console.error('Error reading image file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read image file' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving trades image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Serve event images
router.get('/event/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const sanitizedFilename = path.basename(filename);
    
    // Try multiple possible paths
    const possiblePaths = [
      path.join(__dirname, '../uploads/event', sanitizedFilename),
      path.join(process.cwd(), 'uploads', 'event', sanitizedFilename),
      path.join(__dirname, '../../uploads/event', sanitizedFilename)
    ];
    
    let filepath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        filepath = testPath;
        break;
      }
    }
    
    if (!filepath) {
      console.error('Event image not found in any path:', sanitizedFilename);
      console.error('Tried paths:', possiblePaths);
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const stats = fs.statSync(filepath);
    const ext = path.extname(sanitizedFilename).toLowerCase();
    let contentType = 'image/jpeg';
    
    switch (ext) {
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      default:
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('ETag', `"${stats.mtime.getTime()}-${stats.size}"`);
    
    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    const ifModifiedSince = req.headers['if-modified-since'];
    
    if ((clientETag && clientETag === `"${stats.mtime.getTime()}-${stats.size}"`) ||
        (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime)) {
      return res.status(304).end();
    }
    
    const readStream = fs.createReadStream(filepath);
    
    readStream.on('error', (err) => {
      console.error('Error reading event image file:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to read image file' });
      }
    });
    
    readStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving event image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;