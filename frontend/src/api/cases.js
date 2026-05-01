export async function postSaveCase(case_payload)
{
    const api_response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(case_payload)
    });
    const response_data = await api_response.json();
    if (response_data['result'] != 'SUCCESS') return null;
    return response_data['data'];
}

export async function getAllCases()
{
    const api_response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cases`);
    const response_data = await api_response.json();
    if (response_data['result'] != 'SUCCESS') return null;
    return response_data['data'];
}

export async function getCaseById(case_id)
{
    const api_response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cases/${case_id}`);
    const response_data = await api_response.json();
    if (response_data['result'] != 'SUCCESS') return null;
    return response_data['data'];
}

export async function putUpdateCase(case_id, update_payload)
{
    const api_response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/cases/${case_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(update_payload)
    });
    const response_data = await api_response.json();
    if (response_data['result'] != 'SUCCESS') return null;
    return response_data['data'];
}
