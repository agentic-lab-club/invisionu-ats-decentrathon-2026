interface CategorySectionProps {
  category: string;
  score: number;
  evidence: string;
}

export default function CategorySection({ category, score, evidence }: CategorySectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-medium text-gray-900">{category}</h3>
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
          {score}%
        </span>
      </div>
      <p className="text-gray-600 whitespace-pre-wrap">{evidence}</p>
    </div>
  );
}