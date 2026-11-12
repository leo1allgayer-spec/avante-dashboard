import { describe, expect, it } from 'vitest';
import { rankCreatives, type CreativeResult } from './creativeRanking';
const rows:CreativeResult[]=[
 {ad_id:'a',ad_name:'A',campaign_name:'C',spend:100,count:2,revenue:600,roas:6},
 {ad_id:'b',ad_name:'B',campaign_name:'C',spend:50,count:1,revenue:400,roas:8},
 {ad_id:'c',ad_name:'C',campaign_name:'C',spend:0,count:1,revenue:100,roas:null},
 {ad_id:'d',ad_name:'D',campaign_name:'C',spend:500,count:0,revenue:0,roas:0}];
describe('creative rankings',()=>{
 it('separates volume, revenue and return',()=>{
  expect(rankCreatives(rows,'revenue')[0].ad_id).toBe('a');
  expect(rankCreatives(rows,'count')[0].ad_id).toBe('a');
  expect(rankCreatives(rows,'roas')[0].ad_id).toBe('b');
 });
 it('excludes absent denominator and no sales from efficiency rankings',()=>{
  expect(rankCreatives(rows,'cpa').map(r=>r.ad_id)).toEqual(['a','b']);
  expect(rankCreatives(rows,'roas').map(r=>r.ad_id)).toEqual(['b','a']);
  expect(rankCreatives(rows,'count')).toHaveLength(3);
 });
 it('does not mutate inputs and handles empty data',()=>{
  rankCreatives(rows,'revenue');
  expect(rows[0].ad_id).toBe('a');
  expect(rankCreatives([],'roas')).toEqual([]);
 });
});
