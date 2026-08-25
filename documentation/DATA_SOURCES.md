# Data Sources and Licenses

## Copernicus DEM GLO-30

- **Source**: ESA/Copernicus programme, hosted on the Registry of Open Data on AWS (copernicus-dem-30m bucket)
- **Resolution**: 30 metres
- **Coverage used**: 1-degree tiles N27_E088 and N28_E088 (covering Sikkim and surrounding terrain)
- **License**: CC BY 4.0
- **Attribution required**: Contains modified Copernicus Sentinel data / Copernicus DEM (2022). European Space Agency — https://doi.org/10.5270/ESA-c5d3d65
- **Pipeline**: scripts/build-sikkim-dem.mjs downloads GeoTIFF COGs, merges into the Sikkim bounding box, normalizes to Uint16 metre values, writes public/assets/terrain/sikkim.dem.bin + .json

## NASA Blue Marble imagery

- **Source**: NASA Visible Earth (https://visibleearth.nasa.gov/)
- **Files**: day.jpg, bump.png, water.png, clouds.png (in public/assets/textures/earth/)
- **License**: Public domain (NASA policy)

## Destination photography

- **Source**: Wikimedia Commons
- **License**: CC BY-SA or CC BY (individual file pages list exact license)
- **Files**: 8 images in public/assets/images/destinations/*-1280.jpg
