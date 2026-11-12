import { expect, it } from 'vitest';
import { answeredCallRate } from './crmCallRate';
it('calculates answered calls as a percentage of attempts',()=>{
 expect(answeredCallRate(192,17)).toBe('8,9%');
 expect(answeredCallRate(27,3)).toBe('11,1%');
 expect(answeredCallRate(10,0)).toBe('0%');
});
it('distinguishes absent calls from zero answers',()=>{
 expect(answeredCallRate(0,0)).toBe('—');
 expect(answeredCallRate(10,null)).toBe('—');
});
