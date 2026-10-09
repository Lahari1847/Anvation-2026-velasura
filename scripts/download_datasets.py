"""Dataset retrieval helper. Source is documented; no silent synthetic substitution."""
import urllib.request
URL='https://www.data.gov.in/resource/stateut-wise-details-solid-waste-management-central-pollution-control-board-cpcb-annual'
print('The listed OGD resource page is recorded in DATA_SOURCES.md. It exposes a small CSV download in the browser, but this helper does not guess its transient file URL.')
print('If downloaded manually, preserve the original under data/raw and record retrieval date and terms in data/metadata/dataset_catalog.csv.')
