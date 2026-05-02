import pdfParse from 'pdf-parse';
import { Readable } from 'stream';

export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

export async function extractTextFromDocx(buffer) {
  try {
    // For DOCX, we'll use a simple XML parser approach
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const zipData = await zip.loadAsync(buffer);
    
    const documentXml = zipData.file('word/document.xml');
    if (!documentXml) {
      throw new Error('Invalid DOCX file structure');
    }
    
    const xmlContent = await documentXml.async('string');
    
    // Extract text from XML by removing tags
    const text = xmlContent
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

export async function extractTextFromTXT(buffer) {
  try {
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error parsing TXT:', error);
    throw new Error('Failed to parse TXT file');
  }
}

export async function extractTextFromFile(buffer, mimeType, fileName) {
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPDF(buffer);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDocx(buffer);
  } else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTextFromTXT(buffer);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
