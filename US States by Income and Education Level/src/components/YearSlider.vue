<template>
  <div class="year-slider-container">
    <label for="range-year" class="form-label"><strong>Year Selection</strong></label>
    <div class="slider-wrapper">
      <input 
        id="range-year" 
        v-model="selectedYear" 
        type="range" 
        class="form-range" 
        min="2006" 
        max="2019" 
        step="1"
      />
      <div class="year-labels">
        <span>2006</span>
        <span>2019</span>
      </div>
    </div>
    <div class="selected-year">
      <strong>Selected Year: {{ selectedYear }}</strong>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from '@/stores/store.js'; 

// Access the Pinia store
const store = useStore();

// Computed property for selectedYear, linked to Pinia state
const selectedYear = computed({
  get: () => store.selectedYear,
  set: (val) => store.changeSelectedYear(parseInt(val)),
});
</script>

<style scoped>
.year-slider-container {
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.slider-wrapper {
  position: relative;
  margin: 15px 0;
}

.form-range {
  width: 100%;
  margin-bottom: 10px;
}

.year-labels {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}

.selected-year {
  text-align: center;
  margin-top: 10px;
  font-size: 16px;
  color: #333;
}
</style>
