const fs = require('fs');
const path = require('path');

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

async function replyToShutdown(req, res)
{
    logEndpointEvent('SHUTDOWN_REQUEST', 'Graceful shutdown requested via /shutdown');
    res.json({ result: 'SUCCESS', message: 'Server shutting down' });

    setTimeout(function()
    {
        logEndpointEvent('SHUTDOWN', 'Process exiting now');
        process.exit(0);
    }, 150);
}

const apiArray = [];

apiArray.push({
    routeType: 'POST',
    routePath: 'shutdown',
    routeMethod: replyToShutdown,
    routeOptions:
    {
        description: 'Gracefully shut down the Express server.',
        group: 'System',
        sampleParams: {}
    }
});

module.exports = apiArray;
