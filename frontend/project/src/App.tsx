import React, { useState, useCallback, useMemo } from 'react';
import { Upload, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

// ----------------- CHART -----------------
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  // -------------------------------
  // AUTH STATE
  // -------------------------------
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // -------------------------------
  // FILE & ANALYSIS STATE
  // -------------------------------
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // We'll store the full server response in `analysisResult`
  // e.g. { trade_patterns: {...}, personalized_advice: "...", etc. }
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // -------------------------------
  // LOGIN HANDLER
  // -------------------------------
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    try {
      // Using axios, but you can also use fetch if you prefer
      const resp = await axios.post(
        'http://localhost:8000/auth/login',
        { username, password },
        { withCredentials: true } // Important for session cookie
      );

      console.log('Login success:', resp.data);
      setLoggedIn(true);
      setLoginError('');
    } catch (err: any) {
      console.error(err);
      setLoginError(err.response?.data?.message || 'Failed to login');
    }
  };

  // -------------------------------
  // DRAG & DROP
  // -------------------------------
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

  // -------------------------------
  // FILE INPUT
  // -------------------------------
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        setFile(selectedFile);
        setUploadStatus(null);
      }
    },
    []
  );

  // -------------------------------
  // UPLOAD TRADES
  // -------------------------------
  const handleUploadToServer = async () => {
    if (!file) return;

    setUploadStatus(null);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Using axios here
      const resp = await axios.post(
        'http://localhost:8000/upload_trades',
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      console.log('Upload success:', resp.data);
      setUploadStatus('Uploaded successfully');
    } catch (err: any) {
      console.error(err);
      setUploadStatus(err.response?.data?.message || 'Upload error');
    }
  };

  // -------------------------------
  // ANALYZE TRADES
  // -------------------------------
  const handleAnalyzeTrades = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const resp = await axios.post(
        'http://localhost:8000/analyze',
        {},
        { withCredentials: true }
      );

      console.log('Analyze results:', resp.data);
      setAnalysisResult(resp.data);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err.response?.data || 'Analyze error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // -------------------------------
  // CHART DATA (Profit by Trade)
  // -------------------------------
  const chartData = useMemo(() => {
    if (!analysisResult?.trade_patterns?.trade_data) return null;

    const trades = analysisResult.trade_patterns.trade_data;
    return {
      labels: trades.map((t: any) => `Trade ${t.TradeID}`),
      datasets: [
        {
          label: 'Profit',
          data: trades.map((t: any) => t.Profit || 0),
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)'
        }
      ]
    };
  }, [analysisResult]);

  // -------------------------------
  // RENDER
  // -------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* =======================================
            LOGIN FORM (only if not logged in)
        ======================================= */}
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

        {/* If logged in, show success banner */}
        {loggedIn && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            You are logged in!
          </div>
        )}

        {/* Only show the file upload + analysis UI if user is logged in */}
        {loggedIn && (
          <>
            {/* Title */}
            <div className="flex items-center gap-3 mb-8">
              <Upload className="w-8 h-8 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-800">
                Financial Gap Analysis
              </h1>
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
                  <p className="text-gray-700">
                    {file.name} uploaded (not yet sent)
                  </p>
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

            {/* Analyze error */}
            {analysisError && (
              <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
                {analysisError}
              </div>
            )}

            {/* Analyzing Spinner */}
            {isAnalyzing && (
              <div className="bg-white rounded-xl p-6 mb-6 text-center">
                <div className="animate-pulse">
                  <p className="text-gray-600">Analyzing your trades...</p>
                </div>
              </div>
            )}

            {/* ========================
                ANALYSIS RESULTS
            ======================== */}
            {analysisResult && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Analysis Results
                </h2>

                {/* Pattern Analysis */}
                <div className="bg-white rounded-xl p-4 shadow">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">
                    Pattern Analysis
                  </h3>

                  {/* 1) Show table of trade_data */}
                  {analysisResult.trade_patterns?.trade_data && (
                    <div className="mb-4">
                      <h4 className="text-md font-semibold mb-2">Trade Details</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full border text-sm">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-2 py-1 border">Trade ID</th>
                              <th className="px-2 py-1 border">Actions</th>
                              <th className="px-2 py-1 border">Buy Date</th>
                              <th className="px-2 py-1 border">Sell Date</th>
                              <th className="px-2 py-1 border">Duration</th>
                              <th className="px-2 py-1 border">Profit</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analysisResult.trade_patterns.trade_data.map(
                              (trade: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="px-2 py-1 border">{trade.TradeID}</td>
                                  <td className="px-2 py-1 border">{trade.Actions}</td>
                                  <td className="px-2 py-1 border">
                                    {String(trade.BuyDate)}
                                  </td>
                                  <td className="px-2 py-1 border">
                                    {String(trade.SellDate)}
                                  </td>
                                  <td className="px-2 py-1 border">{trade.Duration}</td>
                                  <td className="px-2 py-1 border">
                                    {trade.Profit?.toFixed?.(2) ?? trade.Profit}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 2) Show cluster info, if any */}
                  {analysisResult.trade_patterns?.clusters && (
                    <div className="mb-2">
                      <h4 className="text-md font-semibold mb-2">
                        Cluster Summary
                      </h4>
                      <pre className="text-xs bg-gray-50 p-2 rounded border text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(analysisResult.trade_patterns.clusters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* AI Advice */}
                <div className="bg-white rounded-xl p-4 shadow">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">AI Advice</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {analysisResult.personalized_advice || 'No advice provided'}
                  </p>
                </div>

                {/* Chart: Profit by Trade */}
                {chartData && (
                  <div className="bg-white p-4 rounded shadow">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">
                      Profit by Trade
                    </h3>
                    <Line
                      data={chartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: true }
                        },
                        scales: {
                          y: { beginAtZero: true }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
