import { describe, expect, it } from 'vitest';
import { npsSummary,feedbackClientKey,heatColor } from './clientFeedback';
describe('monthly client feedback',()=>{
  it('calculates NPS across all answers, including passives',()=>{
    expect(npsSummary([10,9,8,7,6].map(nps=>({nps})))).toMatchObject({score:20,promoters:2,detractors:1,passives:2});
    expect(npsSummary([{nps:0}]).score).toBe(-100);
    expect(npsSummary([{nps:10}]).score).toBe(100);
    expect(npsSummary([]).score).toBeNull();
  });
  it('groups Meta and Google labels without counting the same client twice',()=>expect(feedbackClientKey('Nova Era Cosmético')).toBe(feedbackClientKey('NOVA ERA COSMETICO')));
  it('recognizes the numbered Google labels while preserving company names such as 2L',()=>{
    expect(feedbackClientKey('01 Nova Era Cosméticos')).toBe(feedbackClientKey('NOVA ERA COSMETICO'));
    expect(feedbackClientKey('03 Prime CNC')).toBe(feedbackClientKey('PRIME CNC'));
    expect(feedbackClientKey('2L REBOQUES')).toBe('2lreboques');
  });
  it('does not paint missing ratings as negative feedback',()=>{
    expect(heatColor(null)).toContain('muted');
    expect(heatColor(6,true)).toContain('red');
    expect(heatColor(7,true)).toContain('amber');
    expect(heatColor(9,true)).toContain('emerald');
  });
});
