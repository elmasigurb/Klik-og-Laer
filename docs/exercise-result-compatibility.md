# Exercise result bridge compatibility

Phase 2 covers the 36 HTML files currently linked to exercise rows. Compatibility is bound to both the exercise ID and the full audited SHA-256 HTML signature. A replacement or edited file is unsupported until its adapter is reviewed and its signature is updated. The table shows shortened signature prefixes for readability.

“Pass” means the adapter has an automated final-result fixture covering the final container, raw earned/possible extraction, the 80% raw threshold, intermediate-result rejection, retry handling, and strict message validation. The two writing exercises additionally test their existing writing and self-assessment gate.

| Exercise | Family | Final / score element | Raw score | SHA-256 prefix | Test |
|---|---|---|---:|---|---|
| Orðflokkagreining | Bulk-submit | `#result` / `#summary` | /40 | `dbacf049b49f` | Pass |
| Blandað verkefni úr sögnum | Bulk-submit | `#results` / `#score` | /30 | `2865c292a3c1` | Pass |
| Lýsingarháttur þátíðar | Bulk-submit | `#results` / `#score` | /30 | `31e5a4f08ea5` | Pass |
| Núþálegar sagnir | Sequential | `#result` / `#resultScore` | /30 | `1d0ca88096e2` | Pass |
| Óreglulegar beygingar sagnorða | Bulk-submit | `#result` / `#score` | /30 | `835c32a49de6` | Pass |
| Regluleg beyging sagnorð | Bulk-submit | `#results` / `#summary` | /30 | `81e5d41aef63` | Pass |
| Boðháttur sagna | Bulk-submit | `#results` / `#score` | /30 | `33227938ba1e` | Pass |
| Sagnorð- nútíð/þátíð/nafnháttur | Sequential | `#result` / `#resultText` | /30 | `274580032e75` | Pass |
| Forsetningar- erfiðari æfing | Sequential | `#results` / `#resultInfo` | /25 | `9dc1cf7fbeb5` | Pass |
| Forsetningar | Sequential | `#results` / `#summary` | /25 | `f008cac87289` | Pass |
| Tímaorð og tímasetningar | Sequential | `#results` / `#resultText` | /25 | `7767f0a1b364` | Pass |
| Töluorð | Sequential | `#result` / `#score` | /25 | `141a5d393e42` | Pass |
| Lýsingarorð-blönduð æfing | Multi-stage | `#results` / `#resultSummary` | /35 | `a367e5f540d0` | Pass |
| Nafnorð-blönduð æfing | Multi-stage | `#finish` / `#summary` | /35 | `c3e230c9dd44` | Pass |
| Blandað verkefni-öll fornöfn | Multi-stage | `#result` / `#scoreLine` | /35 | `df606c66e279` | Pass |
| Óákveðin fornöfn | Sequential | `#result` / `#resultText` | /25 | `c000c9d964a7` | Pass |
| Spurnarfornöfn | Sequential | `#results` / `#score` | /25 | `b5de20b892f7` | Pass |
| Afturbeygð fornöfn | Sequential | `#result` / `#scoreText` | /25 | `77f38ce912a0` | Pass |
| Eignarfornöfn | Sequential | `#results` / `#resultText` | /25 | `b3fda4c5bcb5` | Pass |
| Ábendingarfornöfn | Sequential | `#result` / `#resultText` | /25 | `ac1887fdb2c0` | Pass |
| Persónufornöfn/personlige pronominer | Sequential | `#finish` / `#result` | /25 | `41c0698c1ab2` | Pass |
| Ákveðinn háttur lýsingarorða | Sequential | `#results` / `#resultText` | /25 | `53e364556b74` | Pass |
| Eintala og fleirtala lýsingarorða | Sequential | `#result` / `#resultBody` | /25 | `df2c426d9dcb` | Pass |
| Stigbreyting lýsingarorða | Sequential | `#results` / `#resultText` | /25 | `112104f5ce72` | Pass |
| Endingar lýsingarorða | Sequential | `#result` / `#score` | /25 | `89b25df579dd` | Pass |
| Eignarfall nafnorða | Bulk-submit | `#resultPanel` / `#resultText` | /25 | `bee5363fe27a` | Pass |
| Eintala/fleirtala nafnorða | Bulk-submit | `#result` / `#score` | /25 | `c1ff27e506e4` | Pass |
| Ákveðinn og óákveðinn greinir nafnorða | Multi-stage | `#result` / `#result` | /30 | `26a676e5bcb2` | Pass |
| Nafnorð en/et | Multi-stage | `#finalscore` / `#finalscore` | /30 | `db287c10aa96` | Pass |
| Boðháttur- fyrir lengra komna | Bulk-submit | `#result` / `#result` | /24 | `48b9c0e4abd0` | Pass |
| Finnið boðháttinn í setningunum | Sequential | `#results` / `#summary` | /25 | `13fb7c011d60` | Pass |
| Náðu tökum á reglunum | Sequential | `#results` / `#score` | /25 | `7619cb68ac67` | Pass |
| Orðaævintýri | Multi-stage/points | `#result` / `#resultText` | /250 | `66f3bb91f578` | Pass |
| Ritun- hverdagen | Composite writing | `#result` / `#result` | /10 + writing gate | `7abe9efef174` | Pass |
| Ritunaræfing | Composite writing | `#result` / `#result` | /10 + writing gate | `7abe9efef174` | Pass |
| Ákveðin/óákveðin nafnorð í eintölu og fleirtölu | Bulk-submit | `#result` / `#result` | /30 | `505485ef7a0f` | Pass |

The unlinked legacy HTML file is intentionally excluded. No adapter reads progress bars, counters, per-question feedback, or certificate-only output as its final score source.
