import { ConflictException } from '@nestjs/common';
import { assertTransition, canTransition } from './content-status';

describe('content status machine', () => {
  it.each([
    ['DRAFT', 'PENDING_APPROVAL'],
    ['PENDING_APPROVAL', 'APPROVED'],
    ['PENDING_APPROVAL', 'REJECTED'],
    ['APPROVED', 'PUBLISHED'],
    ['DRAFT', 'PUBLISHED'],
    ['PUBLISHED', 'DRAFT'],
    ['REJECTED', 'DRAFT'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each([
    ['PUBLISHED', 'APPROVED'],
    ['REJECTED', 'PUBLISHED'],
    ['PENDING_APPROVAL', 'PUBLISHED'],
    ['APPROVED', 'REJECTED'],
  ] as const)('refuses %s -> %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
  });
});
