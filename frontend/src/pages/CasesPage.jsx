import { useEffect, useState } from 'react';
import CaseListTable from '../components/CaseListTable';
import { getAllCases } from '../api/cases';

export default function CasesPage()
{
    const [casesList, setCasesList] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(function()
    {
        async function loadCases()
        {
            const list_data = await getAllCases();
            setIsLoading(false);
            if (list_data == null) return setErrorMessage('Failed to load cases.');
            setCasesList(list_data);
        }
        loadCases();
    }, []);

    if (isLoading) return <p className="text-sm text-gray-500">Loading saved cases…</p>;
    if (errorMessage) return <p className="text-sm text-red-600">{errorMessage}</p>;

    return (
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Saved Cases</h2>
            <CaseListTable cases={casesList} />
        </section>
    );
}
