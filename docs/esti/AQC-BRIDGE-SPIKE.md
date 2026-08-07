# AQC → AORMS bridge spike (D2 tracker)

**Status:** Docs ✅ · Scaffold 🚧 · [AQC](https://github.com/HolagundiWorks/AQC)  
**Canon:** [PORTAL-SYNC-BRIDGE.md](PORTAL-SYNC-BRIDGE.md) · [HUB-API.md](HUB-API.md)  
**Updated:** 2026-08-07

**Licensing:** open source. SaaS commercial terms deferred.

## Checklist

- [x] Add `docs/AORMS-BRIDGE.md` in AQC ([PR #4](https://github.com/HolagundiWorks/AQC/pull/4) merged)  
- [x] Scaffold `BBSDesktop/Aorms.Bridge` (FirmDb · Activate · Flush) — PR open  
- [x] Wire BBSApp `ProjectReference` + `AormsBridgeHost`  
- [ ] Smoke: activate against hub · Flush · portal sees row  
- [ ] Extract shared package for AStudio / AConsulting  
- [ ] Tag AQC baseline commit for forks to pin  

## Build (AQC)

```bat
cd BBSDesktop
dotnet build Aorms.Bridge\Aorms.Bridge.csproj -c Release
```

Env: `ESTI_LICENSE_API_URL`, `ESTI_HUB_URL`, `ESTI_PRODUCT_API_KEY`, `INSTALL_ID`.
