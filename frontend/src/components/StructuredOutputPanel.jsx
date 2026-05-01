import EditBadge from './EditBadge';
import DispositionBadge from './DispositionBadge';

export default function StructuredOutputPanel({ output, editedFields, onFieldChange })
{
    if (!output) return null;

    function handleListChange(field_name, raw_text)
    {
        const lines = raw_text.split('\n');
        const cleaned = [];
        for (let i = 0; i < lines.length; i = i + 1)
        {
            const stripped = lines[i].replace(/^[\s\-•·]+/, '').trimEnd();
            if (stripped.length > 0) cleaned.push(stripped);
        }
        onFieldChange(field_name, cleaned);
    }

    function handleStringChange(field_name, new_text)
    {
        onFieldChange(field_name, new_text);
    }

    const key_findings_text = (output['key_findings'] || []).join('\n');
    const suspected_text = (output['suspected_conditions'] || []).join('\n');

    return (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">2. Structured output (review and edit)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Chief Complaint
                        <EditBadge visible={editedFields.has('chief_complaint')} />
                    </label>
                    <input
                        type="text"
                        value={output['chief_complaint'] || ''}
                        onChange={e => handleStringChange('chief_complaint', e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Disposition
                        <EditBadge visible={editedFields.has('disposition')} />
                    </label>
                    <div className="flex items-center gap-3">
                        <select
                            value={output['disposition'] || 'Unknown'}
                            onChange={e => handleStringChange('disposition', e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1.5"
                        >
                            <option value="Admit">Admit</option>
                            <option value="Observe">Observe</option>
                            <option value="Discharge">Discharge</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                        <DispositionBadge value={output['disposition']} />
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    HPI Summary
                    <EditBadge visible={editedFields.has('hpi_summary')} />
                </label>
                <textarea
                    value={output['hpi_summary'] || ''}
                    onChange={e => handleStringChange('hpi_summary', e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Key Findings <span className="text-xs text-gray-500 font-normal">(one per line)</span>
                        <EditBadge visible={editedFields.has('key_findings')} />
                    </label>
                    <textarea
                        value={key_findings_text}
                        onChange={e => handleListChange('key_findings', e.target.value)}
                        rows={7}
                        className="w-full text-sm border border-gray-300 rounded p-2 font-mono focus:outline-none focus:border-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Suspected Conditions <span className="text-xs text-gray-500 font-normal">(one per line)</span>
                        <EditBadge visible={editedFields.has('suspected_conditions')} />
                    </label>
                    <textarea
                        value={suspected_text}
                        onChange={e => handleListChange('suspected_conditions', e.target.value)}
                        rows={7}
                        className="w-full text-sm border border-gray-300 rounded p-2 font-mono focus:outline-none focus:border-blue-500"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uncertainties
                    <EditBadge visible={editedFields.has('uncertainties')} />
                </label>
                <textarea
                    value={output['uncertainties'] || ''}
                    onChange={e => handleStringChange('uncertainties', e.target.value)}
                    rows={3}
                    placeholder="(none reported)"
                    className="w-full text-sm border border-gray-300 rounded p-2 focus:outline-none focus:border-blue-500"
                />
            </div>
        </section>
    );
}
