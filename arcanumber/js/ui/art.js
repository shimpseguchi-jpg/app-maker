// え
export function zeroKingSvg() {
  return `<svg viewBox="0 0 200 190" xmlns="http://www.w3.org/2000/svg">
    <defs><radialGradient id="zk" cx="40%" cy="35%"><stop offset="0" stop-color="#5b3cc4"/><stop offset=".6" stop-color="#22104f"/><stop offset="1" stop-color="#07020f"/></radialGradient></defs>
    <path d="M30 120 Q6 160 40 184 L64 150 Z" fill="#16082e"/><path d="M170 120 Q194 160 160 184 L136 150 Z" fill="#16082e"/>
    <ellipse cx="100" cy="108" rx="78" ry="74" fill="url(#zk)" stroke="#e3b55b" stroke-width="4"/>
    <ellipse cx="100" cy="108" rx="40" ry="50" fill="none" stroke="#ffd88a" stroke-width="11" opacity=".85"/>
    <polygon points="58,40 70,8 86,32 100,0 114,32 130,8 142,40" fill="#e3b55b" stroke="#8c6d3a" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="16" r="5" fill="#ff4258"/>
    <path d="M60 86 L86 98" stroke="#ff4258" stroke-width="7" stroke-linecap="round"/><path d="M140 86 L114 98" stroke="#ff4258" stroke-width="7" stroke-linecap="round"/>
    <circle cx="78" cy="106" r="8" fill="#ff4258"/><circle cx="122" cy="106" r="8" fill="#ff4258"/>
  </svg>`;
}
export function enemyArt(art) { return art === 'svg:zero' ? zeroKingSvg() : `<span>${art}</span>`; }
