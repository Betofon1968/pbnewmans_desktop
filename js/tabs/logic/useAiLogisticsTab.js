export function useAiLogisticsTab({ React }) {
  const { useState } = React;

  const [aiLogisticsSubTab, setAiLogisticsSubTab] = useState('Pallet Setup');

  return {
    aiLogisticsSubTab,
    setAiLogisticsSubTab
  };
}
