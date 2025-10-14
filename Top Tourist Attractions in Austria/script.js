// dimensions
const margin = {top: 40, right: 10, bottom: 80, left: 100};
const width = 900 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

const svg = d3.select("svg")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

    // load data
d3.csv("austria_most_visited_places_2018.csv").then(data => {
    data.forEach(d => d.Visitors = +d.Visitors); // convert visitors to number

    const x = d3.scaleBand()
            .domain(data.map(d => d.Place))
            .range([0, width])
            .padding(0.6);  

            const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.Visitors)])
            .nice()
            .range([height, 0]);

            //bars
        svg.selectAll(".bar")
            .data(data)
            .enter().append("rect")
            .attr("class", "bar")
            .attr("x", d => x(d.Place))
            .attr("y", d => y(d.Visitors))
            .attr("width", x.bandwidth())
            .attr("height", d => height - y(d.Visitors))

            // x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

            // y-axis
        svg.append("g")
            .call(d3.axisLeft(y));

        // axis labels
        // x-axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("x", width / 2) 
            .attr("y", height + 170)
            .attr("text-anchor", "middle")
            .text("Place");

        // y-axis label
        svg.append("text")
            .attr("class", "axis-label")
            .attr("transform", "rotate(-90)")
            .attr("y", -90)
            .attr("x", -height / 2)
            .attr("text-anchor", "middle")
            .text("Number of Visitors");

        // add labels on top of bars
        svg.selectAll(".label")
            .data(data)
            .enter().append("text")
            .attr("x", d => x(d.Place) + x.bandwidth() / 2)
            .attr("y", d => y(d.Visitors) - 5)
            .attr("text-anchor", "middle")
            .style("fill", "#424242")
            .text(d => d.Visitors.toLocaleString());
    });
