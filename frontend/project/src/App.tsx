import React, { useState, useCallback, useMemo, useEffect } from 'react';
import axios from 'axios';
import { Upload, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';

//imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  ArcElement,
  Legend
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Register chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function App() {
  // -------------------------------
  // AUTH STATE
  // -------------------------------
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  // -------------------------------
  // FILE & ANALYSIS STATE
  // -------------------------------
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // New state for fake loading progress
  const [fakeProgress, setFakeProgress] = useState<number>(0);

  // Simulate loading progress while analyzing (slower increments)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setFakeProgress(0);
      // Increase progress by 3 every 200ms until reaching 90%
      interval = setInterval(() => {
        setFakeProgress((prev) => (prev < 90 ? prev + 3 : prev));
      }, 400);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Dynamic loading message based on progress bar
  const loadingMessage = useMemo(() => {
    if (fakeProgress < 20) {
      return "Gappy starting up...";
    } else if (fakeProgress < 40) {
      return "Fetching real-time market trends...";
    } else if (fakeProgress < 60) {
      return "Crunching numbers...";
    } else if (fakeProgress < 80) {
      return "Generating report...";
    } else {
      return "Finalizing gappy...";
    }
  }, [fakeProgress]);

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
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
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
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus(null);
    }
  }, []);

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
      setFile(null);
    } catch (err: any) {
      console.error(err);
      setUploadStatus(err.response?.data?.message || 'Upload error');
    }
  };

  // -------------------------------
  // ANALYZE TRADES WITH FAKE LOADING MODAL
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
      setFakeProgress(100);
      // Increase the delay to 1 second before hiding the modal
      setTimeout(() => {
        setIsAnalyzing(false);
        setFakeProgress(0);
      }, 1000);
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
  // CHART #2: PROFIT DISTRIBUTION BY TICKER 
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
          backgroundColor: hardcodedData.map((item) =>
            item.total_profit < 0 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(34, 197, 94, 0.6)'
          ),
          borderColor: hardcodedData.map((item) =>
            item.total_profit < 0 ? 'rgba(255, 99, 132, 1)' : 'rgba(34, 197, 94, 0.6)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, []);

  // -------------------------------
  // CHART: CLUSTER SUMMARY AS PIE CHARTS
  // -------------------------------
  const clusterDurationPieData = useMemo(() => {
    const clusters = analysisResult?.trade_patterns?.clusters;
    if (!clusters || !clusters.Duration_mean) return null;
    const labels = Object.keys(clusters.Duration_mean);
    const customLabels = labels.map(label =>
      label === "0" ? "Long Term" : label === "1" ? "Short Term" : `Cluster ${label}`
    );
    return {
      labels: customLabels,
      datasets: [
        {
          data: labels.map(label => clusters.Duration_mean[label]),
          backgroundColor: labels.map(label =>
            label === "0" ? 'rgba(75,192,192,0.6)' : 'rgba(54,162,235,0.6)'
          ),
        },
      ],
    };
  }, [analysisResult]);

  const profitCountPieData = useMemo(() => {
    const clusters = analysisResult?.trade_patterns?.clusters;
    if (!clusters || !clusters.Profit_count) return null;
    const labels = Object.keys(clusters.Profit_count);
    const customLabels = labels.map(label =>
      label === "0" ? "Short Term" : label === "1" ? "Long Term" : `Cluster ${label}`
    );
    return {
      labels: customLabels,
      datasets: [
        {
          data: labels.map(label => clusters.Profit_count[label]),
          backgroundColor: labels.map(label =>
            label === "0" ? 'rgba(255, 99, 132, 0.6)' : 'rgba(255, 159, 64, 0.6)'
          ),
        },
      ],
    };
  }, [analysisResult]);

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
              Enter your credentials to access <span className="font-bold">g a p p y</span>.
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

        {/* If logged in, show success banner and main UI */}
        {loggedIn && (
          <>
            {/* Success Banner */}
            <div className="bg-green-100 text-green-700 p-3 rounded mb-4 text-center font-medium">
              You are logged in!
            </div>

            {/* Title */}
            <div className="flex items-center gap-3 mb-8">
              <Upload className="w-8 h-8 text-indigo-600" />
              <h1 className="text-5xl font-bold text-gray-800 logo-font">gappy</h1>
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

            {/* ANALYSIS RESULTS */}
            {analysisError && (
              <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
                {analysisError}
              </div>
            )}

            {analysisResult && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  Analysis Results
                </h2>

                {/* Two Charts on Top */}
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
                          plugins: { legend: { display: true }, title: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    )}
                  </div>

                  {/* Chart 2: Profit Distribution */}
                  <div className="bg-white p-6 rounded-xl shadow-lg">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Profit Distribution
                    </h3>
                    {profitChartData && (
                      <Bar
                        data={profitChartData}
                        options={{
                          responsive: true,
                          plugins: { legend: { display: true }, title: { display: false } },
                          scales: { y: { beginAtZero: true } },
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* AI Advice Section */}
                <div className="bg-white rounded-xl p-6 shadow-lg">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">AI Advice</h3>
                  <p
                    className="text-gray-700 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: (analysisResult.personalized_advice || 'No advice provided').replace(
                        /\*\*(.*?)\*\*/g,
                        '<strong>$1</strong>'
                      ),
                    }}
                  />
                </div>

                {/* Pie Charts Section */}
                {analysisResult.trade_patterns?.clusters && (
                  <div className="mt-4">
                    <h4 className="text-md font-semibold mb-2">Cluster Summary</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded shadow">
                        <h5 className="text-md font-semibold mb-2">
                          Long Term Vs Short Term
                        </h5>
                        {clusterDurationPieData ? (
                          <Pie
                            key={`pie-${JSON.stringify(clusterDurationPieData)}`}
                            data={clusterDurationPieData}
                            options={{
                              responsive: true,
                              plugins: { legend: { display: true }, title: { display: false } },
                            }}
                          />
                        ) : (
                          <p>No cluster data available.</p>
                        )}
                      </div>
                      <div className="bg-white p-4 rounded shadow">
                        <h5 className="text-md font-semibold mb-2">Profit Count</h5>
                        {profitCountPieData ? (
                          <Pie
                            key={`pie-profit-${JSON.stringify(profitCountPieData)}`}
                            data={profitCountPieData}
                            options={{
                              responsive: true,
                              plugins: { legend: { display: true }, title: { display: false } },
                            }}
                          />
                        ) : (
                          <p>No profit count data available.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isAnalyzing && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black opacity-90"></div>
          {/* Modal content */}
          <div className="relative bg-white p-6 rounded w-full sm:w-3/4 md:w-1/2 lg:w-1/3">
            <h3 className="text-lg font-bold mb-4 text-center">
              {loadingMessage}
            </h3>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-100"
                style={{ width: `${fakeProgress}%` }}
              ></div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
