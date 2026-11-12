const test = require('node:test');
const assert = require('node:assert/strict');
const { isConnectionLossError } = require('./db');

test('isConnectionLossError ignores SQL query/pool timeouts so heavy queries do not trigger reconnect storms', () => {
    assert.equal(isConnectionLossError(new Error('Query timeout expired')), false);
    assert.equal(isConnectionLossError(new Error('Request failed to complete in 60000ms (request timed out)')), false);
    assert.equal(isConnectionLossError(new Error('PendingOperation.abort cancelled')), false);
    const timeoutErr = Object.assign(new Error('Timeout'), { code: 'ETIMEOUT' });
    assert.equal(isConnectionLossError(timeoutErr), false);
});

test('isConnectionLossError detects true socket/connection drops', () => {
    assert.equal(isConnectionLossError(new Error('Connection is closed')), true);
    assert.equal(isConnectionLossError(new Error('No connection is specified')), true);
    assert.equal(isConnectionLossError(Object.assign(new Error('reset'), { code: 'ECONNRESET' })), true);
    assert.equal(isConnectionLossError(Object.assign(new Error('not open'), { code: 'ENOTOPEN' })), true);
});

