<script lang="ts">
    import { onMount } from 'svelte';
    import * as d3 from 'd3';

    let { data } = $props();
    let mounted = false;
    
    // Fix state declarations
    let viewType = $state('hourly');
    let selectedArtistId = $state(null);
    
    /* Since sharing artist means that the users really loves the artist and want to share about it, I give it 10 points in the scheme.
    Then, following artist (without sharing it) would means a lower score, so this should be in 8 points.
    Following that would be sharing a track (6 points) and liking a track, since user just likes a track without wanting to know more 
    about the artist.
    After that would be adding track to playlist (4 points), since that means users only want to listen to it in long term, and not
    having more engagement.
    Finally, playing track is the most simple engagement that users could have with a track.
    */
    const ENGAGEMENT_SCORES = {
        'share_artist': 10,
        'follow_artist': 8,
        'share_track': 6,
        'like_track': 5,
        'add_track_to_playlist': 4,
        'play_track': 2
    } as const;
    /*Please note, that in this dataset, only 6 of these sentiments meaning that users are engaged with a track, so we just need to pick these
    event types from the dataset.*/

    const DAYS_OF_WEEK = [
         'Monday', 'Tuesday', 'Wednesday', 
        'Thursday', 'Friday', 'Saturday', 'Sunday'
    ];

    // Mapping artist ID with artist name, and sort artists by ID.

    const artists = [...new Set(data.data.map(event => event.artist_id))]
        .map(id => {
            const event = data.data.find(e => e.artist_id === id);
            return {
                id: event.artist_id,
                name: event.name
            };
        })
        .sort((a, b) => a.id - b.id);


    // Set initial artist after artists are loaded
    $effect(() => {
        if (artists.length > 0 && !selectedArtistId) {
            selectedArtistId = artists[0]?.id;
        }
    });

       // Function to analyse data by hours per day.
       function processDataForArtist(events: any[], artistId: number) {
        // Initialize array for all 24 hours
        const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            totalScore: 0,
            events: []
        }));

        // Filter events for selected artist
        const artistEvents = events.filter(event => event.artist_id === artistId);
        
        // Mapping users timezone with time for each action of users.
        artistEvents.forEach(event => {
            const utcDate = new Date(event.created_at);
            const userTimezone = event.timezone;
            const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: userTimezone }));
            const hour = localDate.getHours();
            
            const score = ENGAGEMENT_SCORES[event.event_type as keyof typeof ENGAGEMENT_SCORES] || 0;
            
            hourlyData[hour].totalScore += score;
            hourlyData[hour].events.push({
                ...event,
                score,
                localTime: localDate
            });
        });

        return hourlyData;
    }
   
    // Functions to analyse data by days of the week.
    function processDataByDayOfWeek(events: any[], artistId: number) {
        // Initialize array for all 7 days
        const dailyData = Array.from({ length: 7 }, (_, day) => ({
            day,
            dayName: DAYS_OF_WEEK[day],
            totalScore: 0,
            events: []
        }));

        // Filter events for selected artist
        const artistEvents = events.filter(event => event.artist_id === artistId);

        // Convert UTC time to timezone of users.
        artistEvents.forEach(event => {
            const utcDate = new Date(event.created_at);
            const userTimezone = event.timezone;
            const localDate = new Date(utcDate.toLocaleString('en-US', { timeZone: userTimezone }));
            let dayOfWeek = localDate.getDay(); // 0-6, starting with Sunday
            dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0-6 starting with Monday

            const score = ENGAGEMENT_SCORES[event.event_type as keyof typeof ENGAGEMENT_SCORES] || 0;
            
            dailyData[dayOfWeek].totalScore += score;
            dailyData[dayOfWeek].events.push({
                ...event,
                score,
                localTime: localDate
            });
        });

        return dailyData;
    }

    /* The engagement analysis would be done with bar charts (for both hourly and days of week), 
    since the number of elements (hours and days) are relatively small in both cases, so a bar chart
    could be used to keep our visualisation simple and easy to interpret.*/

    function updateChart() {
        // Clear existing chart
        d3.select('#chart svg').remove();

        const margin = { top: 20, right: 20, bottom: 60, left: 60 }; // Increased bottom margin
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        const svg = d3.select('#chart')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom);

        const chart = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Get appropriate data based on view type
        const chartData = viewType === 'hourly' 
            ? processDataForArtist(data.data, selectedArtistId)
            : processDataByDayOfWeek(data.data, selectedArtistId);

        // Create scales
        const x = d3.scaleBand()
            .range([0, width])
            .domain(chartData.map(d => viewType === 'hourly' ? d.hour.toString() : d.dayName))
            .padding(0.1);

        const y = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(chartData, d => d.totalScore) || 0]);

        // Add X axis
        chart.append('g')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")  
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-45)"); // Rotate labels for better readability

        // Add X axis label
        chart.append('text')
            .attr('x', width / 2)
            .attr('y', height + margin.bottom - 5)
            .attr('fill', 'black')
            .style('text-anchor', 'middle')
            .text(viewType === 'hourly' ? 'Hour of Day' : 'Day of Week');

        // Add Y axis
        chart.append('g')
            .call(d3.axisLeft(y))
            .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', -45)
            .attr('x', -height / 2)
            .attr('fill', 'black')
            .style('text-anchor', 'middle')
            .text('Engagement Score');

       
        // Add bars
        chart.selectAll('rect')
            .data(chartData)
            .join('rect')
            .attr('x', d => x(viewType === 'hourly' ? d.hour.toString() : d.dayName) || 0)
            .attr('y', d => y(d.totalScore))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.totalScore))
            .attr('fill', '#4f46e5')
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .attr('fill', '#312e81');
                
                // Calculate tooltip position
                const xPosition = x(viewType === 'hourly' ? d.hour.toString() : d.dayName) || 0;
                const yPosition = y(d.totalScore);
                const barHeight = height - y(d.totalScore);
                
                // Adjust tooltip position based on bar height
                const tooltipY = yPosition < 40 ? yPosition + 20 : yPosition - 40;
                
                // Adjust x position for bars near the right edge
                const isNearRightEdge = viewType === 'hourly' ? d.hour > 21 : d.day > 5;
                const tooltipX = isNearRightEdge 
                    ? xPosition + (x.bandwidth()/2) - 60 // Move tooltip left for right edge
                    : xPosition + (x.bandwidth()/2);     // Center tooltip for other bars
                
                const tooltip = chart.append('g')
                    .attr('class', 'tooltip')
                    .attr('transform', `translate(${tooltipX},${tooltipY})`);
                
                // Add white background rectangle
                tooltip.append('rect')
                    .attr('x', -60)
                    .attr('y', -30)
                    .attr('width', 120)
                    .attr('height', 25)
                    .attr('fill', 'white')
                    .attr('stroke', '#666')
                    .attr('stroke-width', 1)
                    .attr('rx', 4)
                    .attr('ry', 4);

                // Add text on top of background
                tooltip.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('y', -13)
                    .attr('fill', '#333')
                    .style('font-size', '12px')
                    .text(`${viewType === 'hourly' ? `Hour ${d.hour}` : d.dayName}: ${d.totalScore} points`);
            })
            .on('mouseout', function() {
                d3.select(this)
                    .attr('fill', '#4f46e5');
                chart.selectAll('.tooltip').remove();
            });
    }

    function handleArtistChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        selectedArtistId = Number(select.value);
        if (mounted) {
            updateChart();
        }
    }

    function handleViewChange(event: Event) {
        const select = event.target as HTMLSelectElement;
        viewType = select.value;
        if (mounted) {
            updateChart();
        }
    }

      // Modify the onMount to ensure initial render
    onMount(() => {
        mounted = true;
        // Set initial artist and trigger initial chart render
        if (artists.length > 0 && !selectedArtistId) {
            selectedArtistId = artists[0].id;
            updateChart();
        }
    });

    // Add an effect to watch both viewType and selectedArtistId
    $effect(() => {
        if (mounted && selectedArtistId) {
            updateChart();
        }
    });
</script>

<div class="w-full max-w-4xl mx-auto p-4">
    <div class="mb-6 flex gap-4 items-end">
        <div class="flex-1">
            <label for="artist-select" class="block text-sm font-medium text-gray-700 mb-2">
                Select Artist
            </label>
            <select
                id="artist-select"
                value={selectedArtistId}
                onchange={handleArtistChange}
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
                {#each artists as artist}
                    <option value={artist.id}>
                        {artist.name}
                    </option>
                {/each}
            </select>
        </div>
        
        <div class="flex-1">
            <label for="view-select" class="block text-sm font-medium text-gray-700 mb-2">
                View Type
            </label>
            <select
                id="view-select"
                value={viewType}
                onchange={handleViewChange}
                class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
                <option value="hourly">Hourly View</option>
                <option value="weekly">Day of Week View</option>
            </select>
        </div>
    </div>

    <div id="chart" class="w-full overflow-x-auto bg-white rounded-lg shadow p-4"></div>
</div>