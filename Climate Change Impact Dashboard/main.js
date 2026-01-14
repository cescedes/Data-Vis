let countryData = new Map(); // Global container for harmonized country-level data

// Shared interaction state
let selectedCountries = new Set();
let currentFilterMode = 'critical'; // Track current filter: 'all', 'highImpact', 'highRiskLowSpend', 'critical'

// Risk score color scale
const riskColorScale = d3.scaleSequential()
  .domain([0, 10]) // INFORM Risk typically ranges 0–10
  .interpolator(d3.interpolateYlOrRd);

const highlightColor = "#1f78b4";  // selected
const mutedColor = "#cccccc";      // de-emphasized

// Normalize country labels so long formal names stay compact in charts
const countryNameOverrides = {
  "China, P.R.: Mainland": "China",
  "Ethiopia, The Federal Dem. Rep. of": "Ethiopia",
  "St. Vincent and the Grenadines": "St. Vincent",
  "Antigua and Barbuda": "Antigua & Barbuda",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  "Trinidad and Tobago": "Trinidad & Tobago",
  "São Tomé and Príncipe": "São Tomé",
  "São Tomé and Príncipe, Dem. Rep. of": "São Tomé",
  "Democratic Republic of the Congo": "DR Congo",
  "Central African Republic": "Central African Rep.",
  "Dominican Republic": "Dominican Rep.",
  "United Arab Emirates": "UAE",
  "United Kingdom": "UK",
  "United States": "USA",
  "Lao People's Dem. Rep.": "Laos",
  "Lao People's Democratic Republic": "Laos",
  "Syrian Arab Republic": "Syria",
  "Venezuela, Republica Bolivariana de": "Venezuela",
  "Venezuela, Rep. Bolivariana de": "Venezuela",
  "Iran, Islamic Rep. of": "Iran",
  "Afghanistan, Islamic Rep. of": "Afghanistan",
  "Mauritania, Islamic Rep. of": "Mauritania",
  "Korea, Republic of": "South Korea",
  "Korea, Dem. People's Rep. of": "North Korea",
  "Russian Federation": "Russia",
  "The former Yugoslav Rep. of Macedonia": "North Macedonia",
  "North Macedonia, Republic of": "North Macedonia",
  "Micronesia, Federated States of": "Micronesia",
  "Marshall Islands, Rep. of the": "Marshall Islands",
  "Sint Maarten, Kingdom of the Netherlands": "Sint Maarten",
  "Saint Martin (French Part)": "Saint Martin",
  "United States Virgin Islands": "US Virgin Islands"
};

function normalizeCountryName(name) {
  if (!name) return name;
  const trimmed = name.trim();
  if (countryNameOverrides[trimmed]) return countryNameOverrides[trimmed];
  const commaIndex = trimmed.indexOf(",");
  if (commaIndex !== -1) return trimmed.slice(0, commaIndex).trim();
  return trimmed;
}

// Load all datasets in parallel
Promise.all([
  d3.csv("data/15_Climate-driven_INFORM_Risk.csv"),
  d3.csv("data/14_Climate-related_Disasters_Frequency.csv"),
  d3.csv("data/08_Environmental_Protection_Expenditures.csv")
]).then(initializeData).catch(err => {
  console.error("Error loading data:", err);
  alert("Failed to load data. Check console for details.");
});

function initializeData([
  riskData,
  disasterData,
  expenditureData
]) {

  // 1. PROCESS INFORM RISK DATA 

  riskData.forEach(d => {
    const iso = d.ISO3;
    if (!iso) return;

    // Only process the main INFORM Risk Indicator row
    if (!d.Indicator || !d.Indicator.includes("INFORM Risk Indicator")) return;

    // Get latest year's value
    let latestRisk = null;
    for (let year = 2022; year >= 2013; year--) {
      if (d[year.toString()]) {
        latestRisk = +d[year.toString()];
        break;
      }
    }

    if (latestRisk === null) return;

    countryData.set(iso, {
      iso: iso,
      country: normalizeCountryName(d.Country),
      risk: latestRisk,
      disasters: [],
      expenditures: []
    });
  });

  // 2. PROCESS CLIMATE DISASTER DATA 
  // track both number of disasters and people affected to calculate impact per disaster

  const disasterCountsByCountry = {};
  const peopleAffectedByCountry = {};
  
  disasterData.forEach(d => {
    const iso = d.ISO3;
    if (!countryData.has(iso)) return;

    const indicator = d.Indicator || "";
    
    // Process disaster counts
    if (indicator.includes("Number of Disasters: TOTAL")) {
      if (!disasterCountsByCountry[iso]) {
        disasterCountsByCountry[iso] = {};
      }
      for (let year = 1980; year <= 2024; year++) {
        const yearStr = year.toString();
        const value = d[yearStr];
        if (value && value !== "") {
          disasterCountsByCountry[iso][yearStr] = (disasterCountsByCountry[iso][yearStr] || 0) + parseFloat(value);
        }
      }
    }
    
    // Process people affected
    if (indicator.includes("Number of People Affected: TOTAL")) {
      if (!peopleAffectedByCountry[iso]) {
        peopleAffectedByCountry[iso] = {};
      }
      for (let year = 1980; year <= 2024; year++) {
        const yearStr = year.toString();
        const value = d[yearStr];
        if (value && value !== "") {
          peopleAffectedByCountry[iso][yearStr] = (peopleAffectedByCountry[iso][yearStr] || 0) + parseFloat(value);
        }
      }
    }
  });

  // Calculate average impact per disaster (people affected / number of disasters) for each year
  Object.keys(disasterCountsByCountry).forEach(iso => {
    const countryRecord = countryData.get(iso);
    if (!countryRecord) return;
    
    const disasterCounts = disasterCountsByCountry[iso];
    const peopleAffected = peopleAffectedByCountry[iso] || {};
    
    Object.keys(disasterCounts).forEach(yearStr => {
      const year = +yearStr;
      const numDisasters = disasterCounts[yearStr];
      const numPeople = peopleAffected[yearStr] || 0;
      
      // Calculate average impact per disaster (avoid division by zero)
      const avgImpact = numDisasters > 0 ? numPeople / numDisasters : 0;
      
      countryRecord.disasters.push({
        year: year,
        count: avgImpact  // Now storing average people affected per disaster
      });
    });
    countryRecord.disasters.sort((a, b) => a.year - b.year);
  });


  // 3. PROCESS ENVIRONMENTAL EXPENDITURES

  expenditureData.forEach(d => {
    const iso = d.ISO3;
    if (!countryData.has(iso)) return;

    // Only process the main environment protection indicator as Percent of GDP
    const indicator = d.Indicator || "";
    const unit = d.Unit || "";
    const isMainIndicator = indicator === "Expenditure on environment protection" && unit === "Percent of GDP";
    
    if (isMainIndicator) {
      const countryRecord = countryData.get(iso);

      for (let year = 1995; year <= 2022; year++) {
        const yearStr = year.toString();
        const value = d[yearStr];
        if (value && value !== "") {
          const parsedValue = parseFloat(value);
          if (!isNaN(parsedValue) && parsedValue !== 0) {
            countryRecord.expenditures.push({
              year: +yearStr,
              value: parsedValue
            });
          }
        }
      }
    }
  });

  console.log("Harmonized country data:", countryData);
  console.log(`✓ Total countries loaded: ${countryData.size}`);
  const countriesWithDisasters = Array.from(countryData.values()).filter(c => c.disasters.length > 0).length;
  const countriesWithExpenditure = Array.from(countryData.values()).filter(c => c.expenditures.length > 0).length;
  console.log(`✓ Countries with disaster data: ${countriesWithDisasters}`);
  console.log(`✓ Countries with expenditure data: ${countriesWithExpenditure}`);

  // Default selection: Critical subset
  const subsets = computeRiskSpendDisasterSubsets(Array.from(countryData.values()));
  const defaultSelection = subsets.critical.isos;
  selectedCountries = new Set(defaultSelection);
  console.log(`✓ Pre-selected Critical (${defaultSelection.length} countries)`);

  // Moving to visualization step
  initDashboard();
  
  function initDashboard() {
    // Ensure wrappers reflect current mode (critical by default)
    updateWrapperLayout();
    initRiskRanking();
    initChoropleth();
    initDisasterTrends();
    initExpenditureRisk();
    updateSummaryPanel(); // Initialize summary panel on load
  }
}

function getRiskExtent() {
  return d3.extent(
    Array.from(countryData.values()),
    d => d.risk
  );
}

function getExpenditureExtent() {
  return d3.extent(
    Array.from(countryData.values())
      .flatMap(d => d.expenditures.map(e => e.value))
  );
}

function getYearExtent() {
  return d3.extent(
    Array.from(countryData.values())
      .flatMap(d => d.disasters.map(e => e.year))
  );
}

function updateAllViews() {
  updateRiskRanking();
  updateChoropleth();
  updateDisasterTrends();
  updateExpenditureRisk();
  // Toggle scrollable wrappers for A and C based on filter mode
  updateWrapperLayout();
  updateSummaryPanel();

  // If we're back to "all" with no selection, ensure map is fully zoomed out
  if (currentFilterMode === 'all' && selectedCountries.size === 0 && typeof resetMapZoom === 'function') {
    resetMapZoom();
  }
}

// Selecting a country should focus on that country only (across all views).
// If the same country is clicked again while it is the sole selection, clear back to "all".
function toggleCountrySelection(iso) {
  const isSoleSelection = selectedCountries.size === 1 && selectedCountries.has(iso);
  if (isSoleSelection) {
    selectedCountries.clear();
    currentFilterMode = 'all';
  } else {
    selectedCountries = new Set([iso]);
    currentFilterMode = 'all';
  }
  updateAllViews();
}

// Map-specific toggle: add/remove country to compare with others
function toggleCountryInMap(iso) {
  if (selectedCountries.has(iso)) {
    selectedCountries.delete(iso);
    if (selectedCountries.size === 0) {
      currentFilterMode = 'all';
    }
  } else {
    selectedCountries.add(iso);
    currentFilterMode = 'all';
  }
  updateAllViews();
}

function resetSelection() {
  selectedCountries.clear();
  currentFilterMode = 'all';
  updateAllViews();
  if (typeof resetMapZoom === 'function') {
    resetMapZoom();
  }
}
// Toggle the scrollable wrapper class for Views A and C
function updateWrapperLayout() {
  try {
    const wrapperA = document.querySelector('#view-a .chart-wrapper');
    const wrapperC = document.querySelector('#view-c .chart-wrapper');
    if (!wrapperA || !wrapperC) return;

    if (currentFilterMode === 'all') {
      wrapperA.classList.add('scrollable');
      wrapperC.classList.add('scrollable');
    } else {
      wrapperA.classList.remove('scrollable');
      wrapperC.classList.remove('scrollable');
      // Clear any inline heights if previously set by browser
      wrapperA.style.height = '';
      wrapperC.style.height = '';
    }
  } catch (e) {
    console.warn('Wrapper layout toggle failed:', e);
  }
}

function updateSummaryPanel() {
  const panel = d3.select("#summary-panel");
  panel.selectAll("*").remove();

  // Calculate key findings
  const allData = Array.from(countryData.values());
  const subsets = computeRiskSpendDisasterSubsets(allData);

  const makeButton = (cls, label, value, onClick, tooltip) => {
    panel.append("button")
      .attr("class", `summary-card ${cls}`)
      .attr("type", "button")
      .attr("title", tooltip)
      .on("click", onClick)
      .html(`<div class="label">${label}</div><div class="value">${value}</div>`);
  };

  // High risk + low spend
  makeButton(
    "priority",
    "High Risk + Low Spend",
    subsets.highRiskLowSpend.isos.length,
    () => {
      selectedCountries = new Set(subsets.highRiskLowSpend.isos);
      currentFilterMode = 'highRiskLowSpend';
      updateAllViews();
    },
    "Risk ≥ 75th percentile & Environmental spend ≤ 25th percentile"
  );

  // High average impact
  makeButton(
    "disaster",
    "High Average Impact",
    subsets.highImpact.isos.length,
    () => {
      selectedCountries = new Set(subsets.highImpact.isos);
      currentFilterMode = 'highImpact';
      updateAllViews();
    },
    "Average people affected per disaster ≥ 90th percentile"
  );

  // Critical subset
  makeButton(
    "critical",
    "⚠️ CRITICAL: High Risk + Low Spend + High Impact",
    subsets.critical.isos.length,
    () => {
      selectedCountries = new Set(subsets.critical.isos);
      currentFilterMode = 'critical';
      updateAllViews();
    },
    "All three conditions: High risk, low spending, high disaster impact"
  );
}

function getLast10YearExpenditureAvg(expenditures) {
  if (!expenditures || expenditures.length === 0) return null;
  // Filter for years 2015-2022 inclusive
  const filtered = expenditures.filter(e => e.year >= 2015 && e.year <= 2022);
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, e) => sum + e.value, 0) / filtered.length;
}

function computeRiskSpendDisasterSubsets(allData) {
  const dataWithExpenditure = allData
    .filter(d => {
      if (!d.risk || isNaN(d.risk)) return false;
      if (!d.expenditures || d.expenditures.length === 0) return false;
      const avg = getLast10YearExpenditureAvg(d.expenditures);
      return avg !== null;
    })
    .map(d => ({
      iso: d.iso,
      risk: d.risk,
      expenditure: getLast10YearExpenditureAvg(d.expenditures)
    }));

  // Filter to only countries with disasters in 2015-2024
  const dataWithDisasters = allData
    .filter(d => {
      if (!d.risk || isNaN(d.risk)) return false;
      if (!d.disasters || d.disasters.length === 0) return false;
      const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
      return disastersInRange.length > 0;
    })
    .map(d => {
      const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
      const totalImpact = disastersInRange.reduce((sum, x) => sum + x.count, 0);
      const avgImpact = totalImpact / disastersInRange.length;
      return {
        iso: d.iso,
        country: d.country,
        risk: d.risk,
        disasters: d.disasters,
        disasterCount: totalImpact,
        avgImpact
      };
    });

  const riskP75Exp = dataWithExpenditure.length > 0
    ? d3.quantile(dataWithExpenditure.map(d => d.risk).sort(d3.ascending), 0.75)
    : null;
  const expP25 = dataWithExpenditure.length > 0
    ? d3.quantile(dataWithExpenditure.map(d => d.expenditure).sort(d3.ascending), 0.25)
    : null;

  // Percentiles for average disaster impact to capture high-impact countries
  const impactP75 = dataWithDisasters.length > 0
    ? d3.quantile(dataWithDisasters.map(d => d.avgImpact).sort(d3.ascending), 0.75)
    : null;
  const impactP90 = dataWithDisasters.length > 0
    ? d3.quantile(dataWithDisasters.map(d => d.avgImpact).sort(d3.ascending), 0.90)
    : null;

  const highRiskLowSpendIsos =
    riskP75Exp !== null && expP25 !== null
      ? dataWithExpenditure.filter(d => d.risk >= riskP75Exp && d.expenditure <= expP25).map(d => d.iso)
      : [];

  // Countries with high average disaster impact (90th percentile)
  const highImpactIsos =
    impactP90 !== null
      ? dataWithDisasters.filter(d => d.avgImpact >= impactP90).map(d => d.iso)
      : [];

  const dataComplete = allData.filter(d =>
    !isNaN(d.risk) &&
    d.disasters && d.disasters.length > 0 &&
    d.expenditures && d.expenditures.length > 0
  ).map(d => {
    const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
    const totalImpact = disastersInRange.reduce((sum, x) => sum + x.count, 0);
    return {
      iso: d.iso,
      risk: d.risk,
      disasters: d.disasters,
      expenditure: getLast10YearExpenditureAvg(d.expenditures),
      avgImpact: totalImpact / disastersInRange.length
    };
  }).filter(d => d.expenditure !== null);

  // Critical: Use GLOBAL percentiles for all three dimensions (risk, expenditure, impact)
  // This ensures Kenya and all other countries are consistently evaluated
  const criticalIsos =
    riskP75Exp !== null && expP25 !== null && impactP90 !== null
      ? dataComplete.filter(d => {
          return d.risk >= riskP75Exp && d.expenditure <= expP25 && d.avgImpact >= impactP90;
        }).map(d => d.iso)
      : [];

  return {
    highRiskLowSpend: { isos: highRiskLowSpendIsos },
    highImpact: { isos: highImpactIsos },
    critical: { isos: criticalIsos }
  };
}

// Debug: Log subset details
if (typeof window !== 'undefined') {
  window.debugSubsets = function() {
    const allData = Array.from(countryData.values());
    const subsets = computeRiskSpendDisasterSubsets(allData);
    
    console.log("=== HIGH RISK + LOW SPEND ===");
    subsets.highRiskLowSpend.isos.forEach(iso => {
      const d = countryData.get(iso);
      console.log(`${iso} (${d.country}): Risk=${d.risk.toFixed(2)}`);
    });
    
    console.log("\n=== HIGH AVERAGE IMPACT ===");
    subsets.highImpact.isos.forEach(iso => {
      const d = countryData.get(iso);
      const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
      const totalImpact = disastersInRange.reduce((sum, x) => sum + x.count, 0);
      const avgImpact = totalImpact / disastersInRange.length;
      console.log(`${iso} (${d.country}): AvgImpact=${avgImpact.toFixed(0)}`);
    });
    
    console.log("\n=== CRITICAL (All 3 conditions) ===");
    subsets.critical.isos.forEach(iso => {
      const d = countryData.get(iso);
      const disastersInRange = d.disasters.filter(x => x.year >= 2015 && x.year <= 2024);
      const totalImpact = disastersInRange.reduce((sum, x) => sum + x.count, 0);
      const avgImpact = totalImpact / disastersInRange.length;
      const expenditure = getLast10YearExpenditureAvg(d.expenditures);
      console.log(`${iso} (${d.country}): Risk=${d.risk.toFixed(2)}, Exp=${expenditure.toFixed(3)}%, Impact=${avgImpact.toFixed(0)}`);
    });
  };
}
