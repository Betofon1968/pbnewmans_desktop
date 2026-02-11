// Extracted from App.js to keep domain components isolated.

export default function StatCard({label,value,color}){return/*#__PURE__*/React.createElement("div",{style:{background:'#f9f9f9',border:'1px solid #e8e8e8',borderRadius:'6px',padding:'6px 12px',minWidth:'50px',textAlign:'center'}},/*#__PURE__*/React.createElement("div",{style:{fontSize:'10px',color:'#888',fontWeight:500,marginBottom:'2px'}},label),/*#__PURE__*/React.createElement("div",{style:{fontSize:'16px',fontWeight:600,color}},value));}// ─────────────────────────────────────────────────────────────────────────────────
// RouteCard - Main route display component with stores, pallets, stats
// This is the largest standalone component (~900 lines)
// ─────────────────────────────────────────────────────────────────────────────────
