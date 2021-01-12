import { expect } from 'chai';
import { userBob } from '../common';

describe('calculate', function() {
  it('add', function(done) {
    const result = 5 + 2;
    expect(result).to.equal(7);
    done();
  });
});