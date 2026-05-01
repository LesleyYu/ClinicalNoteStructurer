const fs = require('fs');
const path = require('path');
const note_generation = require('../modules/note_generation/note_generation');

function buildLogPath()
{
    const date_now = new Date();
    const yyyy_str = String(date_now.getFullYear());
    const mm_str = String(date_now.getMonth() + 1).padStart(2, '0');
    const dd_str = String(date_now.getDate()).padStart(2, '0');
    return path.join(__dirname, '..', '..', 'logs', `webserver_api_${yyyy_str}${mm_str}${dd_str}.log`);
}

function logEndpointEvent(event_tag, event_message)
{
    const date_now = new Date();
    const hh_str = String(date_now.getHours()).padStart(2, '0');
    const mn_str = String(date_now.getMinutes()).padStart(2, '0');
    const ss_str = String(date_now.getSeconds()).padStart(2, '0');
    const log_line = `${hh_str}:${mn_str}:${ss_str} [${event_tag}] ${event_message}\n`;
    fs.appendFileSync(buildLogPath(), log_line);
    process.stdout.write(log_line);
}

async function replyToGenerateNote(req, res)
{
    if (!req.body) return res.json({ result: 'ERROR', message: 'Missing request body' });
    if (!req.body['note']) return res.json({ result: 'ERROR', message: 'Missing required field: note' });
    if (typeof req.body['note'] != 'string') return res.json({ result: 'ERROR', message: 'Field "note" must be a string' });

    const raw_note_text = req.body['note'];
    if (raw_note_text.trim().length < 20) return res.json({ result: 'ERROR', message: 'Note is too short to process' });

    logEndpointEvent('GENERATE_ENTRY', `note_len=${raw_note_text.length}`);

    const generation_result = await note_generation.generateStructuredNote(raw_note_text);
    if (!generation_result)
    {
        logEndpointEvent('GENERATE_FAIL', `Generation returned null`);
        return res.json({ result: 'ERROR', message: 'Note generation failed. Please try again.' });
    }

    logEndpointEvent('GENERATE_EXIT', `disposition=${generation_result['disposition']}`);
    return res.json({ result: 'SUCCESS', data: generation_result });
}

const apiArray = [];

apiArray.push({
    routeType: 'POST',
    routePath: 'api/generate',
    routeMethod: replyToGenerateNote,
    routeOptions:
    {
        description: 'Submit a raw clinical note and receive structured output plus Revised HPI.',
        group: 'NoteGeneration',
        sampleParams: { note: 'Paste raw ER note and H&P text here.' }
    }
});

module.exports = apiArray;
