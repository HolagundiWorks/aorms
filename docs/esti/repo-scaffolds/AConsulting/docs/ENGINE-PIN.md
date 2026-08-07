# Engine + bridge pin (D5)

**Status:** Pin ready · **Updated:** 2026-08-07  
**Upstream:** [HolagundiWorks/AQC](https://github.com/HolagundiWorks/AQC)  
**Baseline:** tag `aorms-bridge-d2`

Same pin as AStudio — share `bbs_engine` + `Aorms.Bridge`; specialize engineering domain UI only.

| Artifact | Consume from |
| --- | --- |
| C++ `bbs_engine` | AQC — single SoT at tag `aorms-bridge-d2` |
| `Aorms.Bridge` | AQC `BBSDesktop/Aorms.Bridge` |
| Wire | esti PORTAL-SYNC-BRIDGE · HUB-API `2026-08` |

```bash
git submodule add https://github.com/HolagundiWorks/AQC.git vendor/AQC
cd vendor/AQC && git checkout aorms-bridge-d2
```

Open source; SaaS licensing deferred.
