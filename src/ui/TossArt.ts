/** Code-drawn artwork, matching the street game's geometric palette. */
export const bagArt = `<svg viewBox="0 0 100 110" aria-hidden="true"><path d="M39 21L34 5 50 13 63 4 58 22Z" fill="#526b63" stroke="#102b2c" stroke-width="3"/><path d="M38 24C28 32 13 48 12 72Q10 98 48 102Q88 103 89 76C89 52 68 33 60 24Z" fill="#304d48" stroke="#102b2c" stroke-width="4"/><path d="M39 35Q21 68 28 85M60 33Q79 63 75 86M49 38L45 89" fill="none" stroke="#698478" stroke-width="5" stroke-linecap="round"/><path d="M36 22L62 23" stroke="#e4c579" stroke-width="6"/><path d="M54 47L66 54 63 64 53 58Z" fill="#b4c4a2" opacity=".65"/></svg>`;

export const compactorArt = `<svg class="toss-truck" viewBox="0 0 600 700" preserveAspectRatio="none" role="img" aria-label="黃色垃圾壓縮車車尾，中央深色投入口">
<defs><linearGradient id="garbage-sky" x2="0" y2="1"><stop stop-color="#2e514e"/><stop offset="1" stop-color="#152c2e"/></linearGradient><linearGradient id="garbage-body" x2="0" y2="1"><stop stop-color="#e8c565"/><stop offset="1" stop-color="#b8883d"/></linearGradient><pattern id="garbage-hazard" width="26" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="26" height="18" fill="#efc35a"/><rect width="13" height="18" fill="#20383a"/></pattern></defs>
<rect width="600" height="700" fill="url(#garbage-sky)"/><path d="M0 95H94V55H155V135H210V78H276V140H338V55H397V125H480V83H600V290H0Z" fill="#3d6054"/><path d="M0 360H600V700H0Z" fill="#243a39"/><path d="M205 390L70 700M395 390L530 700" stroke="#718171" stroke-width="4" opacity=".35"/><path d="M300 460V510M300 570V630" stroke="#a0a17e" stroke-width="5" opacity=".25"/>
<ellipse cx="300" cy="370" rx="223" ry="20" fill="#0b2526" opacity=".7"/>
<rect x="118" y="281" width="49" height="78" rx="9" fill="#101f22"/><rect x="433" y="281" width="49" height="78" rx="9" fill="#101f22"/>
<path d="M122 87Q300 40 478 87L490 303 110 303Z" fill="#142e30" stroke="#112527" stroke-width="8"/>
<path d="M133 91Q300 55 467 91L476 202H124Z" fill="url(#garbage-body)"/>
<path d="M145 99V183M174 91V183M426 91V183M455 99V183" stroke="#96753b" stroke-width="5"/>
<rect x="137" y="99" width="42" height="12" rx="3" fill="#f49b4d"/><rect x="421" y="99" width="42" height="12" rx="3" fill="#f49b4d"/>
<rect x="224" y="110" width="152" height="43" rx="5" fill="#284540"/><text x="300" y="138" text-anchor="middle" fill="#efe2b3" font-size="22" font-family="system-ui" font-weight="bold">垃圾壓縮車</text>
<path d="M118 196L147 300H453L482 196Z" fill="#8e723e" stroke="#b9954b" stroke-width="7"/>
<rect x="193" y="211" width="214" height="93" fill="#0a2022" stroke="#344b43" stroke-width="6"/>
<path d="M194 214L211 230H389L406 214M210 230V284H390V230" fill="#18332f" stroke="#496253" stroke-width="3"/>
<g class="compactor-blade"><path d="M196 213H404V233L196 239Z" fill="#789080" stroke="#182f2e" stroke-width="4"/><path d="M209 218H391" stroke="#bec8a6" stroke-width="3"/></g>
<path d="M139 206L177 307M461 206L423 307" stroke="#c3c7a2" stroke-width="9"/><path d="M134 205L143 229M466 205L457 229" stroke="#4e645d" stroke-width="14"/>
<path d="M148 305H452L473 333H127Z" fill="url(#garbage-hazard)" stroke="#10292b" stroke-width="5"/>
<rect x="116" y="320" width="42" height="15" fill="#ef7252"/><rect x="442" y="320" width="42" height="15" fill="#ef7252"/>
<rect x="170" y="343" width="260" height="10" fill="#779085"/><rect x="265" y="327" width="70" height="22" rx="3" fill="#e8dfb4"/><text x="300" y="343" text-anchor="middle" fill="#25413e" font-family="monospace" font-size="14">CLEAN</text>
</svg>`;
