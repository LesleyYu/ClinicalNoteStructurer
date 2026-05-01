import { useState } from 'react';
import { postGenerateNote } from '../api/generate';

export default function NoteInputArea({ onResult })
{
    const [noteText, setNoteText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    async function handleGenerateClick()
    {
        if (!noteText.trim()) return setErrorMessage('Please paste a clinical note before generating.');
        if (noteText.trim().length < 50) return setErrorMessage('Note seems too short to process.');

        setIsLoading(true);
        setErrorMessage('');

        const generation_result = await postGenerateNote(noteText);
        setIsLoading(false);

        if (!generation_result) return setErrorMessage('Generation failed. Verify the backend is running and try again.');
        onResult(generation_result, noteText);
    }

    return (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-3">1. Paste raw clinical note</h2>
            <h4 className="text-base text-gray-900 mb-3" style={{color: "gray", fontSize: "13px"}}>Paste plain text from the ER note and H&P.
  Tables and exact spacing don't need to be preserved; the model is robust to ragged formatting.</h4>
            <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Paste the ER note and H&P here..."
                rows={14}
                disabled={isLoading}
                className="w-full font-mono text-xs border border-gray-300 rounded p-3 focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
            />
            {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
            <div className="mt-3 flex items-center gap-3">
                <button
                    onClick={handleGenerateClick}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating…' : 'Generate Structured Output'}
                </button>
                {isLoading && <span className="text-sm text-gray-500">This typically takes 15–30 seconds.</span>}
            </div>
        </section>
    );
}
