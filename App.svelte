
<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    
    let geojsondata;
    let csvdata;
    
    onMount(async () => {
        // Load geoJSON and CSV data
        const geojsonPromise = d3.json('/county.geojson');
        const csvPromise = d3.csv('/county_rate.csv');
        const [geojsonResult, csvResult] = await Promise.all([geojsonPromise, csvPromise]);
    
        let dataMap = new Map(csvResult.map(item => {
        return [item.County, [item.County_Rate, item.Cancer, item.Diabetes, item.Heart, item.Liver, item.Total_Population]];
    }));

        // Merge properties with GeoJSON features
        geojsonResult.features.forEach(feature => {
        const countyName = feature.properties.CountyName;
        const deathRate = dataMap.get(countyName)[0];
        const cancer = dataMap.get(countyName)[1];
        const diabetes = dataMap.get(countyName)[2];
        const heart = dataMap.get(countyName)[3];
        const liver = dataMap.get(countyName)[4];
        const population = dataMap.get(countyName)[5];

        feature.properties.deathRate = deathRate ? parseFloat(deathRate) : 0;
        feature.properties.cancer = cancer ? parseInt(cancer) : 0;
        feature.properties.diabetes = diabetes ? parseInt(diabetes) : 0;
        feature.properties.heart = heart ? parseInt(heart) : 0;
        feature.properties.liver = liver ? parseInt(liver) : 0; // Assign death rate or 0 if not found
        feature.properties.population = population ? parseInt(population) : 0;
    
    });

    
    
        geojsondata = geojsonResult;
        csvdata = csvResult;

        console.log(csvdata.map(d => d.County_Rate));
    
        // Setup the SVG canvas
        const width = 1200, height = 650 ;
        const svg = d3.select("#map").append("svg")
            .attr("width", width)
            .attr("height", height);
    
        const g = svg.append("g");
        // Setup projection and path generator
        const projection = d3.geoMercator().fitSize([width, height], geojsondata);
        const path = d3.geoPath().projection(projection);




    const colorScale = d3.scaleLinear()
    .domain([0, 5, 10, 15, 20])  // Input domain breaks
    .range(['#f7fbff', '#deebf7', '#9ecae1', '#4292c6', '#08306b'])  // Corresponding colors
    .interpolate(d3.interpolateHcl); // Use HCL interpolation for smooth color transitions

    const svgLegend = d3.select("#legend-container").append("svg")
      .attr("width", 480)
      .attr("height", 80);

      const gradient = svgLegend.append("defs")
    .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("x2", "100%")
      .attr("y1", "0%")
      .attr("y2", "0%");

  colorScale.range().forEach((color, i, array) => {
    gradient.append("stop")
      .attr("offset", `${(i / (array.length - 1)) * 100}%`)
      .attr("stop-color", color);
  });

  // Draw the rectangle for the gradient
  svgLegend.append("rect")
      .attr("x", 60)
      .attr("y", 30)
      .attr("width", 300)
      .attr("height", 20)
      .style("fill", "url(#gradient)");

  // Add legend title
  svgLegend.append("text")
      .attr("x", 180)
      .attr("y", 20)
      .attr("text-anchor", "middle")
      .style("font-weight", "bold")
      .text("Deaths From Chronic Disease per 1000 people");

  // Add legend labels
  const legendValues = [0, 5, 10, 15, 20];
  legendValues.forEach((value, i) => {
    svgLegend.append("text")
      .attr("x", 10 + (i * (350 / (legendValues.length - 1))))
      .attr("y", 70)
      .style("text-anchor", "middle")
      .text(value);
  });

    function showPopup(content, x, y) {
    const tooltip = d3.select('.tooltip');
    tooltip.html(content)
           .style('left', `${x}px`)
           .style('top', `${y}px`)
           .style('opacity', 1);}

    
const features = g.selectAll("path")
    .data(geojsondata.features)
    .enter().append("path")
        .attr("d", path)  
        .attr("fill", d => colorScale(d.properties.deathRate))  
        .attr("stroke", "#fff")
        .on('click', function(event, d) {
            const props = d.properties;  // Access properties bound to the path
            const description = `
                <strong>${props.CountyName} County</strong><br><hr>
                Deaths from Diabetes: ${props.diabetes}<br>
                Deaths from Cancer: ${props.cancer}<br>
                Deaths from Heart Disease: ${props.heart}<br>
                Deaths from Liver Disease: ${props.liver}<br>
                Population: ${props.population}<br>
            `;
            showPopup(description, event.pageX, event.pageY);
        });

 

    // Add zoom functionality
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            g.attr('transform', event.transform);
        });

    svg.call(zoom);

    // Tooltip setup
    const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(255, 255, 255, 0.8)')
        .style('padding', '5px')
        .style('border-radius', '4px')
        .style('font-family', 'Roboto, sans-serif');

    // Tooltip interactivity
    features.on('mouseover', (event, d) => {
        tooltip.transition().duration(300).style('opacity', 1);
        tooltip.html(`${d.properties.CountyName} County<br/>Click for more!`)
            .style('left', `${event.pageX + 10}px`)
            .style('top', `${event.pageY + 10}px`);
    })

    .on('mousemove', (event, d) => {
        tooltip.style('left', `${event.pageX + 10}px`)
               .style('top', `${event.pageY + 10}px`);
    })
    .on('mouseout', () => {
        tooltip.transition().duration(300).style('opacity', 0);
    });
});


</script>
