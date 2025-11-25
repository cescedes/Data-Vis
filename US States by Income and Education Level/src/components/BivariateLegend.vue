<template>
  <div class="legend-container">
    <h5>Legend</h5>
    <div class="bivariate-legend">
      <div class="legend-wrapper">
        <!-- Y-axis labels -->
        <div class="y-labels">
          <div class="y-high">High</div>
          <div class="y-middle">Income</div>
          <div class="y-low">Low</div>
        </div>
        
        <!-- Color grid -->
        <div class="grid-container">
          <div class="legend-grid">
            <div 
              v-for="(row, i) in reversedBivariateColors" 
              :key="`row-${i}`"
              class="legend-row"
            >
              <div 
                v-for="(color, j) in row" 
                :key="`cell-${i}-${j}`"
                class="legend-cell"
                :style="{ backgroundColor: color }"
              ></div>
            </div>
          </div>
          
          <!-- X-axis labels -->
          <div class="x-labels">
            <div class="x-low">Low</div>
            <div class="x-middle">Education</div>
            <div class="x-high">High</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from '@/stores/store.js';

const store = useStore();
const bivariateColors = computed(() => store.bivariateColorScale);

// Reverse the rows to show high income at top, low income at bottom
const reversedBivariateColors = computed(() => {
  return [...bivariateColors.value].reverse();
});
</script>

<style scoped>
.legend-container {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-top: 20px;
}

.bivariate-legend {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.legend-wrapper {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
}

.y-labels {
  display: grid;
  grid-template-rows: auto auto auto;
  height: 96px;
  text-align: center;
  align-items: center;
  justify-content: center;
}

.y-high,
.y-low {
  font-size: 9px;
  color: #999;
  font-weight: 400;
  margin: 15px 0;
}

.y-middle {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  transform: rotate(-90deg);
  white-space: nowrap;
  margin: 4px 0;
}

.grid-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.legend-grid {
  display: grid;
  grid-template-rows: repeat(3, 30px);
  grid-template-columns: repeat(3, 30px);
  gap: 1px;
  border: 2px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background-color: #ddd;
}

.legend-row {
  display: contents;
}

.legend-cell {
  width: 30px;
  height: 30px;
  border: none;
}

.x-labels {
  display: grid;
  grid-template-columns: auto auto auto;
  width: 96px; 
  margin-top: 8px;
  text-align: center;
  align-items: center;
  justify-content: center;
}

.x-low,
.x-high {
  font-size: 9px;
  color: #999;
  font-weight: 400;
  margin: 0 15px;
}

.x-middle {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  white-space: nowrap;
  margin: 0 4px;
}
</style>
