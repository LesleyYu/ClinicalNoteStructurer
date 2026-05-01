import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NoteInputArea from '../components/NoteInputArea';
import StructuredOutputPanel from '../components/StructuredOutputPanel';
import RevisedHpiEditor from '../components/RevisedHpiEditor';
import { postSaveCase } from '../api/cases';

function compareValues(a_value, b_value)
{
    if (Array.isArray(a_value) || Array.isArray(b_value))
    {
        return JSON.stringify(a_value || []) == JSON.stringify(b_value || []);
    }
    return (a_value || '') == (b_value || '');
}

export default function HomePage()
{
    const navigate = useNavigate();
    const [structuredOutput, setStructuredOutput] = useState(null);
    const [originalOutput, setOriginalOutput] = useState(null);
    const [rawNoteText, setRawNoteText] = useState('');
    const [editedFields, setEditedFields] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [saveErrorMessage, setSaveErrorMessage] = useState('');

    function handleGenerationResult(result_data, raw_note)
    {
        setStructuredOutput(result_data);
        setOriginalOutput(JSON.parse(JSON.stringify(result_data)));
        setRawNoteText(raw_note);
        setEditedFields(new Set());
        setSaveErrorMessage('');
    }

    function handleFieldChange(field_name, new_value)
    {
        const next_output = { ...structuredOutput };
        next_output[field_name] = new_value;
        setStructuredOutput(next_output);

        const original_value = originalOutput ? originalOutput[field_name] : null;
        const is_changed = !compareValues(new_value, original_value);
        const next_set = new Set(editedFields);
        if (is_changed) next_set.add(field_name);
        if (!is_changed) next_set.delete(field_name);
        setEditedFields(next_set);
    }

    function handleRevisedHpiChange(new_value)
    {
        handleFieldChange('revised_hpi', new_value);
    }

    async function handleSaveClick()
    {
        if (!structuredOutput) return;
        if (!rawNoteText) return setSaveErrorMessage('Cannot save: original note missing.');

        setIsSaving(true);
        setSaveErrorMessage('');

        const save_payload = {};
        save_payload['original_note'] = rawNoteText;
        save_payload['chief_complaint'] = structuredOutput['chief_complaint'];
        save_payload['hpi_summary'] = structuredOutput['hpi_summary'];
        save_payload['key_findings'] = structuredOutput['key_findings'];
        save_payload['suspected_conditions'] = structuredOutput['suspected_conditions'];
        save_payload['disposition'] = structuredOutput['disposition'];
        save_payload['uncertainties'] = structuredOutput['uncertainties'];
        save_payload['revised_hpi'] = structuredOutput['revised_hpi'];
        save_payload['is_edited'] = editedFields.size > 0;
        save_payload['edited_fields'] = Array.from(editedFields);

        const save_result = await postSaveCase(save_payload);
        setIsSaving(false);

        if (!save_result) return setSaveErrorMessage('Save failed. Please check the backend and try again.');
        navigate(`/cases/${save_result['id']}`);
    }

    const edited_count = editedFields.size;

    return (
        <div className="space-y-5">
            <NoteInputArea onResult={handleGenerationResult} />

            {structuredOutput && (
                <>
                    <StructuredOutputPanel output={structuredOutput} editedFields={editedFields} onFieldChange={handleFieldChange} />
                    <RevisedHpiEditor value={structuredOutput['revised_hpi']} isEdited={editedFields.has('revised_hpi')} onChange={handleRevisedHpiChange} />

                    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 flex items-center gap-4 flex-wrap">
                        <button
                            onClick={handleSaveClick}
                            disabled={isSaving}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Saving…' : 'Save Case'}
                        </button>
                        {edited_count > 0 && (
                            <p className="text-sm text-amber-700">
                                {edited_count} field{edited_count > 1 ? 's' : ''} edited: {Array.from(editedFields).join(', ')}
                            </p>
                        )}
                        {saveErrorMessage && <p className="text-sm text-red-600">{saveErrorMessage}</p>}
                    </section>
                </>
            )}
        </div>
    );
}
