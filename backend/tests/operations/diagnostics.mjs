import { performance } from 'node:perf_hooks';

export function observePool(pool) {
  const originalConnect = pool.connect.bind(pool);
  const observed = new WeakSet();
  const phases = {};
  let phase;
  const recordWait = (label, since) => {
    if (label) phases[label].checkoutMs.push(performance.now() - since);
  };
  pool.on('acquire', client => {
    if (observed.has(client)) return;
    observed.add(client);
    const query = client.query.bind(client);
    client.query = (sql, ...parameters) => {
      if (phase) {
        const text = typeof sql === 'string' ? sql : sql.text;
        const kind = /^\s*(\w+)/.exec(text)?.[1]?.toUpperCase() ?? 'OTHER';
        phases[phase].queries++;
        phases[phase].queryKinds[kind] = (phases[phase].queryKinds[kind] ?? 0) + 1;
      }
      return query(sql, ...parameters);
    };
  });
  pool.connect = callback => {
    const label = phase, since = performance.now();
    if (typeof callback === 'function') return originalConnect((error, client, release) => {
      recordWait(label, since); callback(error, client, release);
    });
    return originalConnect().then(client => { recordWait(label, since); return client; });
  };
  const sample = () => {
    if (!phase) return;
    phases[phase].peakWaiting = Math.max(phases[phase].peakWaiting, pool.waitingCount);
    phases[phase].peakConnections = Math.max(phases[phase].peakConnections, pool.totalCount);
  };
  return {
    start(label) {
      phase = label;
      phases[label] = { queries: 0, queryKinds: {}, checkoutMs: [], peakWaiting: 0, peakConnections: 0 };
      sample();
    },
    sample,
    stop(summarize) {
      sample(); phase = undefined;
      return Object.fromEntries(Object.entries(phases).map(([label, values]) => {
        const { checkoutMs, ...counts } = values;
        const latency = checkoutMs.length ? summarize(checkoutMs, 500) : undefined;
        if (latency) { delete latency.pass; delete latency.targetMs; }
        return [label, { ...counts, checkout: latency }];
      }));
    },
  };
}

export async function sqlProfiles(database, tenant, publishedStudies, sessionHash) {
  return database.transaction(tenant.id, tenant.contributorId, async client => {
    let captured;
    await publishedStudies({ query(sql, parameters) { captured = { sql, parameters }; return client.query(sql, parameters); } }, tenant.id);
    const statements = {
      session: { sql: 'SELECT user_id,display_name,csrf_token FROM auth_sessions WHERE token_hash=$1 AND expires_at>now()', parameters: [sessionHash] },
      membership: { sql: 'SELECT capabilities FROM memberships WHERE church_id=$1 AND user_id=$2 AND active', parameters: [tenant.id, tenant.contributorId] },
      publicChurch: { sql: 'SELECT * FROM public_church($1)', parameters: [tenant.slug] },
      publishedStudies: captured,
    };
    const result = {};
    for (const [name, statement] of Object.entries(statements)) {
      const samples = [];
      let plan;
      for (let iteration = 0; iteration < 20; iteration++) {
        const response = await client.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${statement.sql}`, statement.parameters);
        plan = response.rows[0]['QUERY PLAN'][0]; samples.push(plan['Execution Time']);
      }
      samples.sort((left, right) => left - right);
      result[name] = { samples: samples.length, executionMedianMs: samples[Math.floor(samples.length / 2)], executionMaxMs: samples.at(-1), lastPlan: plan };
    }
    return result;
  });
}
