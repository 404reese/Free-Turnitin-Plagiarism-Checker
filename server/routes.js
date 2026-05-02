import { createServer } from "http";
import multer from "multer";
import { checkTextSchema } from "../shared/schema.js";
import {
  calculateSimilarity,
  searchWeb,
  fetchPageContent,
  nGramSimilarity,
} from "./plagiarism.js";
import { extractTextFromFile } from "./fileParser.js";

export function registerRoutes(app) {
  // Setup multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedMimes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];
      
      if (allowedMimes.includes(file.mimetype) || 
          file.originalname.endsWith('.pdf') ||
          file.originalname.endsWith('.docx') ||
          file.originalname.endsWith('.txt')) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOCX, and TXT files are supported'));
      }
    }
  });

  // File upload endpoint
  app.post("/api/plagiarism-check-file", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      console.log("Processing file:", req.file.originalname);

      // Extract text from file
      let text;
      try {
        text = await extractTextFromFile(
          req.file.buffer,
          req.file.mimetype,
          req.file.originalname
        );
      } catch (error) {
        console.error('File extraction error:', error);
        return res.status(400).json({ 
          error: error instanceof Error ? error.message : 'Failed to extract text from file'
        });
      }

      if (!text || text.trim().length < 100) {
        return res.status(400).json({ 
          error: 'Extracted text must be at least 100 characters long'
        });
      }

      console.log("Extracted text length:", text.length);

      const sentences = text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);

      console.log("Split into", sentences.length, "sentences");

      const results = [];
      const limit = Math.min(sentences.length, 20);

      for (let i = 0; i < limit; i++) {
        const sentence = sentences[i];
        console.log("Checking chunk:", sentence.substring(0, 50) + "...");

        const urls = await searchWeb(sentence);
        console.log(`Found ${urls.length} URLs to check`);

        let maxSimilarity = 0;
        const matchedSources = [];

        for (const url of urls) {
          const content = await fetchPageContent(url);
          if (content && content.length > 100) {
            const cosineSim = calculateSimilarity(sentence, content);
            const ngramSim = nGramSimilarity(sentence, content, 5);

            const similarity = Math.max(cosineSim, ngramSim);

            if (similarity > maxSimilarity) {
              maxSimilarity = similarity;
            }

            if (similarity > 0.15) {
              matchedSources.push({
                url,
                similarity: Math.round(similarity * 100),
              });
            }
          }
        }

        matchedSources.sort((a, b) => b.similarity - a.similarity);

        results.push({
          sentence,
          similarity: Math.round(maxSimilarity * 100),
          sources: matchedSources,
          isPlagiarized: maxSimilarity > 0.5,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const totalSimilarity = results.reduce((sum, r) => sum + r.similarity, 0);
      const overallScore = Math.round(totalSimilarity / results.length);
      const plagiarizedCount = results.filter((r) => r.isPlagiarized).length;
      const plagiarismPercentage = Math.round(
        (plagiarizedCount / results.length) * 100
      );

      console.log("Plagiarism check complete. Overall score:", overallScore);

      const checkResult = {
        overallScore,
        plagiarismPercentage,
        totalSentences: results.length,
        plagiarizedSentences: plagiarizedCount,
        results,
      };

      res.json(checkResult);
    } catch (error) {
      console.error("Error in file plagiarism check:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  });
    try {
      const { text } = checkTextSchema.parse(req.body);

      console.log("Starting plagiarism check for text length:", text.length);

      const sentences = text
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);

      console.log("Split into", sentences.length, "sentences");

      const results = [];
      const limit = Math.min(sentences.length, 20);

      for (let i = 0; i < limit; i++) {
        const sentence = sentences[i];
        console.log("Checking chunk:", sentence.substring(0, 50) + "...");

        const urls = await searchWeb(sentence);
        console.log(`Found ${urls.length} URLs to check`);

        let maxSimilarity = 0;
        const matchedSources = [];

        for (const url of urls) {
          const content = await fetchPageContent(url);
          if (content && content.length > 100) {
            const cosineSim = calculateSimilarity(sentence, content);
            const ngramSim = nGramSimilarity(sentence, content, 5);

            const similarity = Math.max(cosineSim, ngramSim);

            console.log(
              `URL ${url}: cosine=${cosineSim.toFixed(2)}, ngram=${ngramSim.toFixed(
                2
              )}, max=${similarity.toFixed(2)}`
            );

            if (similarity > maxSimilarity) {
              maxSimilarity = similarity;
            }

            if (similarity > 0.15) {
              matchedSources.push({
                url,
                similarity: Math.round(similarity * 100),
              });
            }
          }
        }

        matchedSources.sort((a, b) => b.similarity - a.similarity);

        results.push({
          sentence,
          similarity: Math.round(maxSimilarity * 100),
          sources: matchedSources,
          isPlagiarized: maxSimilarity > 0.5,
        });

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const totalSimilarity = results.reduce((sum, r) => sum + r.similarity, 0);
      const overallScore = Math.round(totalSimilarity / results.length);
      const plagiarizedCount = results.filter((r) => r.isPlagiarized).length;
      const plagiarismPercentage = Math.round(
        (plagiarizedCount / results.length) * 100
      );

      console.log("Plagiarism check complete. Overall score:", overallScore);

      const checkResult = {
        overallScore,
        plagiarismPercentage,
        totalSentences: results.length,
        plagiarizedSentences: plagiarizedCount,
        results,
      };

      res.json(checkResult);
    } catch (error) {
      console.error("Error in plagiarism check:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
