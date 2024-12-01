<script lang="ts">
    import AnalysingEngagement from "$lib/components/analysingEngagement.svelte";
    import type { PageData } from "./$types";
    let { data }: { data: PageData } = $props();
</script>

<div class="flex flex-col items-center justify-center">
    <h1 class="text-2xl font-bold mb-4">Artist Engagement Analysis</h1>
    <p class="text-center max-w-2xl mb-6">Here is the analysis for the engagement of users with artists. The engagement score follows this scheme: 
        sharing artist is the highest (10 points).
        Then following artist (8 points), sharing track (6 points), liking tracks (5 points),
        adding tracks to playlist (4 points) and playing a track (2 points).
    </p>
    <AnalysingEngagement {data} />
</div>