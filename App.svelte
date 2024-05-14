<script>
     import * as d3 from 'd3';
     import {onMount} from 'svelte';
     import mapboxgl from 'mapboxgl';
   
     let geojsondata;
     let csvdata ;
     

     onMount(async () => {
        const geojsonPromise =   d3.json('/county.geojson');
        const csvPromise =   d3.csv('/county_rate.csv');

        const [geojsonResult, csvResult] = await Promise.all([geojsonPromise,csvPromise]);

        console.log("Geojson data:" ,geojsonResult);
        console.log("Geojson data:" ,csvResult);

        let dataMap = new Map(csvResult.map(item => {
        console.log('Mapping:', item.County, item.County_Rate, item.Diabetes, item.Heart);
        return [item.County, [item.County_Rate, item.Cancer, item.Diabetes, item.Heart, item.Liver, item.Total_Population]];
     }));

     geojsonResult.features.forEach(feature => {
        const countyName = feature.properties.CountyName; // Assuming property name in GeoJSON
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
     })
     
    
	mapboxgl.accessToken = 'pk.eyJ1IjoiYWlyYW1lc2giLCJhIjoiY2x3MWltOWl1MDZnYTJqbDVnNDdhNTI3ZCJ9.MCALvz4Tm8RSzOB0e9deoQ';
	const map = new mapboxgl.Map({
		container: "map",
		style: "mapbox://styles/mapbox/light-v11", 
		center:  [-119.4179, 36.7783], 
		zoom: 5, 
		minZoom: 1,
		maxZoom: 15,
	});

    const tooltip = d3.select('body').append('div')
            .attr('class', 'tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            // .style('z-index', '10')
            .style('background', 'rgba(255, 255, 255, 0.8)')
            .style('padding', '5px')
            .style('border-radius', '4px')
            .style('font-family', 'Roboto, sans-serif');
            


    map.on("load", () => {
		map.addSource("ca_counties", {
			type: "geojson",
			data: geojsondata

		});
        map.addLayer({
    id: 'counties-deaths',
    type: 'fill',
    source: 'ca_counties',
    paint: {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'deathRate'],
            0, '#f7fbff',
            5, '#deebf7',
            10, '#9ecae1',
            15, '#4292c6',
            20, '#08306b'
        ],
        'fill-opacity': 0.8
    }

});

// Add a line layer for borders
map.addLayer({
        id: 'counties-borders',
        type: 'line',
        source: 'ca_counties',
        layout: {},
        paint: {
            'line-color': '#000',  // Black color for the border
            'line-width': 0.2        // Width of the border lines
        }
    });

map.on('mousemove', 'counties-deaths', (e) => {
                if (e.features.length > 0) {
                    const feature = e.features[0];
                    // Formatting tooltip content using properties
                    tooltip.html(`${feature.properties.CountyName} County<br/>Click for more!`)
                        .style('opacity', 1)
                        .style('left', (e.originalEvent.pageX + 10) + 'px')
                        .style('top', (e.originalEvent.pageY + 10) + 'px');
                        
                }
            });

            map.on('mouseleave', 'counties-deaths', () => {
                tooltip.transition()
                    .duration(500)
                    .style('opacity', 0);
            });



            map.on('click', 'counties-deaths', function(e) {
              
            if (e.features.length > 0) {
            const props = e.features[0].properties;
            const description = `
                <strong> ${props.CountyName} County</strong><br><hr>
                Deaths from Diabetes: ${props.diabetes}<br>
                Deaths from Cancer: ${props.cancer}<br>
                Deaths from Heart Disease: ${props.heart}<br>
                Deaths from Liver Disease: ${props.liver}<br>
                Population: ${props.population}<br>
            `;

            tooltip.style('opacity', 0);

            new mapboxgl.Popup()
                .setLngLat(e.lngLat)
                .setHTML(description)
                .addTo(map);
        }
    });

            
});
    


			
	
    

</script>

<main>

</main>



