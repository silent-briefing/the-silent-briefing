export default ({ action }, { env, logger }) => {
  action('items.update', async (meta) => {
    if (meta.collection !== 'officials') return;
    const keys = meta.keys;
    if (!keys?.length) return;

    const workerUrl = env.BACKEND_WORKER_URL ?? 'http://host.docker.internal:8000';
    const serviceKey = env.BACKEND_SERVICE_KEY ?? '';

    for (const officialId of keys) {
      try {
        const res = await fetch(`${workerUrl}/v1/intelligence/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Key': serviceKey,
          },
          body: JSON.stringify({
            official_id: String(officialId),
            trigger: 'cms_edit',
          }),
        });
        logger.info(
          { officialId: String(officialId), status: res.status },
          'LLM refresh POST completed for official',
        );
      } catch (err) {
        logger.error({ err, officialId: String(officialId) }, 'Failed to trigger LLM refresh');
      }
    }
  });
};
