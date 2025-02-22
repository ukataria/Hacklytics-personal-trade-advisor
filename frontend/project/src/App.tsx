import React, { useState, useCallback } from 'react';
import { Upload, FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AnalysisResult {
  category: string;
  finding: string;
  severity: 'info' | 'warning' | 'success';
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);

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
      handleFileSelection(droppedFile);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelection(selectedFile);
    }
  }, []);

  const handleFileSelection = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsAnalyzing(true);
    
    // Simulating file analysis - replace with actual API call
    setTimeout(() => {
      setResults([
        {
          category: 'Revenue Trends',
          finding: 'Identified inconsistent revenue patterns across Q2-Q3. Consider implementing more stable revenue streams.',
          severity: 'warning'
        },
        {
          category: 'Cost Structure',
          finding: 'Operating costs are 15% above industry average. Opportunity to optimize operational efficiency.',
          severity: 'warning'
        },
        {
          category: 'Cash Flow',
          finding: 'Healthy working capital ratio maintained throughout the period.',
          severity: 'success'
        },
        {
          category: 'Growth Potential',
          finding: 'Market expansion opportunities identified in emerging sectors.',
          severity: 'info'
        }
      ]);
      setIsAnalyzing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Upload className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-800">Financial Gap Analysis</h1>
        </div>

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
                Drag and drop your financial data file here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                or
              </p>
              <label className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors">
                Browse Files
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept=".csv,.xlsx,.xls"
                />
              </label>
              <p className="text-xs text-gray-500 mt-4">
                Supported formats: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <p className="text-gray-700">{file.name} uploaded successfully</p>
            </div>
          )}
        </div>

        {isAnalyzing && (
          <div className="bg-white rounded-xl p-6 mb-6 text-center">
            <div className="animate-pulse">
              <p className="text-gray-600">Analyzing your financial data...</p>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Analysis Results</h2>
            {results.map((result, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className={`
                    p-2 rounded-lg
                    ${result.severity === 'warning' ? 'bg-amber-100 text-amber-600' : ''}
                    ${result.severity === 'success' ? 'bg-green-100 text-green-600' : ''}
                    ${result.severity === 'info' ? 'bg-blue-100 text-blue-600' : ''}
                  `}>
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
      </div>
    </div>
  );
}

export default App;