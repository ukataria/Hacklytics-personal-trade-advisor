import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Upload, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';

// CHART IMPORTS
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line, Bar } from 'react-chartjs-2';

// Register chart.js components and plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  annotationPlugin
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
  const [showMore, setShowMore] = useState(false);

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
      const resp = await axios.post(
        'http://localhost:8000/auth/login',
        { username, password },
        { withCredentials: true }
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

      const resp = await axios.post(
        'http://localhost:8000/upload_trades',
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      console.log('Upload success:', resp.data);
      setUploadStatus('Uploaded successfully!');
      // Clear the file from state so it doesn't keep prompting the user
      setFile(null);
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
  // CHART #1: DURATION BY TRADE
  // -------------------------------
  const durationChartData = useMemo(() => {
    const trades = analysisResult?.trade_patterns?.trade_data;
    if (!trades) return null;

    return {
      labels: trades.map((t: any) => `Trade ${t.TradeID}`),
      datasets: [
        {
          label: 'Duration (days)',
          data: trades.map((t: any) => t.Duration || 0),
          borderColor: 'rgba(75,192,192,1)',
          backgroundColor: 'rgba(75,192,192,0.2)',
          tension: 0.2,
        },
      ],
    };
  }, [analysisResult]);

  // -------------------------------
  // CHART #2: PROFIT DISTRIBUTION BY TICKER (HARDCODED)
  // -------------------------------
  const profitChartData = useMemo(() => {
    const hardcodedData = [
      { ticker: 'AAPL', total_profit: 150.75 },
      { ticker: 'TSLA', total_profit: 420.0 },
      { ticker: 'AMZN', total_profit: -85.5 },
      { ticker: 'MSFT', total_profit: 90.25 },
      { ticker: 'NIO', total_profit: 50.0 },
    ];

    return {
      labels: hardcodedData.map((item) => item.ticker),
      datasets: [
        {
          label: 'Profit',
          data: hardcodedData.map((item) => item.total_profit),
          // Green for positive, Red for negative
          backgroundColor: hardcodedData.map((item) =>
            item.total_profit < 0 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(34,197,94,0.6)'
          ),
          borderColor: hardcodedData.map((item) =>
            item.total_profit < 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(34,197,94,1)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, []);

  // -------------------------------
  // OPTIONS FOR PROFIT CHART WITH A BLACK LINE AT y=0
  // -------------------------------
  const profitChartOptions = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: false },
      annotation: {
        annotations: {
          zeroLine: {
            type: 'line',
            yMin: 0,
            yMax: 0,
            borderColor: 'black',
            borderWidth: 2,
          },
        },
      },
    },
    scales: {
      y: { beginAtZero: true },
    },
  }), []);

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
          <div className="bg-white p-6 mb-6 rounded shadow-sm max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Log In</h2>
            <p className="text-gray-500 mb-6">
              Enter your credentials to access Financial Gap Analysis.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-indigo-200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring focus:ring-indigo-200"
                  required
                />
              </div>
              {loginError && (
                <div className="text-red-600 text-sm">{loginError}</div>
              )}
              <button
                type="submit"
                className="bg-indigo-600 text-white px-5 py-2 rounded hover:bg-indigo-700 transition-colors w-full font-semibold"
              >
                Log In
              </button>
            </form>
          </div>
        )}

        {/* If logged in, show success banner */}
        {loggedIn && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-center font-medium">
            You are logged in!
          </div>
        )}

        {/* Only show the file upload + analysis UI if user is logged in */}
        {loggedIn && (
          <>
            {/* Title */}
            <div className="flex items-center gap-3 mb-8">
              <Upload className="w-8 h-8 text-indigo-600" />
              <h1 className="text-5xl font-bold text-gray-800 logo-font">
                gappy
              </h1>
            </div>

            {/* Drag-and-Drop Area */}
            <div
              className={`
                border-2 border-dashed rounded-xl p-8 mb-8 text-center transition-colors
                ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'}
                ${!file ? 'cursor-default' : ''}
              `}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {uploadStatus === 'Uploaded successfully!' ? (
                <div className="flex flex-col items-center justify-center gap-2">
                  <CheckCircle2 className="w-10 h-10 text-green-500" />
                  <p className="text-gray-700 font-semibold">
                    Your file is uploaded and ready for analysis.
                  </p>
                </div>
              ) : (
                !file ? (
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
                )
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
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mb-4 font-semibold"
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
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Analysis Results
                </h2>

                {/* Pattern Analysis */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    Pattern Analysis
                  </h3>

                  {/* 1) Show table of trade_data with "Show More" logic */}
                  {analysisResult.trade_patterns?.trade_data && (
                    <div className="overflow-x-auto">
                      <div
                        className="overflow-y-auto scrollbar-thin scrollbar-thumb-indigo-500 scrollbar-track-gray-100 transition-all duration-500"
                        style={{
                          maxHeight: showMore ? '600px' : '300px'
                        }}
                      >
                        <table className="min-w-full bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <thead className="sticky top-0 bg-indigo-600 text-white text-sm leading-normal shadow-md">
                            <tr>
                              <th className="py-3 px-4 text-left">Trade ID</th>
                              <th className="py-3 px-4 text-left">Actions</th>
                              <th className="py-3 px-4 text-left">Buy Date</th>
                              <th className="py-3 px-4 text-left">Sell Date</th>
                              <th className="py-3 px-4 text-center">Duration (Days)</th>
                            </tr>
                          </thead>
                          <tbody className="text-gray-700 text-sm font-light">
                            {analysisResult.trade_patterns.trade_data
                              .slice(
                                0,
                                showMore
                                  ? analysisResult.trade_patterns.trade_data.length
                                  : 5
                              )
                              .map((trade: any, idx: number) => (
                                <tr
                                  key={idx}
                                  className={`border-b border-gray-200 hover:bg-indigo-50 transition-colors ${
                                    idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                                  }`}
                                >
                                  <td className="py-3 px-4">{trade.TradeID}</td>
                                  <td className="py-3 px-4">{trade.Actions}</td>
                                  <td className="py-3 px-4">{String(trade.BuyDate)}</td>
                                  <td className="py-3 px-4">{String(trade.SellDate)}</td>
                                  <td className="py-3 px-4 text-center">
                                    {trade.Duration ?? '--'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Show More Button */}
                      <div className="mt-4 text-center">
                        <button
                          onClick={() => setShowMore(!showMore)}
                          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition-colors"
                        >
                          {showMore ? 'Show Less' : 'Show More'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 2) Show cluster info, if any */}
                  {analysisResult.trade_patterns?.clusters && (
                    <div className="mt-4">
                      <h4 className="text-md font-semibold mb-2">Cluster Summary</h4>
                      <pre className="text-xs bg-gray-50 p-4 rounded border text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(analysisResult.trade_patterns.clusters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* AI Advice */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">AI Advice</h3>
                  <p
                    className="text-gray-700 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: (analysisResult.personalized_advice || 'No advice provided').replace(
                        /\*\*(.*?)\*\*/g,
                        '<strong>$1</strong>'
                      )
                    }}
                  />
                </div>

                {/* TWO CHARTS SIDE-BY-SIDE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chart 1: Duration by Trade */}
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Duration by Trade
                    </h3>
                    {durationChartData && (
                      <Line
                        data={durationChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { display: true },
                            title: { display: false }
                          },
                          scales: {
                            y: { beginAtZero: true }
                          }
                        }}
                      />
                    )}
                  </div>

                  {/* Chart 2: Hardcoded Profit Distribution with black line at y=0 */}
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Profit Distribution
                    </h3>
                    {profitChartData && (
                      <Bar
                        data={profitChartData}
                        options={profitChartOptions}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;
