import { defineStore } from 'pinia';
import * as d3 from 'd3';

export const useStore = defineStore({
  id: 'main',
  state: () => ({
    selectedYear: 2006,
    selectedStates: [],
    brushedStates: [], // States selected by brush
    highlightedState: null, // State highlighted by map click
    personaleIncome: [], // Original state property
    baDegreeOrHigher: [],
    combinedData: [], // Combined income and education data
  }),
  actions: {
    async loadData() {
      const incomeData = await d3.csv('./usa_personal-income-by-state_2006-2019.csv');
      const educationData = await d3.csv('./usa_ba-degree-or-higher_2006-2019.csv');
      
      // Assign data to state after loading
      this.personaleIncome = incomeData;
      this.baDegreeOrHigher = educationData;
      
      // Combine data for easier access
      this.combinedData = incomeData.map(incomeRow => {
        const educationRow = educationData.find(eduRow => eduRow.State === incomeRow.State);
        return {
          state: incomeRow.State,
          income: incomeRow,
          education: educationRow
        };
      });
    },
    changeSelectedYear(year) {
      this.selectedYear = year;
    },
    changeSelectedState(state) {
      this.selectedStates.push(state);
    },
    setBrushedStates(states) {
      this.brushedStates = states;
    },
    setHighlightedState(state) {
      this.highlightedState = state;
    },
    clearHighlight() {
      this.highlightedState = null;
    },
  },
  getters: {
    filteredPersonaleIncome(state) {
      if (!state.personaleIncome) return []; // to handle undefined
      return state.personaleIncome
        .filter(d => state.selectedYear in d)
        .map(d => ({
          state: d.State,
          value: +d[state.selectedYear],
        }));
    },
    filteredBaDegreeOrHigher(state) {
      if (!state.baDegreeOrHigher) return []; // to handle undefined
      return state.baDegreeOrHigher
        .filter(d => state.selectedYear in d)
        .map(d => ({
          state: d.State,
          value: +d[state.selectedYear],
        }));
    },
    currentYearData(state) {
      if (!state.combinedData || state.combinedData.length === 0) return [];
      
      return state.combinedData
        .filter(d => d.income && d.education && state.selectedYear in d.income && state.selectedYear in d.education)
        .map(d => ({
          state: d.state,
          income: +d.income[state.selectedYear],
          education: +d.education[state.selectedYear]
        }));
    },
    bivariateColorScale() {
      // Define 3x3 bivariate color scheme
      return [
        ['#e8e8e8', '#ace4e4', '#5ac8c8'], // Low income
        ['#dfb0d6', '#a5add3', '#5698b9'], // Medium income
        ['#be64ac', '#8c62aa', '#3b4994']  // High income
      ];
    },
  },
});
