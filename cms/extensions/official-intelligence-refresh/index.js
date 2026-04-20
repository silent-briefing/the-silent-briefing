/**
 * Server-side proxy: POST JSON { official_id, trigger? } -> FastAPI /v1/intelligence/refresh
 * Keeps BACKEND_SERVICE_KEY in env (same pattern as the llm-refresh-trigger extension).
 */
export default {
  id: 'official-intelligence-refresh',
  handler: (router, { env, logger }) => {
    router.post('/', async (req, res) => {
      try {
        if (!req.accountability?.user) {
          return res.status(403).json({ errors: [{ message: 'Forbidden' }] });
        }

        const officialId = req.body?.official_id;
        if (!officialId || typeof officialId !== 'string') {
          return res.status(400).json({ errors: [{ message: 'official_id required' }] });
        }

        const workerUrl = (env.BACKEND_WORKER_URL ?? 'http://host.docker.internal:8000').replace(/\/$/, '');
        const serviceKey = env.BACKEND_SERVICE_KEY ?? '';
        const trigger = typeof req.body?.trigger === 'string' ? req.body.trigger : 'cms_panel';

        const upstream = await fetch(`${workerUrl}/v1/intelligence/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': serviceKey,
          },
          body: JSON.stringify({
            official_id: String(officialId),
            trigger,
          }),
        });

        const text = await upstream.text();
        let body;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          body = { raw: text };
        }

        logger.info(
          { officialId: String(officialId), status: upstream.status },
          'official-intelligence-refresh proxy completed',
        );

        return res.status(upstream.status).json(body ?? { ok: upstream.ok });
      } catch (err) {
        logger.error({ err }, 'official-intelligence-refresh proxy failed');
        return res.status(500).json({ errors: [{ message: 'Proxy failed' }] });
      }
    });
  },
};
