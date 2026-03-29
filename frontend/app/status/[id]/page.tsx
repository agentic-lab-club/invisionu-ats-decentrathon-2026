import { notFound } from 'next/navigation';

async function getCandidate(id: string) {
  const res = await fetch(`http://localhost:8080/api/candidates/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function StatusPage({ params }: { params: { id: string } }) {
  const candidate = await getCandidate(params.id);
  if (!candidate) notFound();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Application status</h1>
        <p className="text-gray-500 mb-6">ID: {params.id}</p>

        <div className="space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Name</span>
            <span className="font-medium">{candidate.firstName} {candidate.lastName}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Program</span>
            <span className="font-medium">{candidate.program || 'Not specified'}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Potential score</span>
            <span className="font-medium">{candidate.overallScore ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">Status</span>
            <span className="px-2 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
              {candidate.status}
            </span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="text-gray-600">IELTS</span>
            <span className="font-medium">{candidate.ielts_score ?? '—'}</span>
          </div>
          {candidate.explanation && (
            <div>
              <p className="text-gray-600 mb-1">Key factors</p>
              <p className="text-sm text-gray-500">{candidate.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}