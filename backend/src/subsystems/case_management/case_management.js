const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function buildLogPath()
{
    const date_now = new Date();
    const yyyy_str = String(date_now.getFullYear());
    const mm_str = String(date_now.getMonth() + 1).padStart(2, '0');
    const dd_str = String(date_now.getDate()).padStart(2, '0');
    return path.join(__dirname, '..', '..', '..', 'logs', `case_management_${yyyy_str}${mm_str}${dd_str}.log`);
}

function logSubsystemEvent(event_tag, event_message)
{
    const date_now = new Date();
    const hh_str = String(date_now.getHours()).padStart(2, '0');
    const mn_str = String(date_now.getMinutes()).padStart(2, '0');
    const ss_str = String(date_now.getSeconds()).padStart(2, '0');
    const log_line = `${hh_str}:${mn_str}:${ss_str} [${event_tag}] ${event_message}\n`;
    const log_path = buildLogPath();
    fs.mkdirSync(path.dirname(log_path), { recursive: true });
    fs.appendFileSync(log_path, log_line);
    process.stdout.write(log_line);
}

let cached_supabase_client = null;

function getSupabaseClient()
{
    if (cached_supabase_client) return cached_supabase_client;

    const supabase_url = process.env['SUPABASE_URL'];
    const supabase_key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!supabase_url || !supabase_key)
    {
        logSubsystemEvent('CONFIG_ERROR', 'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing');
        return null;
    }

    cached_supabase_client = createClient(supabase_url, supabase_key, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    return cached_supabase_client;
}

const ALLOWED_DISPOSITIONS = ['Admit', 'Observe', 'Discharge', 'Unknown'];

function isAllowedDisposition(value_text)
{
    if (!value_text) return true;
    return ALLOWED_DISPOSITIONS.indexOf(value_text) != -1;
}

async function insertCaseRecord(case_payload)
{
    if (!case_payload || typeof case_payload != 'object') return null;
    if (!case_payload['original_note'] || typeof case_payload['original_note'] != 'string') return null;
    if (!isAllowedDisposition(case_payload['disposition'])) return null;

    const supabase_client = getSupabaseClient();
    if (!supabase_client) return null;

    const insert_row = {};
    insert_row['original_note'] = case_payload['original_note'];
    insert_row['chief_complaint'] = ('chief_complaint' in case_payload) ? case_payload['chief_complaint'] : null;
    insert_row['hpi_summary'] = ('hpi_summary' in case_payload) ? case_payload['hpi_summary'] : null;
    insert_row['key_findings'] = ('key_findings' in case_payload) ? case_payload['key_findings'] : null;
    insert_row['suspected_conditions'] = ('suspected_conditions' in case_payload) ? case_payload['suspected_conditions'] : null;
    insert_row['disposition'] = ('disposition' in case_payload) ? case_payload['disposition'] : null;
    insert_row['uncertainties'] = ('uncertainties' in case_payload) ? case_payload['uncertainties'] : null;
    insert_row['revised_hpi'] = ('revised_hpi' in case_payload) ? case_payload['revised_hpi'] : null;
    insert_row['is_edited'] = case_payload['is_edited'] == true;
    insert_row['edited_fields'] = ('edited_fields' in case_payload) ? case_payload['edited_fields'] : null;

    const insert_result = await supabase_client.from('cases').insert(insert_row).select().single();
    if (insert_result['error'])
    {
        logSubsystemEvent('INSERT_ERROR', `Insert failed: ${insert_result['error'].message}`);
        return null;
    }

    logSubsystemEvent('INSERT_SUCCESS', `Inserted case id=${insert_result['data']['id']}`);
    return insert_result['data'];
}

async function listAllCases()
{
    const supabase_client = getSupabaseClient();
    if (!supabase_client) return null;

    const list_result = await supabase_client.from('cases')
        .select('id, created_at, updated_at, chief_complaint, disposition, is_edited')
        .order('created_at', { ascending: false });

    if (list_result['error'])
    {
        logSubsystemEvent('LIST_ERROR', `List failed: ${list_result['error'].message}`);
        return null;
    }

    logSubsystemEvent('LIST_SUCCESS', `Listed ${list_result['data'].length} cases`);
    return list_result['data'];
}

async function getCaseById(case_id)
{
    if (!case_id || typeof case_id != 'string') return null;

    const supabase_client = getSupabaseClient();
    if (!supabase_client) return null;

    const fetch_result = await supabase_client.from('cases').select('*').eq('id', case_id).single();
    if (fetch_result['error'])
    {
        logSubsystemEvent('FETCH_ERROR', `Get by id ${case_id} failed: ${fetch_result['error'].message}`);
        return null;
    }

    logSubsystemEvent('FETCH_SUCCESS', `Fetched case id=${case_id}`);
    return fetch_result['data'];
}

async function updateCaseRecord(case_id, update_payload)
{
    if (!case_id || typeof case_id != 'string') return null;
    if (!update_payload || typeof update_payload != 'object') return null;
    if ('disposition' in update_payload && !isAllowedDisposition(update_payload['disposition'])) return null;

    const supabase_client = getSupabaseClient();
    if (!supabase_client) return null;

    const allowed_fields = ['chief_complaint', 'hpi_summary', 'key_findings', 'suspected_conditions', 'disposition', 'uncertainties', 'revised_hpi', 'is_edited', 'edited_fields'];
    const update_row = {};
    let provided_count = 0;
    for (let idx = 0; idx < allowed_fields.length; idx = idx + 1)
    {
        const field_name = allowed_fields[idx];
        if (field_name in update_payload)
        {
            update_row[field_name] = update_payload[field_name];
            provided_count = provided_count + 1;
        }
    }

    if (provided_count == 0)
    {
        logSubsystemEvent('UPDATE_NOOP', `No allowed fields provided for case id=${case_id}`);
        return null;
    }

    update_row['updated_at'] = new Date().toISOString();

    const update_result = await supabase_client.from('cases').update(update_row).eq('id', case_id).select().single();
    if (update_result['error'])
    {
        logSubsystemEvent('UPDATE_ERROR', `Update id ${case_id} failed: ${update_result['error'].message}`);
        return null;
    }

    logSubsystemEvent('UPDATE_SUCCESS', `Updated case id=${case_id} (fields=${provided_count})`);
    return update_result['data'];
}

module.exports.insertCaseRecord = insertCaseRecord;
module.exports.listAllCases = listAllCases;
module.exports.getCaseById = getCaseById;
module.exports.updateCaseRecord = updateCaseRecord;
