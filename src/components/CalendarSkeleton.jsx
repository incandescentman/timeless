function CalendarSkeleton() {
  return (
    <div className="calendar-skeleton">
      {[1, 2, 3].map((month) => (
        <div key={month} className="skeleton-month">
          <div className="skeleton-month-header" />
          <div className="skeleton-days">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <div key={day} className="skeleton-day" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CalendarSkeleton;
