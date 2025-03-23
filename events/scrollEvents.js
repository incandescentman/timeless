export function setupScrollObservers() {
    const opts = { rootMargin: '200px' };

    const topObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            const oldH = documentScrollHeight();
            for (let i = 0; i < 8; i++) {
                prependWeek();
            }
            window.scrollBy(0, documentScrollHeight() - oldH);
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    const botObs = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
            for (let i = 0; i < 8; i++) {
                appendWeek();
            }
            recalculateAllHeights();
            updateStickyMonthHeader();
        }
    }, opts);

    topObs.observe(document.getElementById('top-sentinel'));
    botObs.observe(document.getElementById('bottom-sentinel'));

    // Also check if the system day changed
    setInterval(() => {
        const newSys = new Date();
        if (newSys.toDateString() !== systemToday.toDateString()) {
            systemToday = newSys;
            // If the visual "today" is out of date, reload
            if (!document.querySelector('.current-day-dot')) {
                location.reload();
            }
        }
    }, 60000);
}

export function checkInfiniteScroll() {
    if (documentScrollTop() < 200) {
        const oldH = documentScrollHeight();
        for (let i = 0; i < 8; i++) {
            prependWeek();
        }
        window.scrollBy(0, documentScrollHeight() - oldH);
        recalculateAllHeights();
    } else if (documentScrollTop() > documentScrollHeight() - window.innerHeight - 200) {
        for (let i = 0; i < 8; i++) {
            appendWeek();
        }
        recalculateAllHeights();
    }

    // Also watch for system date changes
    const newSys = new Date();
    if (newSys.toDateString() !== systemToday.toDateString()) {
        systemToday = newSys;
        if (!document.querySelector('.current-day-dot')) {
            location.reload();
        }
    }
}
