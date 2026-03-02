import crypto from 'node:crypto';
import { exec } from 'node:child_process';
import fs from 'node:fs/promises';

const region = process.env.AWS_REGION || 'us-east-1';
const userPoolId = process.env.COGNITO_USER_POOL_ID || 'us-east-1_AWq14lBGV';
const clientId = process.env.COGNITO_CLIENT_ID || '5numi4223d3jnebrlfqboseu42';
const appBase = process.env.APP_BASE_URL || 'https://app.chess-chat.com';
const summaryPath = process.env.E2E_SUMMARY_PATH || '';

function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { maxBuffer: 1024 * 1024 * 10 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(`cmd failed: ${cmd}\n${stderr || stdout}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function awsJson(args) {
  const out = await run(`aws ${args} --output json`);
  if (!out) {
    return {};
  }
  return JSON.parse(out);
}

async function ensureUser(username, email, password) {
  try {
    await awsJson(`cognito-idp admin-get-user --user-pool-id ${userPoolId} --username ${username} --region ${region}`);
  } catch {
    await awsJson(`cognito-idp admin-create-user --user-pool-id ${userPoolId} --username ${username} --user-attributes Name=email,Value=${email} Name=email_verified,Value=true --message-action SUPPRESS --region ${region}`);
  }

  await awsJson(`cognito-idp admin-set-user-password --user-pool-id ${userPoolId} --username ${username} --password '${password}' --permanent --region ${region}`);
}

async function deleteUser(username) {
  await awsJson(`cognito-idp admin-delete-user --user-pool-id ${userPoolId} --username ${username} --region ${region}`);
}

async function login(username, password) {
  const auth = await awsJson(`cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id ${clientId} --auth-parameters USERNAME=${username},PASSWORD='${password}' --region ${region}`);
  return {
    accessToken: auth.AuthenticationResult.AccessToken,
    idToken: auth.AuthenticationResult.IdToken
  };
}

async function apiGet(path, token) {
  const res = await fetch(`${appBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET ${path} failed ${res.status}: ${text}`);
  }
  return JSON.parse(text);
}

function connectWs(token) {
  const appUrl = new URL(appBase);
  const wsProtocol = appUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${appUrl.host}/ws?token=${encodeURIComponent(token)}`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const timer = setTimeout(() => reject(new Error('ws timeout')), 10000);
    ws.onopen = () => {
      clearTimeout(timer);
      resolve(ws);
    };
    ws.onerror = (err) => {
      clearTimeout(timer);
      reject(err);
    };
  });
}

function waitForEvent(ws, expectedTypes, timeoutMs = 15000) {
  const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ws.removeEventListener('message', onMessage);
      reject(new Error(`timeout waiting for ${types.join(',')}`));
    }, timeoutMs);

    function onMessage(event) {
      const payload = JSON.parse(event.data);
      if (types.includes(payload.type)) {
        clearTimeout(t);
        ws.removeEventListener('message', onMessage);
        resolve(payload);
      }
    }

    ws.addEventListener('message', onMessage);
  });
}

function send(ws, type, payload = {}) {
  ws.send(JSON.stringify({ type, ...payload }));
}

async function main() {
  const createdUsers = [];
  try {
    const stamp = Date.now();
    const userA = `e2e_a_${stamp}@example.com`;
    const userB = `e2e_b_${stamp}@example.com`;
    const pass = `E2e!Passw0rd${String(stamp).slice(-2)}`;
    const room = crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 5);

    console.log('Creating test users...');
    await ensureUser(userA, userA, pass);
    createdUsers.push(userA);
    await ensureUser(userB, userB, pass);
    createdUsers.push(userB);

    console.log('Logging in users...');
    const authA = await login(userA, pass);
    const authB = await login(userB, pass);

    console.log('Ensuring app user rows exist via /api/me ...');
    const meA = await apiGet('/api/me', authA.accessToken);
    const meB = await apiGet('/api/me', authB.accessToken);
    const subA = meA.user.user_id;
    const subB = meB.user.user_id;

    console.log('Connecting websocket clients...');
    const wsA = await connectWs(authA.accessToken);
    const wsB = await connectWs(authB.accessToken);

    const seenA = [];
    const seenB = [];
    wsA.addEventListener('message', (e) => {
      const p = JSON.parse(e.data);
      seenA.push(p.type);
      console.log('[A]', p.type);
    });
    wsB.addEventListener('message', (e) => {
      const p = JSON.parse(e.data);
      seenB.push(p.type);
      console.log('[B]', p.type);
    });

    console.log(`Joining room ${room} ...`);
    send(wsA, 'join_room', { roomCode: room });
    await waitForEvent(wsA, 'room_joined');

    send(wsB, 'join_room', { roomCode: room });
    await waitForEvent(wsB, 'room_joined');

    await Promise.all([
      waitForEvent(wsA, 'video_ready', 20000),
      waitForEvent(wsB, 'video_ready', 20000)
    ]);

    console.log('Starting game ...');
    send(wsA, 'start_game', { roomCode: room });
    const started = await waitForEvent(wsA, 'game_started', 20000);

    const white = started.whitePlayerId;
    const black = started.blackPlayerId;
    const wsWhite = white === subA ? wsA : wsB;
    const wsBlack = black === subA ? wsA : wsB;

    console.log(`Game started: white=${white === subA ? 'A' : 'B'} black=${black === subA ? 'A' : 'B'}`);

    send(wsWhite, 'make_move', { roomCode: room, move: 'e2e4' });
    await Promise.all([
      waitForEvent(wsA, 'move_made', 20000),
      waitForEvent(wsB, 'move_made', 20000)
    ]);

    console.log('Resigning from black ...');
    const waitEndedA = waitForEvent(wsA, 'game_ended', 20000);
    const waitEndedB = waitForEvent(wsB, 'game_ended', 20000);
    send(wsBlack, 'resign', { roomCode: room });
    const [endedA, endedB] = await Promise.all([waitEndedA, waitEndedB]);

    console.log('Requesting and declining rematch ...');
    const waitRematchRequestedA = waitForEvent(wsA, 'rematch_requested', 20000);
    const waitRematchRequestedB = waitForEvent(wsB, 'rematch_requested', 20000);
    send(wsA, 'request_rematch', { roomCode: room });
    await Promise.all([waitRematchRequestedA, waitRematchRequestedB]);

    const waitRematchDeclinedA = waitForEvent(wsA, 'rematch_declined', 20000);
    const waitRematchDeclinedB = waitForEvent(wsB, 'rematch_declined', 20000);
    send(wsB, 'respond_rematch', { roomCode: room, accept: false });
    await Promise.all([waitRematchDeclinedA, waitRematchDeclinedB]);

    console.log('Fetching history ...');
    const historyA = await apiGet('/api/history', authA.accessToken);
    const historyB = await apiGet('/api/history', authB.accessToken);

    const foundA = (historyA.games || []).find((g) => g.room_code === room);
    const foundB = (historyB.games || []).find((g) => g.room_code === room);

    wsA.close();
    wsB.close();

    if (!foundA || !foundB) {
      throw new Error('Game not found in one or both user histories');
    }

    const summary = {
      room,
      resultA: endedA.result,
      resultB: endedB.result,
      winnerA: endedA.winner,
      winnerB: endedB.winner,
      historyFoundA: Boolean(foundA),
      historyFoundB: Boolean(foundB),
      eventCounts: { A: seenA.length, B: seenB.length }
    };

    console.log('E2E_PASS');
    console.log(JSON.stringify(summary, null, 2));

    if (summaryPath) {
      await fs.writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
    }
    return summary;
  } finally {
    for (const username of createdUsers) {
      try {
        await deleteUser(username);
        console.log(`Deleted test user ${username}`);
      } catch (cleanupError) {
        console.warn(`Cleanup warning for ${username}: ${cleanupError.message}`);
      }
    }
  }
}

main().catch((err) => {
  console.error('E2E_FAIL', err.message);
  process.exit(1);
});
