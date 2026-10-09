# Data sources and provenance

## OGD India / CPCB related state-level table

- Name: State/UT-wise Details of Solid Waste Management as per Central Pollution Control Board (CPCB) Annual Report during 2020-21.
- Source: Open Government Data Platform India; the resource page identifies a Rajya Sabha answer source and fields for state/UT, solid waste generated (TPD), collected (TPD), treated (TPD).
- URL: https://www.data.gov.in/resource/stateut-wise-details-solid-waste-management-central-pollution-control-board-cpcb-annual
- Coverage/time: India state/UT aggregate, 2020-21; it is not ward-level route data.
- Retrieved: Resource metadata checked 2026-10-09. Page advertises a 1.3 KB CSV download. A stable downloadable file was not obtained in this environment; no downloaded file is claimed or bundled.
- License: Consult the resource page's current terms and source-specific reuse conditions before redistribution. Catalog records this uncertainty rather than asserting an unverified license.
- Fields: State/UT; generated, collected, and treated tonnes per day. `NA` remains missing; the app does not use this aggregate dataset to seed operational figures.

## OpenStreetMap / Leaflet

- Map library and tile source: https://www.openstreetmap.org/copyright
- Routing engine reference: https://project-osrm.org/docs/
- No road-network extract or OSRM query is bundled or used. The demo's routing estimate uses a transparent Euclidean zone-centre distance proxy, not road distance. The UI labels this limitation.
- If online map tiles are added, comply with OSM attribution and tile usage policy; provide offline-friendly map-empty state.

## Synthetic demo data

Bundled `data/synthetic/*.csv` and the initialized SQLite database contain generated Bengaluru-like illustrative zones, collection amounts, vehicles and sample user accounts. Coordinates are approximate demo anchors, not official boundaries or observed truck/GPS data. Each CSV row includes `synthetic=true`. No official ward, complaint, vehicle, worker, or GPS observations are invented or implied.
