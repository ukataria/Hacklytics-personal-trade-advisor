import React, { useState, useCallback } from 'react';
import { Upload, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalysisResult {
  category: string;
  finding: string;
  severity: 'info' | 'warning' | 'success';
}

function App() {
  // ============================
  // AUTH STATE
  // ============================
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // ============================
  // FILE/ANALYSIS STATE
  // ============================
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [results, setResults] = useState<AnalysisResult[]>([]);

  // ============================
  // LOGIN HANDLER
  // ============================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      const resp = await fetch('http://localhost:8000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Important: let browser store the session cookie
        body: JSON.stringify({ username, password })
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Login failed: ${text}`);
      }

      // parse the JSON
      const data = await resp.json();
      console.log('Login success:', data);
      setLoggedIn(true);
      setLoginError('');
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || 'Failed to login');
    }
  };

  // ============================
  // DRAG & DROP
  // ============================
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setUploadStatus(null);
    }
  }, []);

  // ============================
  // FILE INPUT
  // ============================
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus(null);
    }
  }, []);

  // ============================
  // UPLOAD TRADES
  // ============================
  const handleUploadToServer = async () => {
    if (!file) return;

    setUploadStatus(null);
    setAnalysisError(null);
    setResults([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const resp = await fetch('http://localhost:8000/upload_trades', {
        method: 'POST',
        credentials: 'include', // to include session cookie
        body: formData
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Upload failed: ${text}`);
      }

      const data = await resp.json();
      console.log('Upload success:', data);
      setUploadStatus('Uploaded successfully');
    } catch (err: any) {
      console.error(err);
      setUploadStatus(err.message || 'Upload error');
    }
  };

  // ============================
  // ANALYZE TRADES
  // ============================
  const handleAnalyzeTrades = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setResults([]);

    try {
      const resp = await fetch('http://localhost:8000/analyze', {
        method: 'POST',
        credentials: 'include' // must include session cookie
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Analyze failed: ${text}`);
      }

      const data = await resp.json();
      console.log('Analyze results:', data);

      // The shape of your final recommendation can vary; 
      // for demonstration, let's assume it might have a 'trade_patterns' or 'personalized_advice'.
      // Convert that data into your AnalysisResult[] shape as needed:
      // e.g. you might parse data to something like:
      // setResults([
      //   { category: 'Trade Patterns', finding: JSON.stringify(data.trade_patterns), severity: 'info' },
      //   { category: 'Advice', finding: data.personalized_advice, severity: 'success' }
      // ]);

      // For now, let's just do a quick example:
      setResults([
        {
          category: 'Pattern Analysis',
          finding: JSON.stringify(data.trade_patterns),
          severity: 'info'
        },
        {
          category: 'AI Advice',
          finding: data.personalized_advice,
          severity: 'success'
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.message || 'Analyze error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* ================================
            LOGIN FORM
        ================================ */}
        {!loggedIn && (
          <div className="bg-white p-4 mb-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">Login Required</h2>
            <form onSubmit={handleLogin} className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 rounded px-2 py-1 w-full"
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-600 text-sm">{loginError}</div>
              )}
              <button
                type="submit"
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Login
              </button>
            </form>
          </div>
        )}

        {loggedIn && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            You are logged in!
          </div>
        )}

        {/* Only show the file upload + analysis UI if user is logged in */}
        {loggedIn && (
          <>
            <div className="flex items-center gap-3 mb-8">
              <Upload className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">Financial Gap Analysis</h1>
            </div>

            {/* Drag-and-Drop Area */}
            <div
              className={`
                border-2 border-dashed rounded-xl p-8 mb-8 text-center transition-colors
                ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'}
                ${!file ? 'cursor-pointer' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {!file ? (
                <div>
                  <FileUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 mb-2">
                    Drag and drop your CSV trades file here
                  </p>
                  <p className="text-sm text-gray-500 mb-4">or</p>
                  <label className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                    Browse Files
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileInput}
                      accept=".csv"
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-4">
                    Supported format: CSV
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <p className="text-gray-700">{file.name} uploaded (not yet sent)</p>
                  <button
                    onClick={handleUploadToServer}
                    className="mt-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Upload to Server
                  </button>
                </div>
              )}
            </div>

            {/* Upload Status */}
            {uploadStatus && (
              <div className="mb-4">
                {uploadStatus.includes('error') || uploadStatus.includes('fail') ? (
                  <div className="bg-red-100 text-red-600 p-3 rounded">
                    {uploadStatus}
                  </div>
                ) : (
                  <div className="bg-green-100 text-green-600 p-3 rounded">
                    {uploadStatus}
                  </div>
                )}
              </div>
            )}

            {/* Analyze Button */}
            <button
              onClick={handleAnalyzeTrades}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4"
            >
              Analyze Trades
            </button>

            {/* Show analyze error if any */}
            {analysisError && (
              <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
                {analysisError}
              </div>
            )}

            {/* Show analyzing spinner */}
            {isAnalyzing && (
              <div className="bg-white rounded-xl p-6 mb-6 text-center">
                <div className="animate-pulse">
                  <p className="text-gray-600">Analyzing your trades...</p>
                </div>
              </div>
            )}

            {/* Analysis Results */}
            {results.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-6">
                  Analysis Results
                </h2>
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`
                          p-2 rounded-lg
                          ${result.severity === 'warning' ? 'bg-amber-100 text-amber-600' : ''}
                          ${result.severity === 'success' ? 'bg-green-100 text-green-600' : ''}
                          ${result.severity === 'info' ? 'bg-blue-100 text-blue-600' : ''}
                        `}
                      >
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium text-gray-800 mb-1">
                          {result.category}
                        </h3>
                        <p className="text-gray-600">
                          {result.finding}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
