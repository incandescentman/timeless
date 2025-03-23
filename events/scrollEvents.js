// events/scrollEvents.js

// Set up scroll observers using the IntersectionObserver API.
export function setupScrollObservers() {
    const calendarElement = document.getElementById("calendar");
    if (!calendarElement) return;

    // Create an IntersectionObserver to detect when elements come into view.
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                console.log("Observed element is intersecting:", entry.target);
                // Here you can trigger loading of additional calendar content if needed.
            }
        });
    });

    // Optionally, you can observe a dedicated sentinel element.
    const sentinel = document.getElementById("scroll-sentinel");
    if (sentinel) {
        observer.observe(sentinel);
    } else {
        // Fallback: observe the calendar element itself
        observer.observe(calendarElement);
    }
}

// Set up horizontal swipe detection for mobile devices.
export function setupHorizontalSwipe() {
    const calendarElement = document.getElementById("calendar");
    if (!calendarElement) return;

    let startX = 0;
    let endX = 0;

    calendarElement.addEventListener('touchstart', (event) => {
        startX = event.touches[0].clientX;
    });

    calendarElement.addEventListener('touchend', (event) => {
        endX = event.changedTouches[0].clientX;
        handleSwipe();
    });

    // Detect swipe gestures and log which direction was swiped.
    function handleSwipe() {
        const threshold = 50; // Minimum distance in pixels to consider it a swipe
        if (endX - startX > threshold) {
            console.log("Swipe right detected");
            // Insert logic to move to the previous month.
        } else if (startX - endX > threshold) {
            console.log("Swipe left detected");
            // Insert logic to move to the next month.
        }
    }
}

// Fallback function to check for infinite scroll when IntersectionObserver is not supported.
export function checkInfiniteScroll() {
    const calendarElement = document.getElementById("calendar");
    if (!calendarElement) return;

    // Check if the bottom of the calendar is within a threshold of the viewport.
    const rect = calendarElement.getBoundingClientRect();
    if (rect.bottom < window.innerHeight + 100) {
        console.log("Bottom of calendar reached. Consider loading more content.");
        // Insert logic here to load more calendar data if needed.
    }
}
