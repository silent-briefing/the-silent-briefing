import { defineComponent, h, ref } from 'vue';
import { useApi } from '@directus/extensions-sdk';

export default defineComponent({
  name: 'OfficialLlmRefreshPanel',
  props: {
    official_id: { type: String, default: '' },
    showHeader: { type: Boolean, default: false },
    width: String,
    height: String,
  },
  setup(props) {
    const api = useApi();
    const busy = ref(false);
    const message = ref('');
    const error = ref('');

    async function runRefresh() {
      const id = (props.official_id ?? '').trim();
      if (!id) {
        error.value =
          'Paste the official id first. Tip: Content → Officials → open someone → copy the UUID at the end of the URL.';
        message.value = '';
        return;
      }
      busy.value = true;
      error.value = '';
      message.value = '';
      try {
        const res = await api.post('/official-intelligence-refresh', {
          official_id: id,
          trigger: 'cms_panel',
        });
        message.value =
          res?.data?.message ??
          (res?.status ? `Request completed (HTTP ${res.status}).` : 'Request completed.');
      } catch (e) {
        const msg =
          e?.response?.data?.errors?.[0]?.message ??
          e?.response?.data?.message ??
          e?.message ??
          String(e);
        error.value = msg;
      } finally {
        busy.value = false;
      }
    }

    return () =>
      h('div', { class: 'official-llm-refresh-panel', style: 'padding:12px' }, [
        h(
          'p',
          { style: 'margin:0 0 8px; color:var(--theme--foreground-subdued); font-size:13px' },
          [
            'This panel is optional. Usually you trigger a refresh by ',
            h('strong', 'editing and saving'),
            ' an official in Content (the llm-refresh-hook runs on save). Use ',
            h('strong', 'Run intelligence refresh'),
            ' when you want that same API call without editing the record. Set ',
            h('strong', 'Official ID (UUID)'),
            ' in the panel configuration (wrench icon on the dashboard). The backend secret never leaves the server.',
          ],
        ),
        h('div', { style: 'margin-top:12px' }, [
          h(
            'v-button',
            {
              loading: busy.value,
              onClick: runRefresh,
            },
            { default: () => 'Run intelligence refresh' },
          ),
        ]),
        message.value
          ? h(
              'v-notice',
              { type: 'success', style: 'margin-top:12px' },
              { default: () => message.value },
            )
          : null,
        error.value
          ? h(
              'v-notice',
              { type: 'danger', style: 'margin-top:12px' },
              { default: () => error.value },
            )
          : null,
      ]);
  },
});
