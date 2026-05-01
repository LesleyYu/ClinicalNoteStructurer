export async function postGenerateNote(raw_note)
{
    const api_response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: raw_note })
    });
    const response_data = await api_response.json();
    if (response_data['result'] != 'SUCCESS') return null;
    return response_data['data'];
}
