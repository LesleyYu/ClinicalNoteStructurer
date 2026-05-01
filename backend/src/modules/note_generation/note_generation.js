const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const ANTHROPIC_MODEL_ID = 'claude-sonnet-4-6';
const ANTHROPIC_MAX_TOKENS = 2000;

function buildLogPath()
{
    const date_now = new Date();
    const yyyy_str = String(date_now.getFullYear());
    const mm_str = String(date_now.getMonth() + 1).padStart(2, '0');
    const dd_str = String(date_now.getDate()).padStart(2, '0');
    return path.join(__dirname, '..', '..', '..', 'logs', `note_generation_${yyyy_str}${mm_str}${dd_str}.log`);
}

function logModuleEvent(event_tag, event_message)
{
    const date_now = new Date();
    const hh_str = String(date_now.getHours()).padStart(2, '0');
    const mn_str = String(date_now.getMinutes()).padStart(2, '0');
    const ss_str = String(date_now.getSeconds()).padStart(2, '0');
    const log_line = `${hh_str}:${mn_str}:${ss_str} [${event_tag}] ${event_message}\n`;
    fs.appendFileSync(buildLogPath(), log_line);
    process.stdout.write(log_line);
}

const SYSTEM_PROMPT_TEXT = `You are a medical documentation reviewer assistant. Your role is to read raw, unstructured clinical notes (ER notes, History and Physical notes) and produce a structured summary plus a Revised History of Present Illness (HPI) narrative that supports the inpatient admission decision per MCG (Milliman Care Guidelines) criteria.

# MCG ADMISSION CRITERIA — DIABETES (M-130, condensed)

Inpatient admission is indicated when ONE OR MORE of the following is satisfied:

1. Diabetic ketoacidosis (DKA) requiring inpatient management — ALL of:
   (a) Hyperglycemia (glucose >= 200 mg/dL) OR euglycemic DKA suspected (glucose < 200 mg/dL with risk factor: SGLT2 inhibitor, pregnancy, prolonged starvation, heavy alcohol, chronic liver/renal disease, sepsis, ketogenic diet, pancreatitis), OR any glucose with prior diabetes history.
   (b) Ketonuria or ketonemia (e.g., serum beta-hydroxybutyrate >= 3.0 mmol/L, or urine ketones 2+ or higher, or "large" ketones reported).
   (c) Acidosis: arterial or venous pH < 7.30, OR serum bicarbonate <= 18 mEq/L, OR anion gap > 12.
   AND inpatient management appropriate, indicated by ANY of: pH <= 7.25, bicarbonate < 15, altered mental status, hypotension, AKI (creatinine 2x baseline), persistent dehydration, persistent electrolyte abnormality, inability to maintain oral hydration, pregnancy, etiology unclear, newly diagnosed diabetes without insulin regimen, or infection requiring inpatient care.

2. Hyperglycemic Hyperosmolar State (HHS) — ALL of: glucose > 600 mg/dL AND total serum osmolality > 320 mOsm/kg (or effective osmolality > 300).

3. Hyperglycemia requiring inpatient care — ANY of: hemodynamic instability, severe/persistent altered mental status, severe/persistent dehydration, persistent significant electrolyte abnormality, inability to maintain oral hydration, glucose persistently too high for next level of care, infection requiring inpatient treatment.

# OUTPUT FORMAT

You MUST return a single JSON object with EXACTLY these keys, no preamble, no markdown fences, no commentary:

{
  "chief_complaint": string,
  "hpi_summary": string,
  "key_findings": [string, ...],
  "suspected_conditions": [string, ...],
  "disposition": "Admit" | "Observe" | "Discharge" | "Unknown",
  "uncertainties": string,
  "revised_hpi": string
}

# REVISED HPI QUALITY REQUIREMENTS

The revised_hpi field is a multi-sentence narrative that must:
- Open with patient demographics (age, sex) and chief complaint.
- Document objective vitals and physical exam findings supporting severity.
- Cite specific lab values (pH, bicarbonate, glucose, ketones, anion gap, sodium, etc.) with units.
- Name the clinical diagnosis explicitly.
- Describe ED treatment escalation (IV fluids, insulin drip, bicarbonate, antibiotics, etc.) actually documented in the source.
- End with a sentence connecting the clinical picture to the need for inpatient/ICU-level admission per MCG criteria.
- DO NOT invent any clinical facts not present in the source notes. If a value is not in the source, do not include it.

# FEW-SHOT EXAMPLE

INPUT (raw notes):
"""
ER NOTE
ER Attending: Dr. Nick Kwan
Chief Complaint: Diabetes issue
HPI: 47-year-old male with recent diagnosis of diabetes, on Jardiance and metformin, presents ED for 1 day history of inability to take deep breaths, sleep well, nausea, and vomiting. Denies chest pain, fever, abdominal pain.
PMH: Diabetes
Vitals: BP 130/92, HR 113, RR 20, SpO2 95%, Temp 98.2 F
Physical Exam: Alert, awake, talking in complete sentences. Kussmaul breathing. Lungs clear. RRR. No focal deficit.
Labs:
  Acetone serum: KETONES LARGE A
  Urine ketone: 60 mg/dL (high)
  ABG: pH 7.200 (LL), pCO2 19.4 (LL), pO2 123.4 (H), HCO3 7.4 (L), BE -18.0 (L)
  CMP: Glucose 93, BUN 12, Creatinine 1.0, Na 138, K 4.1, Cl 105, CO2 <7 (LL)
  Lactic acid 1.9
  Troponin <0.012
  TSH 0.63
  D-dimer 0.38 (negative for PE)
ED Course: Patient given bicarb, 3 L of normal saline. Started on insulin drip. Critical care time 35 minutes.
Clinical Impression: Euglycemic DKA
Disposition: Admit to ICU

H&P
HPI: 47M recently diagnosed diabetes, started on metformin and Jardiance Friday morning, became more restless unable to sleep. Yesterday: unable to tolerate PO, 1 episode vomiting. This morning: several episodes vomiting, ongoing nausea. ED noted euglycemic DKA, bicarb <7, pH 7.2, glucose 93. Admission requested for euglycemic DKA likely in setting of new Jardiance use.
PE: Lethargic, ill-appearing, A&O x3.
Plan: ICU admission, insulin infusion, BMP q4h, hypoglycemia protocol with fingerstick q1h, discontinue metformin and Jardiance, NPO, DVT prophylaxis with Lovenox.
Critical care justification: DKA on insulin infusion.
"""

OUTPUT:
{
  "chief_complaint": "Diabetes issue",
  "hpi_summary": "47-year-old male with recently diagnosed diabetes who started metformin and Jardiance, presenting with one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths. ED evaluation found euglycemic diabetic ketoacidosis with severe metabolic acidosis (pH 7.20, bicarbonate 7.4 mmol/L, serum CO2 <7) and large serum and urine ketones, despite normal serum glucose (93 mg/dL). Treated with IV bicarbonate, three liters of normal saline, and started on continuous insulin infusion; admitted to ICU.",
  "key_findings": [
    "Tachycardia (HR 113) with Kussmaul breathing on examination",
    "Severe metabolic acidosis: arterial pH 7.20, bicarbonate 7.4 mmol/L, serum CO2 <7 mmol/L, base excess -18.0",
    "Large serum acetone and elevated urine ketones (60 mg/dL)",
    "Normal serum glucose (93 mg/dL) — euglycemic presentation",
    "Recent initiation of SGLT2 inhibitor (Jardiance) as precipitating factor",
    "ED treatment escalated to IV bicarbonate, 3 L normal saline, and continuous insulin infusion",
    "Critical care services documented (35 minutes)"
  ],
  "suspected_conditions": [
    "Euglycemic diabetic ketoacidosis secondary to SGLT2 inhibitor (Jardiance)",
    "Newly diagnosed diabetes mellitus"
  ],
  "disposition": "Admit",
  "uncertainties": "",
  "revised_hpi": "A 47-year-old man with a recent diagnosis of diabetes who had started metformin and Jardiance presented to the emergency department after one day of nausea, vomiting, inability to sleep, and difficulty taking deep breaths. In the emergency department, he was described as tachycardic and exhibiting Kussmaul breathing. Laboratory evaluation demonstrated large serum and urine ketones with severe metabolic acidosis, including arterial pH 7.20, bicarbonate 7.4 millimoles per liter, and serum carbon dioxide less than 7 millimoles per liter, while serum glucose remained in the normal range. Emergency physicians documented euglycemic diabetic ketoacidosis in the setting of recent Jardiance use. In the emergency department he received bicarbonate, three liters of normal saline, and was started on an insulin infusion after repeated reassessments. Taken together, the documented severe acidosis with ketosis, escalation of emergency department treatment to continuous intravenous therapy, critical care involvement, and planned intensive care unit-level management supported the decision for inpatient admission rather than discharge or observation."
}

# RULES

- Return ONLY the JSON object. No prose before or after. No markdown fences.
- If a clinical detail is not in the source notes, omit it. Do not fabricate values.
- If the disposition cannot be determined from the source, use "Unknown".
- The "uncertainties" field is for genuinely ambiguous clinical details (e.g., conflicting documentation); use "" if none.
- Use bracket-quoted lab values with units exactly as documented when possible.`;

function tryParseJson(raw_text)
{
    if (!raw_text) return null;
    const trimmed_text = raw_text.trim();
    const direct_attempt = parseJsonSafe(trimmed_text);
    if (direct_attempt) return direct_attempt;

    const start_idx = trimmed_text.indexOf('{');
    const end_idx = trimmed_text.lastIndexOf('}');
    if (start_idx == -1 || end_idx == -1 || end_idx <= start_idx) return null;
    const inner_text = trimmed_text.substring(start_idx, end_idx + 1);
    return parseJsonSafe(inner_text);
}

function parseJsonSafe(json_text)
{
    let parsed_value = null;
    try { parsed_value = JSON.parse(json_text); }
    catch (parse_err) { return null; }
    return parsed_value;
}

function validateStructuredOutput(parsed_obj)
{
    if (!parsed_obj || typeof parsed_obj != 'object') return false;
    const required_keys = ['chief_complaint', 'hpi_summary', 'key_findings', 'suspected_conditions', 'disposition', 'uncertainties', 'revised_hpi'];
    for (let idx = 0; idx < required_keys.length; idx = idx + 1)
    {
        const key_name = required_keys[idx];
        if (!(key_name in parsed_obj)) return false;
    }
    if (!Array.isArray(parsed_obj['key_findings'])) return false;
    if (!Array.isArray(parsed_obj['suspected_conditions'])) return false;
    const allowed_dispositions = ['Admit', 'Observe', 'Discharge', 'Unknown'];
    if (allowed_dispositions.indexOf(parsed_obj['disposition']) == -1) return false;
    return true;
}

async function callAnthropicOnce(raw_note_text, anthropic_client)
{
    const api_response = await anthropic_client.messages.create({
        model: ANTHROPIC_MODEL_ID,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        system: SYSTEM_PROMPT_TEXT,
        messages: [{
            role: 'user',
            content: `Convert the following raw clinical notes into the structured JSON output described in the system prompt. Return ONLY the JSON object.\n\nRAW NOTES:\n"""\n${raw_note_text}\n"""`
        }]
    });

    if (!api_response || !api_response['content']) return null;
    const content_blocks = api_response['content'];
    let text_output = '';
    for (let idx = 0; idx < content_blocks.length; idx = idx + 1)
    {
        const block = content_blocks[idx];
        if (block && block['type'] == 'text' && block['text']) text_output = text_output + block['text'];
    }
    return text_output;
}

async function generateStructuredNote(raw_note_text)
{
    if (!raw_note_text || typeof raw_note_text != 'string') return null;
    if (raw_note_text.trim().length < 20) return null;

    const api_key = process.env['ANTHROPIC_API_KEY'];
    if (!api_key)
    {
        logModuleEvent('CONFIG_ERROR', 'ANTHROPIC_API_KEY missing from environment');
        return null;
    }

    const anthropic_client = new Anthropic({ apiKey: api_key });

    logModuleEvent('CALL_START', `Anthropic call attempt 1 (model=${ANTHROPIC_MODEL_ID}, note_len=${raw_note_text.length})`);
    const first_text = await callAnthropicOnce(raw_note_text, anthropic_client).catch(function(call_err)
    {
        logModuleEvent('CALL_ERROR', `Anthropic call attempt 1 failed: ${call_err.message}`);
        return null;
    });

    if (first_text)
    {
        const first_parsed = tryParseJson(first_text);
        if (first_parsed && validateStructuredOutput(first_parsed))
        {
            logModuleEvent('CALL_SUCCESS', `Anthropic call attempt 1 succeeded`);
            return first_parsed;
        }
        logModuleEvent('PARSE_FAIL', `Attempt 1 returned text but JSON parse/validation failed; retrying`);
    }

    logModuleEvent('CALL_START', `Anthropic call attempt 2 (retry)`);
    const second_text = await callAnthropicOnce(raw_note_text, anthropic_client).catch(function(call_err)
    {
        logModuleEvent('CALL_ERROR', `Anthropic call attempt 2 failed: ${call_err.message}`);
        return null;
    });

    if (!second_text)
    {
        logModuleEvent('CALL_FAIL', `Anthropic call attempt 2 returned no text`);
        return null;
    }

    const second_parsed = tryParseJson(second_text);
    if (!second_parsed || !validateStructuredOutput(second_parsed))
    {
        logModuleEvent('PARSE_FAIL', `Attempt 2 JSON parse/validation failed; giving up`);
        return null;
    }

    logModuleEvent('CALL_SUCCESS', `Anthropic call attempt 2 succeeded (retry)`);
    return second_parsed;
}

module.exports.generateStructuredNote = generateStructuredNote;
