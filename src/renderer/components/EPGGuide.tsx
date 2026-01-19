import React, { useState, useEffect, useRef } from 'react';

interface EPGProgram {
  id: string;
  channelId: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  category?: string;
}

interface Channel {
  id: string;
  name: string;
  logo?: string;
  tvgId?: string;
}

interface EPGGuideProps {
  channels: Channel[];
  programs: Record<string, EPGProgram[]>;
  currentChannel?: Channel;
  onChannelSelect: (channel: Channel) => void;
  onProgramSelect?: (program: EPGProgram, channel: Channel) => void;
}

export const EPGGuide: React.FC<EPGGuideProps> = ({
  channels,
  programs,
  currentChannel,
  onChannelSelect,
  onProgramSelect
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hoveredProgram, setHoveredProgram] = useState<EPGProgram | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Time range: 6 hours
  const hoursToShow = 6;
  const pixelsPerMinute = 3;
  const startHour = selectedDate.getHours();
  const timeSlots: Date[] = [];

  for (let i = 0; i < hoursToShow; i++) {
    const slot = new Date(selectedDate);
    slot.setHours(startHour + i, 0, 0, 0);
    timeSlots.push(slot);
  }

  const getTimeStart = () => {
    const start = new Date(selectedDate);
    start.setHours(startHour, 0, 0, 0);
    return start;
  };

  const getTimeEnd = () => {
    const end = new Date(selectedDate);
    end.setHours(startHour + hoursToShow, 0, 0, 0);
    return end;
  };

  const getProgramStyle = (program: EPGProgram) => {
    const timeStart = getTimeStart();
    const timeEnd = getTimeEnd();

    const programStart = new Date(program.start);
    const programEnd = new Date(program.end);

    // Clamp to visible range
    const visibleStart = programStart < timeStart ? timeStart : programStart;
    const visibleEnd = programEnd > timeEnd ? timeEnd : programEnd;

    const startOffset = (visibleStart.getTime() - timeStart.getTime()) / 60000;
    const duration = (visibleEnd.getTime() - visibleStart.getTime()) / 60000;

    return {
      left: `${startOffset * pixelsPerMinute}px`,
      width: `${duration * pixelsPerMinute}px`
    };
  };

  const isCurrentProgram = (program: EPGProgram) => {
    const now = currentTime;
    return new Date(program.start) <= now && new Date(program.end) >= now;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const scrollToNow = () => {
    if (timelineRef.current) {
      const timeStart = getTimeStart();
      const offset = (currentTime.getTime() - timeStart.getTime()) / 60000;
      const scrollPosition = offset * pixelsPerMinute - 200;
      timelineRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  };

  useEffect(() => {
    scrollToNow();
  }, [selectedDate]);

  const navigateTime = (hours: number) => {
    const newDate = new Date(selectedDate);
    newDate.setHours(newDate.getHours() + hours);
    setSelectedDate(newDate);
  };

  const getCurrentTimePosition = () => {
    const timeStart = getTimeStart();
    const offset = (currentTime.getTime() - timeStart.getTime()) / 60000;
    return offset * pixelsPerMinute;
  };

  return (
    <div className="flex flex-col h-full bg-dark-900">
      {/* Header controls */}
      <div className="flex items-center justify-between p-4 border-b border-dark-700">
        <h2 className="text-xl font-bold text-white">TV Guide</h2>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTime(-6)}
            className="btn-ghost p-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setTimeout(scrollToNow, 100);
            }}
            className="btn-secondary"
          >
            Now
          </button>
          <button
            onClick={() => navigateTime(6)}
            className="btn-ghost p-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <span className="text-dark-400">
            {selectedDate.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* EPG Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Channel column */}
        <div className="w-48 flex-shrink-0 border-r border-dark-700">
          {/* Time header placeholder */}
          <div className="h-12 border-b border-dark-700" />

          {/* Channel list */}
          <div className="overflow-y-auto" style={{ height: 'calc(100% - 48px)' }}>
            {channels.map(channel => (
              <div
                key={channel.id}
                className={`h-20 p-2 border-b border-dark-700 flex items-center gap-2 cursor-pointer
                  transition-colors hover:bg-dark-800
                  ${currentChannel?.id === channel.id ? 'bg-primary-900/20' : ''}`}
                onClick={() => onChannelSelect(channel)}
              >
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-10 h-10 rounded object-cover bg-dark-700"
                    onError={e => (e.target as HTMLImageElement).style.display = 'none'}
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-dark-700 flex items-center justify-center">
                    <svg className="w-5 h-5 text-dark-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14z" />
                    </svg>
                  </div>
                )}
                <span className="text-sm font-medium text-white truncate">{channel.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline and programs */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Time header */}
          <div className="h-12 border-b border-dark-700 flex-shrink-0 overflow-hidden">
            <div
              className="flex h-full relative"
              style={{ width: `${hoursToShow * 60 * pixelsPerMinute}px` }}
            >
              {timeSlots.map((slot, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 border-l border-dark-700 px-2 py-2"
                  style={{ width: `${60 * pixelsPerMinute}px` }}
                >
                  <span className="text-sm text-dark-400">{formatTime(slot)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Programs grid */}
          <div
            ref={timelineRef}
            className="flex-1 overflow-auto scrollbar-thin"
          >
            <div
              className="relative"
              style={{
                width: `${hoursToShow * 60 * pixelsPerMinute}px`,
                minHeight: '100%'
              }}
            >
              {/* Current time indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                style={{ left: `${getCurrentTimePosition()}px` }}
              >
                <div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
              </div>

              {/* Program rows */}
              {channels.map(channel => {
                const channelPrograms = programs[channel.tvgId || channel.name] || [];
                const timeStart = getTimeStart();
                const timeEnd = getTimeEnd();

                // Filter programs in visible range
                const visiblePrograms = channelPrograms.filter(p => {
                  const start = new Date(p.start);
                  const end = new Date(p.end);
                  return end > timeStart && start < timeEnd;
                });

                return (
                  <div
                    key={channel.id}
                    className="h-20 border-b border-dark-700 relative"
                  >
                    {visiblePrograms.map(program => {
                      const style = getProgramStyle(program);
                      const isCurrent = isCurrentProgram(program);

                      return (
                        <div
                          key={program.id}
                          className={`absolute top-1 bottom-1 rounded-lg px-2 py-1 cursor-pointer
                            transition-all overflow-hidden
                            ${isCurrent
                              ? 'bg-primary-600 hover:bg-primary-500'
                              : 'bg-dark-700 hover:bg-dark-600'
                            }`}
                          style={style}
                          onClick={() => onProgramSelect?.(program, channel)}
                          onMouseEnter={() => setHoveredProgram(program)}
                          onMouseLeave={() => setHoveredProgram(null)}
                        >
                          <p className="text-sm font-medium text-white truncate">
                            {program.title}
                          </p>
                          <p className="text-xs text-dark-300 truncate">
                            {formatTime(new Date(program.start))} - {formatTime(new Date(program.end))}
                          </p>
                          {program.category && (
                            <span className="badge-primary text-xs mt-1">{program.category}</span>
                          )}
                        </div>
                      );
                    })}

                    {visiblePrograms.length === 0 && (
                      <div className="absolute inset-1 rounded-lg bg-dark-800 flex items-center justify-center">
                        <span className="text-sm text-dark-500">No program data</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Program tooltip */}
      {hoveredProgram && (
        <div className="fixed z-50 pointer-events-none"
          style={{
            left: 'var(--mouse-x)',
            top: 'var(--mouse-y)'
          }}
        >
          <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl max-w-sm">
            <h4 className="font-bold text-white">{hoveredProgram.title}</h4>
            <p className="text-sm text-dark-400 mt-1">
              {formatTime(new Date(hoveredProgram.start))} - {formatTime(new Date(hoveredProgram.end))}
            </p>
            {hoveredProgram.description && (
              <p className="text-sm text-dark-300 mt-2 line-clamp-3">
                {hoveredProgram.description}
              </p>
            )}
          </div>
        </div>
      )}

      {channels.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-dark-400">No channels available</p>
            <p className="text-sm text-dark-500 mt-1">Add a playlist to view the TV guide</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EPGGuide;
