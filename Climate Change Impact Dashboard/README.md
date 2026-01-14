# 🌍 Climate Risk & Investment Dashboard

An interactive dashboard exploring climate risk, environmental spending, and disaster impact across 179+ countries. By combining multiple visual perspectives, users can identify priority regions for climate investment and uncover critical global patterns.

<img width="2535" height="1290" alt="image" src="https://github.com/user-attachments/assets/a14ccf25-0811-4a64-b035-dcb81a937448" />

## 🔍 Key Insights
<b>Underfunded high-risk countries:</b>
<i>High INFORM risk + low environmental spending (priority gaps)</i>

<b>Disaster severity hotspots:</b>
<i>Countries where each disaster affects the most people (≥ 90th percentile)</i>

<b>Triple-threat countries:</b>
<i>High risk, low spend, and high disaster impact (critical cases)</i>

<b>Geographic stress zones:</b>
<i>Spatial clusters of climate stress revealed via a choropleth map</i>

<b>Spending vs. risk imbalance:</b>
<i>Scatterplot highlights countries below expected investment for their risk</i>

<b>Cross-view comparison:</b>
<i>Multi-select countries and compare risk rank, map location, disaster trends, and spending gaps across all views</i>

## 🧩 Dashboard Views
<b>View A: Global Climate Stress Map (Choropleth)</b>
- Purpose: Explore global climate risk by region
- Interactions:
  - Click countries to multi-select
  - Zoom / pan with drag or +/- buttons
  - Reset to full world view

<b>View B: Environmental Spending vs. Risk (Scatter Plot)</b>
- Purpose: Identify priority gap countries
- Key elements:
  - Red dots: Risk ≥ P75 & Spending ≤ P25
  - Dotted lines: Median risk and spending
  - Shaded quadrant: High-risk, low-spend zone
- Interactions:
  - Click to select a country
  - Brush to zoom into regions

<b>View C: Countries by Climate Risk (Bar Chart)</b>
- Purpose: Rank countries by INFORM risk score (2022)
- Interaction:
  - Click bars to select a country (single-select)

<b>View D: Average Disaster Impact (Small Multiples)</b>
- Purpose: Trends in people affected per disaster (2015–2024)
- Visualization:
  - Sparklines per country
  - Color-coded by impact magnitude
- Features:
  - Median reference lines
  - Global percentile coloring (P10–P90)
  - Hover details

## 🎯 Filtering Categories
<b> 1. High Risk + Low Spend (13 countries)</b>
- Data: 105 countries (2015–2022)
- Criteria:
  - Risk ≥ 75th percentile
  - Environmental spending ≤ 25th percentile
- Highlights countries with severe risk but minimal investment

<b>2. High Average Impact (18 countries)</b>
- Data: 179 countries (2015–2024)
- Criteria:
  - Average people affected per disaster ≥ 90th percentile
- Focuses on disaster severity per event

<b>3. Critical / Triple Threat (5 countries)</b>
- Data: 100 countries with all datasets
- Criteria:
  - Risk ≥ P75
  - Spending ≤ P25
  - Impact ≥ P90
- Countries facing all three challenges simultaneously — highest policy priority

🛠 Tech Stack

- D3.js v7 – data visualization
- HTML5 + CSS Grid – layout
- Vanilla JavaScript – state management
- d3-geo-projection – map rendering
