import { Link } from 'react-router-dom';
import DispositionBadge from './DispositionBadge';
import EditBadge from './EditBadge';

export default function CaseListTable({ cases })
{
    if (!cases || cases.length == 0)
    {
        return <p className="text-sm text-gray-500 italic">No saved cases yet. Generate and save one from the New Note page.</p>;
    }

    return (
        <table className="w-full text-sm border-collapse">
            <thead>
                <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-4 font-semibold text-gray-700">Saved</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700">Chief Complaint</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700">Disposition</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700">Edits</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700"></th>
                </tr>
            </thead>
            <tbody>
                {cases.map(function(case_row)
                {
                    const created_str = case_row['created_at'] ? new Date(case_row['created_at']).toLocaleString() : '';
                    return (
                        <tr key={case_row['id']} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{created_str}</td>
                            <td className="py-2 pr-4 text-gray-900">{case_row['chief_complaint'] || <span className="text-gray-400 italic">(none)</span>}</td>
                            <td className="py-2 pr-4"><DispositionBadge value={case_row['disposition']} /></td>
                            <td className="py-2 pr-4"><EditBadge visible={case_row['is_edited']} /></td>
                            <td className="py-2 pr-4">
                                <Link to={`/cases/${case_row['id']}`} className="text-blue-600 hover:underline text-sm font-medium">
                                    View
                                </Link>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
