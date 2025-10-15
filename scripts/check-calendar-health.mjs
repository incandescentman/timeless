#!/usr/bin/env node

/**
 * Quick health check for the Timeless calendar load endpoint.
 *
 * Usage:
 *   node scripts/check-calendar-health.mjs
 *   node scripts/check-calendar-health.mjs --endpoint https://example.com/api/calendar-load
 */

import { exit, argv } from 'node:process';

function printHelp() {
  console.log(`Usage: node scripts/check-calendar-health.mjs [--endpoint <url>]

Options:
  --endpoint <url>   Override the calendar load endpoint (defaults to production)
  --help             Show this help message
`);
}

function parseArgs(args) {
  const options = {
    endpoint: 'https://timeless-calendar.vercel.app/api/calendar-load'
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      printHelp();
      exit(0);
    }

    if (arg === '--endpoint') {
      const value = args[i + 1];
      if (!value) {
        console.error('Error: --endpoint flag requires a value.');
        exit(1);
      }
      options.endpoint = value;
      i += 1;
      continue;
    }

    console.error(`Unknown argument: ${arg}`);
    printHelp();
    exit(1);
  }

  return options;
}

async function main() {
  const { endpoint } = parseArgs(argv.slice(2));
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${endpoint}${separator}t=${Date.now()}`;

  console.log(`Checking calendar health via ${url}`);

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
  } catch (error) {
    console.error('Network error while contacting calendar endpoint:');
    console.error(error instanceof Error ? error.message : error);
    exit(1);
  }

  const contentType = response.headers.get('content-type') || '';

  let payload;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (error) {
      console.error('Failed to parse JSON payload from calendar endpoint:');
      console.error(error instanceof Error ? error.message : error);
      exit(1);
    }
  } else {
    const text = await response.text();
    console.error(`Unexpected content-type "${contentType}" from calendar endpoint.`);
    console.error('Response body:', text.slice(0, 500));
    exit(1);
  }

  if (!response.ok) {
    console.error(`Calendar endpoint returned HTTP ${response.status}.`);
    console.error('Payload:', JSON.stringify(payload, null, 2));
    exit(1);
  }

  if (payload?.status === 'error') {
    console.error('Calendar endpoint reported an error status:');
    console.error(JSON.stringify(payload, null, 2));
    exit(1);
  }

  const rawTimestamp = payload?.lastSavedTimestamp;
  const parsedTimestamp = Number.parseInt(rawTimestamp, 10);

  if (!Number.isFinite(parsedTimestamp) || parsedTimestamp <= 0) {
    console.warn('Warning: Missing or invalid lastSavedTimestamp in response.');
  }

  const eventKeys = Object.keys(payload || {}).filter(key => /^\d+_\d+_\d+$/.test(key));
  console.log('Calendar load healthy ✅');
  console.log(`HTTP status: ${response.status}`);
  console.log(`lastSavedTimestamp: ${rawTimestamp ?? 'n/a'}`);
  console.log(`Total days with events: ${eventKeys.length}`);
}

main().catch(error => {
  console.error('Unexpected failure while running health check:');
  console.error(error instanceof Error ? error.stack : error);
  exit(1);
});
