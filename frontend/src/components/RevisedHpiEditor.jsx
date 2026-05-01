import EditBadge from './EditBadge';

export default function RevisedHpiEditor({ value, isEdited, onChange })
{
    return (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
                3. Revised HPI <span className="font-normal text-sm text-gray-500">(admission-supporting narrative)</span>
                <EditBadge visible={isEdited} />
            </h2>
            <textarea
                value={value || ''}
                onChange={e => onChange(e.target.value)}
                rows={14}
                className="w-full text-sm leading-relaxed border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500"
            />
        </section>
    );
}
