require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

function buildLogPath()
{
    const date_now = new Date();
    const yyyy_str = String(date_now.getFullYear());
    const mm_str = String(date_now.getMonth() + 1).padStart(2, '0');
    const dd_str = String(date_now.getDate()).padStart(2, '0');
    return path.join(__dirname, '..', 'logs', `webserver_api_${yyyy_str}${mm_str}${dd_str}.log`);
}

function logServerEvent(event_tag, event_message)
{
    const date_now = new Date();
    const hh_str = String(date_now.getHours()).padStart(2, '0');
    const mn_str = String(date_now.getMinutes()).padStart(2, '0');
    const ss_str = String(date_now.getSeconds()).padStart(2, '0');
    const log_line = `${hh_str}:${mn_str}:${ss_str} [${event_tag}] ${event_message}\n`;
    fs.appendFileSync(buildLogPath(), log_line);
    process.stdout.write(log_line);
}

const server_state = {};
module.exports.server_state = server_state;
module.exports.logServerEvent = logServerEvent;

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT'],
    credentials: false
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

const endpoints_dir = path.join(__dirname, 'endpoints');
const endpoint_files = fs.readdirSync(endpoints_dir);

const all_routes = [];
for (let f_idx = 0; f_idx < endpoint_files.length; f_idx = f_idx + 1)
{
    const file_name = endpoint_files[f_idx];
    if (!file_name.startsWith('endpoint_')) continue;
    if (!file_name.endsWith('.js')) continue;

    const route_array = require(path.join(endpoints_dir, file_name));
    if (!Array.isArray(route_array))
    {
        logServerEvent('LOAD_ERROR', `${file_name} did not export an array`);
        continue;
    }

    for (let r_idx = 0; r_idx < route_array.length; r_idx = r_idx + 1)
    {
        all_routes.push(route_array[r_idx]);
    }
    logServerEvent('LOAD', `Loaded ${file_name} (${route_array.length} routes)`);
}

for (let idx = 0; idx < all_routes.length; idx = idx + 1)
{
    const route_def = all_routes[idx];
    const route_path = `/${route_def['routePath']}`;
    const route_type = route_def['routeType'].toLowerCase();
    app[route_type](route_path, route_def['routeMethod']);
    logServerEvent('ROUTE', `${route_def['routeType']} ${route_path}`);
}

app.use(function(err, req, res, next)
{
    logServerEvent('ERROR', `Unhandled middleware error: ${err.message}`);
    return res.status(500).json({ result: 'ERROR', message: 'Internal server error' });
});

const port_number = process.env['PORT'] || 3001;
const server_handle = app.listen(port_number, function()
{
    logServerEvent('START', `Server listening on port ${port_number}`);
});

server_state['server_handle'] = server_handle;
