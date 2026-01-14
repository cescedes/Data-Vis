let mapSvg, path, projection, worldFeatures, mapZoom;

function addMapZoomControls() {
  const wrapper = d3.select("#view-b .chart-wrapper");
  let controls = wrapper.select(".map-zoom-controls");

  if (controls.empty()) {
    controls = wrapper.append("div").attr("class", "map-zoom-controls");

    controls.append("button")
      .attr("type", "button")
      .attr("aria-label", "Zoom out")
      .text("-")
      .on("click", () => zoomByFactor(0.85));

    controls.append("button")
      .attr("type", "button")
      .attr("aria-label", "Zoom in")
      .text("+")
      .on("click", () => zoomByFactor(1.15));
  }
}

function zoomByFactor(factor) {
  const svg = d3.select("#view-b svg");
  if (!mapZoom) return;
  svg.transition().duration(180).call(mapZoom.scaleBy, factor);
}

function resetMapZoom() {
  const svg = d3.select("#view-b svg");
  if (!mapZoom) return;
  svg.transition().duration(220).call(mapZoom.transform, d3.zoomIdentity);
}

function adjustChoroplethDimensions(svg) {
  // Keep View B at its default size regardless of mode
  const defaultWidth = +svg.attr("width") || 700;
  const defaultHeight = +svg.attr("height") || 320;
  svg
    .attr("width", defaultWidth)
    .attr("height", defaultHeight)
    .attr("viewBox", `0 0 ${defaultWidth} ${defaultHeight}`)
    .attr("preserveAspectRatio", "xMidYMid slice");
}

function initChoropleth() {
  const svg = d3.select("#view-b svg");
  addMapZoomControls();
  adjustChoroplethDimensions(svg);
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");

  mapSvg = svg.append("g");

  // Add zoom / pan behavior
  mapZoom = d3.zoom()
    .scaleExtent([0.8, 8])
    .on("zoom", (event) => {
      mapSvg.attr("transform", event.transform);
    });

  // Attach zoom; allow free panning for exploration
  svg.call(mapZoom);

  projection = d3.geoNaturalEarth1()
    .fitSize([svgWidth, svgHeight], { type: "Sphere" });

  path = d3.geoPath().projection(projection);

  d3.json("data/world.geojson").then(worldData => {
    // Filter out Antarctica
    worldFeatures = worldData.features.filter(d => {
      const iso = d.properties.ISO_A3_EH || d.properties.ISO_A3;
      return iso !== "ATA";
    });
    updateChoropleth();
  }).catch(err => {
    console.error("Error loading world geojson:", err);
  });
}

function updateChoropleth() {
  if (!worldFeatures) return;

  const svg = d3.select("#view-b svg");
  adjustChoroplethDimensions(svg);
  
  // Clear the old map elements
  mapSvg.selectAll("*").remove();
  
  const svgWidth = +svg.attr("width");
  const svgHeight = +svg.attr("height");
  
  // Recalculate projection with new dimensions and fit to actual features to minimize whitespace
  const featureCollection = { type: "FeatureCollection", features: worldFeatures };
  projection = d3.geoNaturalEarth1()
    .fitSize([svgWidth, svgHeight], featureCollection);
  // reduce scale after fit to ensure full world stays in frame
  projection.scale(projection.scale() * 0.75)
            .translate([svgWidth / 2, svgHeight / 2 - 10]);
  path = d3.geoPath().projection(projection);

  // Constrain panning so the map stays in view
  const bounds = path.bounds(featureCollection);
  const margin = 20;
  const translateExtent = [[bounds[0][0] - margin, bounds[0][1] - margin], [bounds[1][0] + margin, bounds[1][1] + margin]];
  if (mapZoom) {
    mapZoom.translateExtent(translateExtent);
    svg.call(mapZoom.transform, d3.zoomIdentity); // center on load/update
  }

  const countries = mapSvg.selectAll(".country")
    .data(worldFeatures, d => d.properties.ISO_A3_EH || d.properties.ISO_A3);

  // EXIT
  countries.exit().remove();

  // UPDATE
  countries
    .attr("d", path)
    .attr("fill", d => {
      const iso = d.properties.ISO_A3_EH || d.properties.ISO_A3;
      if (!countryData.has(iso)) return "#eee";

      const risk = countryData.get(iso).risk;
      const inSelection = selectedCountries.size === 0 || selectedCountries.has(iso);
      return inSelection ? riskColorScale(risk) : mutedColor;
    })
    .attr("stroke", "#fff")
    .attr("vector-effect", "non-scaling-stroke");

  // ENTER
  countries.enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", d => {
      const iso = d.properties.ISO_A3_EH || d.properties.ISO_A3;
      if (!countryData.has(iso)) return "#eee";
      const risk = countryData.get(iso).risk;
      const inSelection = selectedCountries.size === 0 || selectedCountries.has(iso);
      return inSelection ? riskColorScale(risk) : mutedColor;
    })
    .attr("stroke", "#fff")
    .attr("vector-effect", "non-scaling-stroke")
    .on("click", (event, d) => {
      const iso = d.properties.ISO_A3_EH || d.properties.ISO_A3;
      if (countryData.has(iso)) {
        toggleCountryInMap(iso);
      }
    })
    .append("title")
    .text(d => {
      const iso = d.properties.ISO_A3_EH || d.properties.ISO_A3;
      if (!countryData.has(iso)) return d.properties.ADMIN || d.properties.NAME;
      return `${d.properties.ADMIN || d.properties.NAME}
Risk Score: ${countryData.get(iso).risk}`;
    });
}
