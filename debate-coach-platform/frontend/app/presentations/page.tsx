'use client';

import { useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

interface Presentation {
  id: number;
  user_id: number;
  title: string;
  file_name: string;
  file_path: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type AnalysisScores = { clarity_score: number; confidence_score: number; engagement_score: number };

export default function PresentationsPage() {
  const router = useRouter();
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    file_name: '',
  });
  const [analysisScores, setAnalysisScores] = useState<Record<number, AnalysisScores>>({});
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  const fetchPresentations = useCallback(async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${BACKEND_URL}/presentations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch presentations');
      }

      const data = await response.json();
      setPresentations(data);
      setError(null);
    } catch (err) {
      setError('Failed to load presentations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const loadPresentations = window.setTimeout(() => { void fetchPresentations(); }, 0);
    return () => window.clearTimeout(loadPresentations);
  }, [fetchPresentations]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    
    if (!uploadData.title || !uploadData.file_name) {
      setError('Please enter a title and choose a PDF or PPTX file');
      return;
    }

    if (!/\.(pdf|pptx)$/i.test(uploadData.file_name)) {
      setError('Only PDF and PPTX presentation files are supported');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BACKEND_URL}/presentations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: uploadData.title,
          file_name: uploadData.file_name,
          file_path: `/presentations/${uploadData.file_name}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to upload presentation');
      }

      setUploadData({ title: '', file_name: '' });
      setShowUploadForm(false);
      fetchPresentations();
    } catch (err) {
      setError('Failed to upload presentation');
      console.error(err);
    }
  }

  async function deletePresentation(id: number) {
    if (!confirm('Are you sure you want to delete this presentation?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BACKEND_URL}/presentations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete presentation');
      }

      fetchPresentations();
    } catch (err) {
      setError('Failed to delete presentation');
      console.error(err);
    }
  }

  async function analyzePresentation(presentation: Presentation) {
    const scores = analysisScores[presentation.id] ?? { clarity_score: 75, confidence_score: 75, engagement_score: 75 };
    setAnalyzingId(presentation.id);
    setError(null);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${BACKEND_URL}/presentations/${presentation.id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(scores),
      });
      if (!response.ok) throw new Error('Failed to analyze presentation');
      await fetchPresentations();
    } catch (err) {
      setError('Failed to analyze presentation');
      console.error(err);
    } finally {
      setAnalyzingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-600">Loading presentations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Presentations</h1>
            <p className="text-slate-600 mt-2">Upload and analyze your presentations</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-6 py-3 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition"
          >
            {showUploadForm ? 'Cancel' : 'Upload Presentation'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Upload Form */}
        {showUploadForm && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Upload New Presentation</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Presentation Title
                </label>
                <input
                  type="text"
                  value={uploadData.title}
                  onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
                  placeholder="e.g., Climate Change Policy Debate"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="presentation-file" className="block text-sm font-semibold text-slate-700 mb-2">
                  Presentation file
                </label>
                <input
                  id="presentation-file"
                  type="file"
                  accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  onChange={(e) => setUploadData({ ...uploadData, file_name: e.target.files?.[0]?.name ?? '' })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 file:mr-4 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700"
                  required
                />
                <p className="mt-2 text-xs text-slate-500">Supported formats: PDF and PPTX</p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition"
              >
                Upload
              </button>
            </form>
          </div>
        )}

        {/* Presentations List */}
        {presentations.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <svg
              className="w-16 h-16 mx-auto text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-slate-600 text-lg">No presentations yet</p>
            <p className="text-slate-500 text-sm mt-2">Upload your first presentation to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {presentations.map((presentation) => (
              <div key={presentation.id} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900">{presentation.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{presentation.file_name}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        presentation.status === 'ANALYZED' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {presentation.status}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(presentation.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/presentations/${presentation.id}`}
                      className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => void analyzePresentation(presentation)}
                      disabled={analyzingId === presentation.id}
                      className="px-4 py-2 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition disabled:opacity-60"
                    >
                      {analyzingId === presentation.id ? 'Analyzing...' : presentation.status === 'ANALYZED' ? 'Update analysis' : 'Analyze'}
                    </button>
                    <button
                      onClick={() => deletePresentation(presentation.id)}
                      className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
                  {(['clarity_score', 'confidence_score', 'engagement_score'] as const).map((scoreName) => (
                    <label key={scoreName} className="text-sm text-slate-600">
                      <span className="mb-1 block capitalize">{scoreName.replace('_score', '')}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={analysisScores[presentation.id]?.[scoreName] ?? 75}
                        onChange={(event) => setAnalysisScores((items) => ({ ...items, [presentation.id]: { ...(items[presentation.id] ?? { clarity_score: 75, confidence_score: 75, engagement_score: 75 }), [scoreName]: Number(event.target.value) } }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-6 py-2 bg-slate-500 text-white font-semibold rounded-lg hover:bg-slate-600 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
