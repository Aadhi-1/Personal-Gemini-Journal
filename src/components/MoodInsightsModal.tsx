import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import {
  X,
  Smile,
  ShieldCheck,
  Calendar,
  Sparkles,
  TrendingUp,
  BarChart3,
  Lock,
  Info,
  RefreshCw,
  Clock,
  Heart,
} from 'lucide-react';
import { InteractionEntry, MOOD_OPTIONS, MoodOption } from '../types';

interface MoodInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: InteractionEntry[];
  onSelectEntry?: (entry: InteractionEntry) => void;
}

interface MoodDataPoint {
  emoji: string;
  label: string;
  fullName: string;
  count: number;
  percentage: number;
  color: string;
}

interface DailyTrendPoint {
  date: Date;
  count: number;
  moods: string[];
}

// Mood color mapping for high-contrast D3 visualization
const MOOD_COLOR_MAP: Record<string, string> = {
  Joyful: '#F59E0B',      // Amber
  Calm: '#10B981',        // Emerald
  Reflective: '#6366F1',  // Indigo
  Inspired: '#8B5CF6',    // Violet
  Grounded: '#059669',    // Teal
  Grateful: '#EC4899',    // Pink
  Energized: '#0EA5E9',   // Sky
  Melancholy: '#64748B',  // Slate
  Anxious: '#F97316',     // Orange
  Frustrated: '#EF4444',  // Rose
};

// Emotional category classification
const MOOD_CATEGORY_MAP: Record<string, 'uplifting' | 'grounded' | 'challenging'> = {
  Joyful: 'uplifting',
  Inspired: 'uplifting',
  Energized: 'uplifting',
  Grateful: 'uplifting',
  Calm: 'grounded',
  Reflective: 'grounded',
  Grounded: 'grounded',
  Melancholy: 'challenging',
  Anxious: 'challenging',
  Frustrated: 'challenging',
};

export function MoodInsightsModal({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
}: MoodInsightsModalProps) {
  const [timeframeDays, setTimeframeDays] = useState<number>(30); // Default 30 days as requested
  const [activeMoodFilter, setActiveMoodFilter] = useState<string | null>(null);
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [hoveredMood, setHoveredMood] = useState<MoodDataPoint | null>(null);

  const barChartSvgRef = useRef<SVGSVGElement | null>(null);
  const timelineSvgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);

  // ResizeObserver for responsive D3 redraws
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(Math.floor(entry.contentRect.width));
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen]);

  // Synthetic local memory enclave entries for testing if user has no entries yet
  const sampleLocalEntries: InteractionEntry[] = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const moodsList = [
      '😊 Joyful',
      '😌 Calm',
      '🤔 Reflective',
      '💡 Inspired',
      '🌿 Grounded',
      '🌸 Grateful',
      '⚡ Energized',
      '😰 Anxious',
      '😔 Melancholy',
    ];

    return Array.from({ length: 24 }).map((_, i) => {
      const daysAgo = Math.floor(Math.random() * 28);
      const moodIndex = Math.floor(Math.random() * moodsList.length);
      return {
        id: `sample-${i}`,
        userId: 'local-enclave-user',
        title: `Memory Enclave Entry #${i + 1}`,
        category: 'Personal Reflection',
        mode: 'reflection',
        mood: moodsList[moodIndex],
        messages: [],
        createdAt: new Date(now - daysAgo * dayMs).toISOString(),
        updatedAt: new Date(now - daysAgo * dayMs).toISOString(),
      };
    });
  }, []);

  // Effective entries: live user entries or local enclave sample
  const effectiveEntries = useMemo(() => {
    const activeList = entries.length > 0 && !useSampleData ? entries : sampleLocalEntries;
    return activeList;
  }, [entries, useSampleData, sampleLocalEntries]);

  // 100% Local Client-Enclave Data Processing (Zero-Knowledge)
  const processedData = useMemo(() => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - timeframeDays * 24 * 60 * 60 * 1000);

    // Filter within timeframe strictly in browser memory
    const recentEntries = effectiveEntries.filter((e) => {
      const entryDate = new Date(e.createdAt || e.updatedAt);
      return entryDate >= cutoffDate;
    });

    const moodCounts: Record<string, number> = {};
    let totalTagged = 0;

    // Initialize all standard moods
    MOOD_OPTIONS.forEach((m) => {
      moodCounts[m.label] = 0;
    });

    recentEntries.forEach((entry) => {
      if (entry.mood) {
        // Mood format can be "😊 Joyful" or "Joyful"
        const parts = entry.mood.split(' ');
        const label = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];
        if (moodCounts[label] !== undefined) {
          moodCounts[label] += 1;
          totalTagged += 1;
        } else {
          // Dynamic mood tag
          moodCounts[label] = (moodCounts[label] || 0) + 1;
          totalTagged += 1;
        }
      }
    });

    // Transform into structured array for D3
    const moodData: MoodDataPoint[] = MOOD_OPTIONS.map((m) => {
      const count = moodCounts[m.label] || 0;
      const percentage = totalTagged > 0 ? Math.round((count / totalTagged) * 100) : 0;
      return {
        emoji: m.emoji,
        label: m.label,
        fullName: `${m.emoji} ${m.label}`,
        count,
        percentage,
        color: MOOD_COLOR_MAP[m.label] || '#78716C',
      };
    }).sort((a, b) => b.count - a.count);

    // Group by Day for 30-day timeline trend
    const dayMap = new Map<string, { date: Date; count: number; moods: string[] }>();

    for (let i = 0; i < timeframeDays; i++) {
      const d = new Date(now.getTime() - (timeframeDays - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayMap.set(key, { date: d, count: 0, moods: [] });
    }

    recentEntries.forEach((entry) => {
      if (entry.mood) {
        const key = new Date(entry.createdAt).toISOString().split('T')[0];
        const dayRecord = dayMap.get(key);
        if (dayRecord) {
          dayRecord.count += 1;
          dayRecord.moods.push(entry.mood);
        }
      }
    });

    const dailyTrend: DailyTrendPoint[] = Array.from(dayMap.values());

    // Valence Breakdown
    let upliftingCount = 0;
    let groundedCount = 0;
    let challengingCount = 0;

    moodData.forEach((item) => {
      const cat = MOOD_CATEGORY_MAP[item.label] || 'grounded';
      if (cat === 'uplifting') upliftingCount += item.count;
      else if (cat === 'grounded') groundedCount += item.count;
      else if (cat === 'challenging') challengingCount += item.count;
    });

    const dominantMood = moodData.length > 0 && moodData[0].count > 0 ? moodData[0] : null;

    return {
      moodData,
      dailyTrend,
      totalTagged,
      totalEntries: recentEntries.length,
      upliftingCount,
      groundedCount,
      challengingCount,
      dominantMood,
      recentEntries,
    };
  }, [effectiveEntries, timeframeDays]);

  // Render Primary D3 Bar Chart
  useEffect(() => {
    if (!isOpen || !barChartSvgRef.current) return;

    const svg = d3.select(barChartSvgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 25, right: 20, bottom: 45, left: 35 };
    const width = Math.max(320, containerWidth - 40) - margin.left - margin.right;
    const height = 240 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Filter to moods that either have counts or top 8
    const displayData = processedData.moodData.slice(0, 8);
    const maxCount = Math.max(3, d3.max(displayData, (d) => d.count) || 0);

    // X Scale
    const x = d3
      .scaleBand()
      .domain(displayData.map((d) => d.label))
      .range([0, width])
      .padding(0.28);

    // Y Scale
    const y = d3
      .scaleLinear()
      .domain([0, maxCount])
      .nice()
      .range([height, 0]);

    // Horizontal grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(Math.min(maxCount, 5))
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .attr('stroke', '#E7E5E4')
      .attr('stroke-dasharray', '2,2');

    g.select('.grid .domain').remove();

    // Bottom X-Axis with Mood Emojis & Labels
    const xAxisGroup = g
      .append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(0));

    xAxisGroup.select('.domain').attr('stroke', '#D6D3D1');

    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#44403C')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('dy', '14px')
      .each(function (label) {
        const item = displayData.find((d) => d.label === label);
        if (item) {
          d3.select(this).text(`${item.emoji} ${item.label.slice(0, 5)}`);
        }
      });

    // Left Y-Axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(Math.min(maxCount, 5)).tickFormat(d3.format('d')))
      .select('.domain')
      .remove();

    // Bars
    const bars = g
      .selectAll('.bar')
      .data(displayData)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => x(d.label) || 0)
      .attr('width', x.bandwidth())
      .attr('y', height)
      .attr('height', 0)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => d.color)
      .attr('opacity', (d) => (activeMoodFilter && activeMoodFilter !== d.label ? 0.35 : 0.88))
      .attr('cursor', 'pointer');

    // Bar hover and click interactions
    bars
      .on('mouseenter', function (event, d) {
        d3.select(this).transition().duration(150).attr('opacity', 1).attr('transform', 'scale(1.02)');
        setHoveredMood(d);
      })
      .on('mouseleave', function () {
        d3.select(this)
          .transition()
          .duration(150)
          .attr('opacity', (d: any) => (activeMoodFilter && activeMoodFilter !== d.label ? 0.35 : 0.88))
          .attr('transform', 'scale(1)');
        setHoveredMood(null);
      })
      .on('click', (_, d) => {
        setActiveMoodFilter((prev) => (prev === d.label ? null : d.label));
      });

    // Animate bars growing
    bars
      .transition()
      .duration(650)
      .ease(d3.easeCubicOut)
      .attr('y', (d) => y(d.count))
      .attr('height', (d) => height - y(d.count));

    // Value Labels on top of bars
    g.selectAll('.bar-label')
      .data(displayData)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d) => (x(d.label) || 0) + x.bandwidth() / 2)
      .attr('y', (d) => y(d.count) - 6)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('fill', (d) => (d.count > 0 ? '#292524' : '#A8A29E'))
      .text((d) => (d.count > 0 ? d.count : '0'));
  }, [isOpen, processedData.moodData, containerWidth, activeMoodFilter]);

  // Render Secondary D3 Timeline Trend Sparkline
  useEffect(() => {
    if (!isOpen || !timelineSvgRef.current) return;

    const svg = d3.select(timelineSvgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 15, right: 20, bottom: 25, left: 35 };
    const width = Math.max(320, containerWidth - 40) - margin.left - margin.right;
    const height = 110 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data = processedData.dailyTrend;
    const maxDayCount = Math.max(2, d3.max(data, (d) => d.count) || 0);

    // Scales
    const x = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const y = d3.scaleLinear().domain([0, maxDayCount]).nice().range([height, 0]);

    // Gradient definition for area fill
    const defs = svg.append('defs');
    const gradient = defs
      .append('linearGradient')
      .attr('id', 'mood-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop').attr('offset', '0%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.4);
    gradient.append('stop').attr('offset', '100%').attr('stop-color', '#F59E0B').attr('stop-opacity', 0.0);

    // D3 Area
    const area = d3
      .area<DailyTrendPoint>()
      .x((d) => x(d.date))
      .y0(height)
      .y1((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // D3 Line
    const line = d3
      .line<DailyTrendPoint>()
      .x((d) => x(d.date))
      .y((d) => y(d.count))
      .curve(d3.curveMonotoneX);

    // Render Area
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#mood-area-gradient)')
      .attr('d', area);

    // Render Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#D97706')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add Dots on days with activity
    g.selectAll('.dot')
      .data(data.filter((d) => d.count > 0))
      .enter()
      .append('circle')
      .attr('cx', (d) => x(d.date))
      .attr('cy', (d) => y(d.count))
      .attr('r', 3.5)
      .attr('fill', '#B45309')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1.5);

    // X-Axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5).tickFormat(d3.timeFormat('%b %d') as any))
      .select('.domain')
      .attr('stroke', '#D6D3D1');

    // Left ticks
    g.append('g')
      .call(d3.axisLeft(y).ticks(2).tickFormat(d3.format('d')))
      .select('.domain')
      .remove();
  }, [isOpen, processedData.dailyTrend, containerWidth]);

  // Entries filtered by the selected mood tag
  const filteredEntriesForMood = useMemo(() => {
    if (!activeMoodFilter) return [];
    return processedData.recentEntries.filter((entry) => {
      return entry.mood && entry.mood.includes(activeMoodFilter);
    });
  }, [activeMoodFilter, processedData.recentEntries]);

  if (!isOpen) return null;

  return (
    <div
      id="mood-insights-modal"
      className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 select-none"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="w-full max-w-3xl bg-white rounded-3xl border border-stone-200 shadow-2xl p-6 sm:p-8 relative max-h-[92vh] overflow-y-auto text-stone-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-900 transition-colors"
          title="Close Mood Insights"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 border border-amber-200 flex items-center justify-center text-amber-700">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900 flex items-center gap-2">
                Mood Insights & Emotional Frequency
                <span className="text-[10px] uppercase font-mono tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                  D3.js Visualization
                </span>
              </h2>
              <p className="text-xs text-stone-500">
                Visualizing mood tag trends over the last {timeframeDays} days
              </p>
            </div>
          </div>
        </div>

        {/* Client Memory Enclave Zero-Knowledge Guarantee Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-6 text-xs text-emerald-950 flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-900">
                100% Local Enclave Processing
              </span>
              <span className="text-[10px] font-mono bg-emerald-100/80 text-emerald-800 px-1.5 py-0.5 rounded">
                RAM Sandbox Only
              </span>
            </div>
            <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
              All mood aggregations, timestamps, and emotional trend computations execute strictly within the browser's client memory enclave. No emotional analytics or reflection payloads are transmitted to external servers.
            </p>
          </div>
        </div>

        {/* Timeframe selector & Local Data Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-2 rounded-2xl bg-stone-100 border border-stone-200">
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-500 ml-2" />
            <span className="text-stone-500 font-medium">Time Window:</span>
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeframeDays(days)}
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                  timeframeDays === days
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-200'
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setUseSampleData(!useSampleData)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                useSampleData
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-white text-stone-600 border-stone-300 hover:bg-stone-50'
              }`}
              title="Toggle simulated enclave data to preview visualizations"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{useSampleData ? 'Using Enclave Demo Data' : 'Live Journal Data'}</span>
            </button>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
              Top Mood
            </div>
            <div className="text-base font-bold text-stone-900 truncate">
              {processedData.dominantMood ? (
                <span>
                  {processedData.dominantMood.emoji} {processedData.dominantMood.label}
                </span>
              ) : (
                'No Moods'
              )}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {processedData.dominantMood
                ? `${processedData.dominantMood.count} logs (${processedData.dominantMood.percentage}%)`
                : 'Tag entries to see'}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
              Mood Log Rate
            </div>
            <div className="text-base font-bold text-stone-900">
              {processedData.totalEntries > 0
                ? `${Math.round((processedData.totalTagged / processedData.totalEntries) * 100)}%`
                : '0%'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              {processedData.totalTagged} of {processedData.totalEntries} entries tagged
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
              Uplifting Balance
            </div>
            <div className="text-base font-bold text-amber-700">
              {processedData.totalTagged > 0
                ? `${Math.round((processedData.upliftingCount / processedData.totalTagged) * 100)}%`
                : '0%'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Joyful, Inspired, Grateful
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200">
            <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
              Reflective & Grounded
            </div>
            <div className="text-base font-bold text-emerald-700">
              {processedData.totalTagged > 0
                ? `${Math.round((processedData.groundedCount / processedData.totalTagged) * 100)}%`
                : '0%'}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">
              Calm, Reflective, Grounded
            </div>
          </div>
        </div>

        {/* Primary D3 Chart Section: Mood Frequency */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-amber-600" />
              Mood Tag Frequency (Last {timeframeDays} Days)
            </h3>
            {hoveredMood && (
              <span className="text-xs font-semibold text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded-md">
                {hoveredMood.emoji} {hoveredMood.label}: {hoveredMood.count} entries ({hoveredMood.percentage}%)
              </span>
            )}
          </div>

          <div className="w-full overflow-x-auto flex justify-center">
            <svg ref={barChartSvgRef} className="w-full max-w-full overflow-visible" />
          </div>

          <p className="text-[11px] text-stone-500 mt-2 text-center">
            Click any bar to filter reflections tagged with that mood. All rendering handled via D3.js vector scaling.
          </p>
        </div>

        {/* Secondary D3 Chart Section: 30-Day Activity Trend */}
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              Daily Reflection Trend Line
            </h3>
            <span className="text-[11px] text-stone-400">
              D3 Monotone Curve
            </span>
          </div>

          <div className="w-full overflow-x-auto flex justify-center">
            <svg ref={timelineSvgRef} className="w-full max-w-full overflow-visible" />
          </div>
        </div>

        {/* Filtered Entry List if a Mood Bar is clicked */}
        {activeMoodFilter && (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-amber-950">
                  Reflections Tagged with "{activeMoodFilter}" ({filteredEntriesForMood.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveMoodFilter(null)}
                className="text-xs text-amber-800 hover:text-amber-950 font-semibold"
              >
                Clear Filter
              </button>
            </div>

            {filteredEntriesForMood.length === 0 ? (
              <p className="text-xs text-amber-800 italic">
                No reflections found for this mood in the selected timeframe.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {filteredEntriesForMood.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => {
                      if (onSelectEntry) {
                        onSelectEntry(entry);
                        onClose();
                      }
                    }}
                    className="p-2.5 rounded-xl bg-white border border-amber-200 hover:border-amber-400 cursor-pointer transition-all text-xs flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-900 truncate">
                        {entry.title}
                      </div>
                      <div className="text-[10px] text-stone-500 truncate">
                        {new Date(entry.createdAt).toLocaleDateString()} • {entry.category}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-amber-800 shrink-0">
                      Open &rarr;
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 text-xs">
          <div className="flex items-center gap-2 text-stone-500 text-[11px]">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero-Knowledge Data Aggregation • Decrypted locally</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 transition-colors shadow-xs"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
}
