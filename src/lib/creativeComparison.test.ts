import { describe, expect, it } from 'vitest';
import { creativeMonths, creativeTrend } from './creativeComparison';
describe('creative month comparison',()=>{
 it('creates monthly boundaries, leap days and partial current months',()=>{
  expect(creativeMonths('2024-02','2024-03','2024-03-15').map(m=>[m.start,m.end])).toEqual([['2024-02-01','2024-02-29'],['2024-03-01','2024-03-15']]);
  expect(creativeMonths('2025-12','2026-01','2026-01-05')).toHaveLength(2);
 });
 it('rejects reversed, invalid, future and excessively wide ranges',()=>{
  expect(creativeMonths('2026-10','2026-09','2026-10-15')).toEqual([]);
  expect(creativeMonths('2026-13','2026-13','2026-10-15')).toEqual([]);
  expect(creativeMonths('2026-09','2026-11','2026-10-15')).toEqual([]);
  expect(creativeMonths('2025-10','2026-10','2026-10-15')).toEqual([]);
 });
 it('does not label absent investment or missing data as a decline',()=>{
  expect(creativeTrend(5,0,false).direction).toBe('unknown');
  expect(creativeTrend(null,0,true).direction).toBe('unknown');
  expect(creativeTrend(10,5,true)).toMatchObject({label:'-50%',direction:'down'});
  expect(creativeTrend(0,2,true).direction).toBe('up');
 });
});
