import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StructuredOutputPanel from '../components/StructuredOutputPanel';
import RevisedHpiEditor from '../components/RevisedHpiEditor';
import { getCaseById, putUpdateCase } from '../api/cases';

function compareValues(a_value, b_value)
{
    if (Array.isArray(a_value) || Array.isArray(b_value))
    {
        return JSON.stringify(a_value || []) == JSON.stringify(b_value || []);
    }
    return (a_value || '') == (b_value || '');
}

export default function CaseDetailPage()
{
    const { id } = useParams();
    const [caseRecord, setCaseRecord] = useState(null);
    const [originalSnapshot, setOriginalSnapshot] = useState(null);
    const [editedFields, setEditedFields] = useState(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrorMessage, setLoadErrorMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [saveErrorMessage, setSaveErrorMessage] = useState('');
    const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

    useEffect(function()
    {
        async function loadCase()
        {
            const record = await getCaseById(id);
            setIsLoading(false);
            if (!record) return setLoadErrorMessage('Failed to load case.');
            setCaseRecord(record);
            setOriginalSnapshot(JSON.parse(JSON.stringify(record)));

            const initial_set = new Set();
            const saved_fields = record['edited_fields'] || [];
            for (let i = 0; i < saved_fields.length; i = i + 1)
            {
                initial_set.add(saved_fields[i]);
            }
            setEditedFields(initial_set);
        }
        loadCase();
    }, [id]);

    function handleFieldChange(field_name, new_value)
    {
        const next_record = { ...caseRecord };
        next_record[field_name] = new_value;
        setCaseRecord(next_record);

        const baseline_value = originalSnapshot ? originalSnapshot[field_name] : null;
        const is_changed = !compareValues(new_value, baseline_value);
        if (is_changed && !editedFields.has(field_name))
        {
            const next_set = new Set(editedFields);
            next_set.add(field_name);
            setEditedFields(next_set);
        }

        setSaveSuccessMessage('');
    }

    function handleRevisedHpiChange(new_value)
    {
        handleFieldChange('revised_hpi', new_value);
    }

    async function handleSaveClick()
    {
        if (!caseRecord) return;

        setIsSaving(true);
        setSaveErrorMessage('');
        setSaveSuccessMessage('');

        const update_payload = {};
        update_payload['chief_complaint'] = caseRecord['chief_complaint'];
        update_payload['hpi_summary'] = caseRecord['hpi_summary'];
        update_payload['key_findings'] = caseRecord['key_findings'];
        update_payload['suspected_conditions'] = caseRecord['suspected_conditions'];
        update_payload['disposition'] = caseRecord['disposition'];
        update_payload['uncertainties'] = caseRecord['uncertainties'];
        update_payload['revised_hpi'] = caseRecord['revised_hpi'];
        update_payload['is_edited'] = editedFields.size > 0;
        update_payload['edited_fields'] = Array.from(editedFields);

        const save_result = await putUpdateCase(id, update_payload);
        setIsSaving(false);

        if (!save_result) return setSaveErrorMessage('Update failed. Please try again.');

        setCaseRecord(save_result);
        setOriginalSnapshot(JSON.parse(JSON.stringify(save_result)));

        const refreshed_set = new Set();
        const persisted_fields = save_result['edited_fields'] || [];
        for (let i = 0; i < persisted_fields.length; i = i + 1)
        {
            refreshed_set.add(persisted_fields[i]);
        }
        setEditedFields(refreshed_set);
        setSaveSuccessMessage('Saved.');
    }

    if (isLoading) return <p className="text-sm text-gray-500">Loading case…</p>;
    if (loadErrorMessage) return <p className="text-sm text-red-600">{loadErrorMessage}</p>;
    if (!caseRecord) return null;

    const created_str = caseRecord['created_at'] ? new Date(caseRecord['created_at']).toLocaleString() : '';
    const updated_str = caseRecord['updated_at'] ? new Date(caseRecord['updated_at']).toLocaleString() : '';
    const edited_count = editedFields.size;

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <Link to="/cases" className="text-sm text-blue-600 hover:underline">← Back to saved cases</Link>
                <span className="text-xs text-gray-500">Saved {created_str} · Updated {updated_str}</span>
            </div>

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Original Note</h2>
                <pre className="font-mono text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded p-3 max-h-72 overflow-auto whitespace-pre-wrap">{caseRecord['original_note']}</pre>
            </section>

            <StructuredOutputPanel output={caseRecord} editedFields={editedFields} onFieldChange={handleFieldChange} />
            <RevisedHpiEditor value={caseRecord['revised_hpi']} isEdited={editedFields.has('revised_hpi')} onChange={handleRevisedHpiChange} />

            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center gap-4 flex-wrap">
                <button
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving…' : 'Save Changes'}
                </button>
                {edited_count > 0 && (
                    <p className="text-sm text-amber-700">
                        {edited_count} edited field{edited_count > 1 ? 's' : ''}: {Array.from(editedFields).join(', ')}
                    </p>
                )}
                {saveErrorMessage && <p className="text-sm text-red-600">{saveErrorMessage}</p>}
                {saveSuccessMessage && <p className="text-sm text-green-700">{saveSuccessMessage}</p>}
            </section>
        </div>
    );
}
