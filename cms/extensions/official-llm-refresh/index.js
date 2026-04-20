import PanelComponent from './panel.js';

export default {
  id: 'panel-official-llm-refresh',
  name: 'Official Intelligence Refresh',
  icon: 'smart_toy',
  description:
    'Runs the same backend job as saving an official: POST /v1/intelligence/refresh for one official ID. Use on an Insights dashboard when you want a refresh without editing the record.',
  component: PanelComponent,
  options: [
    {
      field: 'official_id',
      type: 'string',
      name: 'Official ID (UUID)',
      meta: {
        interface: 'input',
        width: 'full',
        note:
          'Open Content → Officials → open a person. Copy the id from the address bar (last path segment after /officials/). Paste it here.',
      },
    },
  ],
  minWidth: 14,
  minHeight: 8,
};
