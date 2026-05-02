import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSearch, AlertCircle, Download, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { checkTextSchema } from "../../../shared/schema";
import { generatePlagiarismPDF } from "@/lib/pdfGenerator";

const Index = () => {
  const [text, setText] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [inputMode, setInputMode] = useState("text"); // "text" or "file"
  const [selectedFile, setSelectedFile] = useState(null);
  const {
    toast
  } = useToast();
  const handleCheck = async () => {
    if (inputMode === "text") {
      if (!text.trim()) {
        toast({
          title: "Error",
          description: "Please enter some text to check",
          variant: "destructive"
        });
        return;
      }

      // Validate using Zod schema
      const validation = checkTextSchema.safeParse({ text });
      if (!validation.success) {
        const errorMessage = validation.error.errors[0]?.message || "Validation failed";
        toast({
          title: "Validation Error",
          description: errorMessage,
          variant: "destructive"
        });
        return;
      }

      setIsChecking(true);
      setResult(null);
      try {
        const response = await fetch('/api/plagiarism-check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text
          })
        });
        if (!response.ok) {
          throw new Error('Failed to check plagiarism');
        }
        const data = await response.json();
        setResult(data);
        toast({
          title: "Check Complete",
          description: `Plagiarism score: ${data.plagiarismPercentage}%`
        });
      } catch (error) {
        console.error('Error checking plagiarism:', error);
        toast({
          title: "Error",
          description: "Failed to check plagiarism. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsChecking(false);
      }
    } else {
      // File upload mode
      if (!selectedFile) {
        toast({
          title: "Error",
          description: "Please select a file to check",
          variant: "destructive"
        });
        return;
      }

      setIsChecking(true);
      setResult(null);
      
      const formData = new FormData();
      formData.append('file', selectedFile);

      try {
        const response = await fetch('/api/plagiarism-check-file', {
          method: 'POST',
          body: formData
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check plagiarism');
        }
        const data = await response.json();
        setResult(data);
        toast({
          title: "Check Complete",
          description: `Plagiarism score: ${data.plagiarismPercentage}%`
        });
      } catch (error) {
        console.error('Error checking plagiarism:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to check plagiarism. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsChecking(false);
      }
    }
  };
  const getScoreColor = score => {
    if (score < 20) return "text-green-600 dark:text-green-400";
    if (score < 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };
  
  const handleDownloadPDF = async () => {
    try {
      await generatePlagiarismPDF(result, text);
      toast({
        title: "Success",
        description: "Plagiarism report downloaded successfully"
      });
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to download PDF report",
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <FileSearch className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Academic Plagiarism Checker
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Free plagiarism detection using advanced web scraping and text similarity algorithms
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="shadow-xl border-2" data-testid="card-input">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enter Your Text</CardTitle>
                  <CardDescription>
                    {inputMode === "text" ? "Paste your text below to check for plagiarism" : "Upload a document to check for plagiarism"}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={inputMode === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setInputMode("text");
                      setSelectedFile(null);
                    }}
                  >
                    Text
                  </Button>
                  <Button
                    variant={inputMode === "file" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setInputMode("file");
                      setText("");
                    }}
                  >
                    File
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputMode === "text" ? (
                <>
                  <Textarea data-testid="input-text" placeholder="Paste your text here (minimum 100 characters)..." value={text} onChange={e => setText(e.target.value)} className="min-h-[200px] text-base" />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm text-muted-foreground" data-testid="text-character-count">
                      {text.length} characters
                    </p>
                    <Button data-testid="button-check-plagiarism" onClick={handleCheck} disabled={isChecking || text.length < 100} size="lg">
                      {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isChecking ? "Checking..." : "Check Plagiarism"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer block">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">
                        {selectedFile ? selectedFile.name : "Click to select a file"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        PDF, DOCX, or TXT (max 10MB)
                      </p>
                    </label>
                  </div>
                  <Button data-testid="button-check-plagiarism" onClick={handleCheck} disabled={isChecking || !selectedFile} size="lg" className="w-full">
                    {isChecking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isChecking ? "Checking..." : "Check Plagiarism"}
                  </Button>
                </>
              )}

              {isChecking && <Alert data-testid="alert-checking">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This may take 30-60 seconds as we search the web and compare your text...
                  </AlertDescription>
                </Alert>}
            </CardContent>
          </Card>

          {result && <div className="mt-8 space-y-6">
              <Card className="shadow-xl border-2" data-testid="card-report">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Plagiarism Report</CardTitle>
                  <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download PDF
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">Overall Plagiarism</p>
                      <p className={`text-5xl font-bold ${getScoreColor(result.plagiarismPercentage)}`} data-testid="text-plagiarism-percentage">
                        {result.plagiarismPercentage}%
                      </p>
                    </div>
                    <div className="text-center p-6 bg-secondary rounded-md">
                      <p className="text-sm text-muted-foreground mb-2">Similarity Score</p>
                      <p className={`text-5xl font-bold ${getScoreColor(result.overallScore)}`} data-testid="text-overall-score">
                        {result.overallScore}%
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sentences Analyzed</span>
                      <span className="font-semibold" data-testid="text-total-sentences">{result.totalSentences}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Plagiarized Sentences</span>
                      <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-plagiarized-sentences">{result.plagiarizedSentences}</span>
                    </div>
                    <Progress value={result.plagiarizedSentences / result.totalSentences * 100} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-xl border-2" data-testid="card-details">
                <CardHeader>
                  <CardTitle>Detailed Results</CardTitle>
                  <CardDescription>Sentence-by-sentence analysis with sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.results.map((item, index) => <div key={index} data-testid={`result-sentence-${index}`} className={`p-4 rounded-md border-2 ${item.isPlagiarized ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900" : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"}`}>
                        <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
                          <p className="text-sm font-medium flex-1" data-testid={`text-sentence-${index}`}>{item.sentence}</p>
                          <span data-testid={`badge-similarity-${index}`} className={`px-3 py-1 rounded-full text-sm font-bold ${item.isPlagiarized ? "bg-red-600 text-white" : "bg-green-600 text-white"}`}>
                            {item.similarity}%
                          </span>
                        </div>
                        {item.sources.length > 0 && <div className="mt-2 pt-2 border-t border-current/20">
                            <p className="text-xs font-semibold mb-1">Potential Sources:</p>
                            <div className="space-y-1">
                              {item.sources.map((source, idx) => <div key={idx} className="flex items-start gap-2">
                                  <a href={source.url} target="_blank" rel="noopener noreferrer" data-testid={`link-source-${index}-${idx}`} className={`flex-1 text-xs hover:underline truncate ${source.similarity >= 50 ? "text-red-600 dark:text-red-400 font-semibold" : "text-orange-600 dark:text-orange-400"}`}>
                                    {source.url}
                                  </a>
                                  <span className={`text-xs font-bold ${source.similarity >= 50 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"}`} data-testid={`text-source-similarity-${index}-${idx}`}>
                                    {source.similarity}%
                                  </span>
                                </div>)}
                            </div>
                          </div>}
                      </div>)}
                  </div>
                </CardContent>
              </Card>
            </div>}
        </div>
      </div>
    </div>;
};
export default Index;