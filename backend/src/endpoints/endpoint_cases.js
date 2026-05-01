const fs = require('fs');
const path = require('path');
const case_management = require('../subsystems/case_management/case_management');

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

async function replyToCreateCase(req, res)
{
    if (!req.body) return res.json({ result: 'ERROR', message: 'Missing request body' });
    if (!req.body['original_note']) return res.json({ result: 'ERROR', message: 'Missing required field: original_note' });
    if (typeof req.body['original_note'] != 'string') return res.json({ result: 'ERROR', message: 'Field "original_note" must be a string' });
    if (req.body['original_note'].trim().length < 20) return res.json({ result: 'ERROR', message: 'original_note is too short' });

    logEndpointEvent('CASES_CREATE_ENTRY', `disposition=${req.body['disposition'] || 'null'}`);

    const insert_result = await case_management.insertCaseRecord(req.body);
    if (!insert_result)
    {
        logEndpointEvent('CASES_CREATE_FAIL', 'Insert returned null');
        return res.json({ result: 'ERROR', message: 'Failed to save case' });
    }

    logEndpointEvent('CASES_CREATE_EXIT', `id=${insert_result['id']}`);
    return res.json({ result: 'SUCCESS', data: insert_result });
}

async function replyToListCases(req, res)
{
    logEndpointEvent('CASES_LIST_ENTRY', '');

    const list_data = await case_management.listAllCases();
    if (list_data == null)
    {
        logEndpointEvent('CASES_LIST_FAIL', 'List returned null');
        return res.json({ result: 'ERROR', message: 'Failed to list cases' });
    }

    logEndpointEvent('CASES_LIST_EXIT', `count=${list_data.length}`);
    return res.json({ result: 'SUCCESS', data: list_data });
}

async function replyToGetCase(req, res)
{
    if (!req.params || !req.params['id']) return res.json({ result: 'ERROR', message: 'Missing case id' });
    const case_id = req.params['id'];

    logEndpointEvent('CASES_GET_ENTRY', `id=${case_id}`);

    const case_record = await case_management.getCaseById(case_id);
    if (!case_record)
    {
        logEndpointEvent('CASES_GET_FAIL', `id=${case_id} not found`);
        return res.json({ result: 'ERROR', message: 'Case not found' });
    }

    logEndpointEvent('CASES_GET_EXIT', `id=${case_id}`);
    return res.json({ result: 'SUCCESS', data: case_record });
}

async function replyToUpdateCase(req, res)
{
    if (!req.params || !req.params['id']) return res.json({ result: 'ERROR', message: 'Missing case id' });
    if (!req.body) return res.json({ result: 'ERROR', message: 'Missing request body' });
    const case_id = req.params['id'];

    logEndpointEvent('CASES_UPDATE_ENTRY', `id=${case_id}`);

    const updated_record = await case_management.updateCaseRecord(case_id, req.body);
    if (!updated_record)
    {
        logEndpointEvent('CASES_UPDATE_FAIL', `id=${case_id}`);
        return res.json({ result: 'ERROR', message: 'Failed to update case' });
    }

    logEndpointEvent('CASES_UPDATE_EXIT', `id=${case_id}`);
    return res.json({ result: 'SUCCESS', data: updated_record });
}

const apiArray = [];

apiArray.push({
    routeType: 'POST',
    routePath: 'api/cases',
    routeMethod: replyToCreateCase,
    routeOptions:
    {
        description: 'Create (save) a new structured case record.',
        group: 'CaseManagement',
        sampleParams: { original_note: '...', chief_complaint: '...', disposition: 'Admit' }
    }
});

apiArray.push({
    routeType: 'GET',
    routePath: 'api/cases',
    routeMethod: replyToListCases,
    routeOptions:
    {
        description: 'List all saved cases (summary view).',
        group: 'CaseManagement',
        sampleParams: {}
    }
});

apiArray.push({
    routeType: 'GET',
    routePath: 'api/cases/:id',
    routeMethod: replyToGetCase,
    routeOptions:
    {
        description: 'Retrieve a single case by id.',
        group: 'CaseManagement',
        sampleParams: { id: '<uuid>' }
    }
});

apiArray.push({
    routeType: 'PUT',
    routePath: 'api/cases/:id',
    routeMethod: replyToUpdateCase,
    routeOptions:
    {
        description: 'Update an existing case (partial allowed fields).',
        group: 'CaseManagement',
        sampleParams: { id: '<uuid>', revised_hpi: '...', is_edited: true, edited_fields: ['revised_hpi'] }
    }
});

module.exports = apiArray;
